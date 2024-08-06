import Sqlite3 from "sqlite3";
import { app } from "electron";
import path from "path";
import { orderBy } from "lodash";
import { subscribeCOV, unsubscribeCOV } from "./bacnet";
import { updateBacnet } from "./main";

const DB_PATH = path.join(app.getPath("appData"), "/electron-test/db.sql");
const sqlite = new Sqlite3.Database(DB_PATH);

sqlite.serialize(async () => {
  await new Promise(res => {
    sqlite.run(
      "CREATE TABLE if not exists modbusDevice (id	INTEGER,name	TEXT,ipAddress	TEXT,port	INTEGER,start INTERGER,length	INTEGER,delay	INTEGER,type	INTEGER,PRIMARY KEY(id AUTOINCREMENT));",
      () => {
        res(true);
      }
    );
  }).then(() => {
    sqlite.run(
      "CREATE TABLE if not exists modbusTarget (id	INTEGER,position	INTEGER,name	TEXT,device_id	INTEGER,PRIMARY KEY(id AUTOINCREMENT), FOREIGN KEY(device_id) REFERENCES modbusDevice(id))"
    );
  });
  await new Promise(res => {
    sqlite.run(
      "CREATE TABLE if not exists bacnetDevice (id	TEXT,name	TEXT,sender	TEXT,object_name TEXT, vendor_name TEXT, apdu_timeout INTERGER,max_apdu_length_accepted INTERGER,object_type TEXT , deviceId	INTEGER,object_identifier	TEXT,PRIMARY KEY(id))",
      () => {
        res(true);
      }
    );
  }).then(() => {
    sqlite.run(
      "CREATE TABLE if not exists bacnetObject (id TEXT, object_identifier	TEXT,description	TEXT,event_state	TEXT,object_name	TEXT,object_type	TEXT,out_of_service	TEXT,reliability	TEXT,units	TEXT,device_id	TEXT,FOREIGN KEY(device_id) REFERENCES bacnetDevice(deviceId))"
    );
  });
});

/**
 * modbus 디바이스가 이미 등록되어있는지 확인하는 함수
 * ipAddress, port, start, length, type 체크
 * @param device IModbusDeviceGroup
 * @returns
 */
const searchModbusDevice = async (device: IModbusDeviceGroup) => {
  return await new Promise<boolean>(res => {
    sqlite.all(
      "SELECT * FROM modbusDevice WHERE ipAddress = ? AND port = ? AND start = ? AND length = ? AND type = ?",
      [device.ipAddress, device.port, device.start, device.length, device.type],
      (_err, rows) => {
        if (rows.length > 0) {
          res(true);
        } else {
          res(false);
        }
      }
    );
  });
};

/**
 * 입력된 modbus Device를 sqlite에 입력하는 함수
 * @param device IModbusDeviceGroup
 */
export const addModbusDevice = async (devices: IModbusDeviceGroup[]) => {
  const maxId: number = await new Promise(resolve => {
    const aiQuery = "SELECT MAX(id) AS max_id FROM modbusDevice";
    sqlite.each(aiQuery, (_err, row: { max_id: number }) => {
      resolve(row.max_id || 0);
    });
  });
  await Promise.all(
    devices.map(async (device, index) => {
      const search = await searchModbusDevice(device);
      if (search) {
        return;
      }
      return await new Promise((resolve, reject) => {
        const number = maxId + 1 + index;
        const deviceName = device.name || "MODBUS_" + number;
        sqlite.run(
          "INSERT INTO modbusDevice(id, name, ipAddress, port, start, length, delay, type, targetName) VALUES(?,?,?,?,?,?,?,?,?)",
          [number, deviceName, device.ipAddress, device.port, device.start, device.length, device.delay, device.type, device.targetName],
          async err => {
            if (err) {
              reject(err);
            }
            if (device.targets) {
              await addModbusTarget(device.targets, deviceName, number);
            }
            resolve(true);
          }
        );
      });
    })
  );
};

/**
 * 각 Target을 생성하는 함수
 * @param targets ITarget
 * @param deviceName string
 * @param number number
 */
const addModbusTarget = async (targets: ITarget[], deviceName: string, device_id: number, sameStart?: number, sameEnd?: number) => {
  await Promise.all(
    targets.map(async target => {
      if (sameStart !== undefined && sameEnd !== undefined) {
        if (target.position >= sameStart && target.position <= sameEnd) {
          return;
        }
      }
      const targetName = target.name || deviceName + "_target_" + target.position;
      return await new Promise((resolve, reject) => {
        sqlite.run("INSERT INTO modbusTarget(name, position, device_id) VALUES(?,?,?)", [targetName, target.position, device_id], err => {
          if (err) {
            reject(err);
          }
          resolve(true);
        });
      });
    })
  );
};

/**
 * sqlite에 저장된 modbus 디바이스 및 타겟을 제거하는 함수
 * @param device IModbusDeviceGroup
 */
export const deleteModbusDevice = async (device: IModbusDeviceGroup) => {
  await new Promise(res => {
    sqlite.run("DELETE FROM modbusTarget WHERE device_id = ?", [device.id], _err => {
      res(true);
    });
  });
  await new Promise(res => {
    sqlite.run("DELETE FROM modbusDevice WHERE id = ?", [device.id], _err => {
      res(true);
    });
  });
};

/**
 * sqlite에 저장된 modbus 디바이스를 수정하는 함수
 * 연결되어있는 target이 start와 length범위에 없으면 제거
 * @param device IModbusDeviceGroup
 */
export const updateModbusDevice = async (device: IModbusDeviceGroup) => {
  const old_device: IModbusDeviceGroup = await new Promise(resolve => {
    const aiQuery = "SELECT * FROM modbusDevice WHERE id = ?";
    sqlite.each(aiQuery, [device.id], (_err, row: IModbusDeviceGroup) => {
      resolve(row);
    });
  });
  let sameStart = -1;
  let sameEnd = -1;
  const old_start = old_device.start;
  const old_end = old_device.start + old_device.length - 1;
  const new_start = device.start;
  const new_end = device.start + device.length - 1;
  if (new_start > old_start && new_start < old_end) {
    sameStart = new_start;
  } else {
    sameStart = old_start;
  }
  if (new_end > old_start && new_end < old_end) {
    sameEnd = new_end;
  } else {
    sameEnd = old_end;
  }
  await new Promise(res => {
    sqlite.run("DELETE FROM modbusTarget WHERE device_id = ? AND position < ?", [device.id, sameStart], () => {
      res(true);
    });
  });
  await new Promise(res => {
    sqlite.run("DELETE FROM modbusTarget WHERE device_id = ? AND position > ?", [device.id, sameEnd], () => {
      res(true);
    });
  });
  await new Promise(res => {
    sqlite.run(
      "UPDATE modbusDevice SET name = ?, ipAddress = ?, port = ?, start = ?, length = ?, delay = ?, type = ? WHERE id = ?",
      [device.name, device.ipAddress, device.port, device.start, device.length, device.delay, device.type, device.id],
      err => {
        res(true);
      }
    );
  });
  await addModbusTarget(device.targets, device.name, device.id, sameStart, sameEnd);
};

/**
 * sqlite에 저장된 modbus 타겟을 수정하는 함수
 * @param target ITarget
 */
export const updateModbusTarget = async (target: ITarget) => {
  await new Promise(res => {
    sqlite.run("UPDATE modbusTarget SET name = ?, parsing = ? WHERE id = ?", [target.name, target.parsing, target.id], () => {
      res(true);
    });
  });
};

/**
 * sqlite에 저장된 modbus 디바이스를 가져오는 함수
 * @returns Promise<IModbusDeviceGroup[]>
 */
export const getModbusDevice = async () => {
  const devices: IModbusDeviceGroup[] = await new Promise(resolve => {
    sqlite.all("SELECT * FROM modbusDevice", (_err: any, row: IModbusDeviceGroup[]) => {
      resolve(row);
    });
  });
  const result: IModbusDeviceGroup[] = await Promise.all(
    devices.map(async device => {
      const target: ITarget[] = await new Promise(res => {
        sqlite.all("SELECT * FROM modbusTarget WHERE device_id = ?", [device.id], (_err, rows: ITarget[]) => {
          res(rows);
        });
      });

      const targets = orderBy(target, ["name"], ["asc"]);
      return { ...device, targets };
    })
  );
  const res = orderBy(result, ["name"], ["asc"]);
  return res;
};

/**
 * BACnet 디바이스를 sqlite에 저장하는 함수
 * @param device IBacnetDevice
 * @returns
 */
export const addBacnetDeice = async (device: IBacnetDevice) => {
  const search = await searchBacnetDevice(device.id);
  if (search) {
    await new Promise(res2 => {
      sqlite.run(
        "UPDATE bacnetDevice SET name = ?, sender = ?, deviceId = ?, object_identifier = ?, object_name = ?, vendor_name = ?, apdu_timeout = ?, max_apdu_length_accepted = ?, object_type = ? WHERE id = ?",
        [
          device.name,
          JSON.stringify(device.sender),
          device.deviceId,
          JSON.stringify(device.object_identifier),
          device.object_name,
          device.vendor_name,
          device.apdu_timeout,
          device.max_apdu_length_accepted,
          device.object_type,
          device.id
        ],
        () => {
          res2(true);
        }
      );
    });
  } else {
    await new Promise(res2 => {
      sqlite.run(
        "INSERT INTO bacnetDevice(id, name, sender, deviceId, object_identifier,object_name,vendor_name,apdu_timeout,max_apdu_length_accepted,object_type) VALUES(?,?,?,?,?,?,?,?,?,?)",
        [
          device.id,
          device.name,
          JSON.stringify(device.sender),
          device.deviceId,
          JSON.stringify(device.object_identifier),
          device.object_name,
          device.vendor_name,
          device.apdu_timeout,
          device.max_apdu_length_accepted,
          device.object_type
        ],
        () => {
          res2(true);
        }
      );
    });
  }
  await addBacnetObject(device);
};

/**
 * sqlite에 동일한 BACnet 디바이스가 있는지 확인하는 함수
 * @param deviceId string
 * @returns
 */
const searchBacnetDevice = async (deviceId: string) => {
  return await new Promise<boolean>(res => {
    sqlite.all("SELECT * FROM bacnetDevice WHERE id = ?", [deviceId], (_err: any, row: IBacnetDevice[]) => {
      if (row.length > 0) {
        res(true);
      } else {
        res(false);
      }
    });
  });
};

/**
 * BACnet 오브젝트를 sqlite에 저장하는 함수
 * @param device IBacnetDevice
 * @returns
 */
const addBacnetObject = async (device: IBacnetDevice) => {
  if (device.object_list) {
    for (const object of device.object_list) {
      const search = await searchBacnetObject(object.id);
      if (search) {
        // await new Promise(res => {
        //   sqlite.run(
        //     "UPDATE bacnetObject SET object_identifier = ?, description = ?, event_state = ?, object_name = ?, object_type = ?, out_of_service = ?, reliability = ?, units = ?, device_id = ? WHERE id = ?",
        //     [
        //       JSON.stringify(object.object_identifier),
        //       object.description,
        //       object.event_state,
        //       object.object_name,
        //       object.object_type,
        //       object.out_of_service,
        //       object.reliability,
        //       object.units,
        //       device.id,
        //       object.id
        //     ],
        //     () => {
        //       console.log("bacnetObject update end");
        //       res(true);
        //     }
        //   );
        // });
      } else {
        await new Promise(res => {
          sqlite.run(
            "INSERT INTO bacnetObject(id, object_identifier,description,event_state,object_name,object_type,out_of_service,reliability,units, device_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
            [
              object.id,
              JSON.stringify(object.object_identifier),
              object.description,
              object.event_state,
              object.object_name,
              object.object_type,
              object.out_of_service,
              object.reliability,
              object.units,
              device.id
            ],
            () => {
              res(true);
            }
          );
        });
      }
    }
  }
};

/**
 * sqlite에 동일한 BACnet 오브젝트가 있는지 확인하는 함수
 * @param objectId string
 * @returns
 */
const searchBacnetObject = async (objectId: string) => {
  return await new Promise<boolean>(res => {
    sqlite.all("SELECT * FROM bacnetObject WHERE id = ?", [objectId], (_err: any, row: IBacnetObject[]) => {
      if (row.length > 0) {
        res(true);
      } else {
        res(false);
      }
    });
  });
};

/**
 * sqlite에 등록된 BACnet디바이스를 가져오는 함수
 * @returns IBacnetDevice[]
 */
export const getBacnetDevice = async () => {
  const data: IBacnetDevice[] = await new Promise(res => {
    sqlite.all("SELECT * FROM bacnetDevice", async (_err, rows: IBacnetDevice[]) => {
      const devices: any[] = [];
      for (const row of rows) {
        const sender = typeof row.sender === "string" ? JSON.parse(row.sender) : row.sender;
        const object_list = await new Promise(res2 => {
          sqlite.all("SELECT * FROM bacnetObject WHERE device_id = ?", [row.id], (_err2, row2: IBacnetObject[]) => {
            const rowData = row2.map((row: any) => {
              const object_identifier = JSON.parse(row.object_identifier.toString());
              if (row.enabled === 1) {
                subscribeCOV(sender, object_identifier);
              }
              return row.object_identifier ? { ...row, object_identifier, enabled: row.enabled === 1 } : row;
            });
            res2(rowData);
          });
        });
        devices.push({ ...row, sender: JSON.parse(row.sender.toString()), object_list });
      }
      res(devices);
    });
  });
  return data;
};

/**
 * subscribe를 활성화/비활성화 하는 함수
 * @param sender IBacnetSender
 * @param object IBacnetIdentifier
 * @param enabled boolean
 */
export const updateBacnetSubscribe = async (sender: IBacnetSender, object: IBacnetIdentifier, enabled: boolean) => {
  sqlite.all("SELECT * FROM bacnetDevice WHERE sender = ?", [JSON.stringify(sender)], (_err, rows: any[]) => {
    if (rows.length > 0) {
      const device_id = rows[0].id;
      sqlite.run(
        "UPDATE bacnetObject SET enabled = ? WHERE device_id = ? AND object_identifier = ?",
        [enabled ? 1 : 0, device_id, JSON.stringify(object)],
        () => {
          if (enabled) {
            subscribeCOV(sender, object);
          } else {
            unsubscribeCOV(sender, object);
          }
          updateBacnet(sender, object, { enabled });
        }
      );
    }
  });
};
