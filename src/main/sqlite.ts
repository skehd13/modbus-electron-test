import Sqlite3 from "sqlite3";
import { app } from "electron";
import path from "path";
import { orderBy } from "lodash";

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
  console.log("searchModbusDevice");
  return await new Promise<boolean>(res => {
    sqlite.all(
      "SELECT * FROM modbusDevice WHERE ipAddress = ? AND port = ? AND start = ? AND length = ? AND type = ?",
      [device.ipAddress, device.port, device.start, device.length, device.type],
      (err, rows) => {
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
  const maxId: number = await new Promise((resolve, reject) => {
    const aiQuery = "SELECT MAX(id) AS max_id FROM modbusDevice";
    sqlite.each(aiQuery, (err, row: { max_id: number }) => {
      resolve(row.max_id || 0);
    });
  });
  Promise.all(
    devices.map(async (device, index) => {
      const search = await searchModbusDevice(device);
      if (search) {
        return;
      }
      return await new Promise((resolve, reject) => {
        const number = maxId + 1 + index;
        const deviceName = "MODBUS_" + number;
        sqlite.run(
          "INSERT INTO modbusDevice(id, name, ipAddress, port, start, length, delay, type) VALUES(?,?,?,?,?,?,?,?)",
          [number, deviceName, device.ipAddress, device.port, device.start, device.length, device.delay, device.type],
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
const addModbusTarget = (targets: ITarget[], deviceName: string, number: number) => {
  Promise.all(
    targets.map(async (target, index) => {
      const targetName = deviceName + "_target_" + index;
      return await new Promise((resolve, reject) => {
        sqlite.run("INSERT INTO modbusTarget(name, position, device_id) VALUES(?,?,?)", [targetName, index, number], err => {
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
 * sqlite에 저장된 modbus 디바이스를 가져오는 함수
 * @returns Promise<IModbusDeviceGroup[]>
 */
export const getModbusDevice = async () => {
  console.log("getModbusDevice start");
  const devices: IModbusDeviceGroup[] = await new Promise((resolve, reject) => {
    sqlite.all("SELECT * FROM modbusDevice", (err: any, row: IModbusDeviceGroup[]) => {
      resolve(row);
    });
  });
  console.log("getModbusDevice devices", devices);
  const result: IModbusDeviceGroup[] = await Promise.all(
    devices.map(async device => {
      const target: ITarget[] = await new Promise(res => {
        sqlite.all("SELECT * FROM modbusTarget WHERE device_id = ?", [device.id], (err, rows: ITarget[]) => {
          res(rows);
        });
      });

      const targets = orderBy(target, ["name"], ["asc"]);
      return { ...device, targets };
    })
  );
  console.log("getModbusDevice result", result);
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
    return;
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
        async () => {
          res2(true);
        }
      );
    });
    await addBacnetObject(device);
  }
};

/**
 * sqlite에 동일한 BACnet 디바이스가 있는지 확인하는 함수
 * @param deviceId string
 * @returns
 */
const searchBacnetDevice = async (deviceId: string) => {
  return await new Promise<boolean>(res => {
    sqlite.all("SELECT * FROM bacnetDevice WHERE id = ?", [deviceId], (err: any, row: IBacnetDevice[]) => {
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
      console.log("search", search, object.id);
      if (search) {
        return;
      } else {
        await sqlite.run(
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
          ]
        );
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
    sqlite.all("SELECT * FROM bacnetObject WHERE id = ?", [objectId], (err: any, row: IBacnetObject[]) => {
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
    sqlite.all("SELECT * FROM bacnetDevice", async (err, rows: IBacnetDevice[]) => {
      const devices: any[] = [];
      for (const row of rows) {
        const object_list = await new Promise(res2 => {
          sqlite.all("SELECT * FROM bacnetObject WHERE device_id = ?", [row.id], (err2, row2: IBacnetObject[]) => {
            const rowData = row2.map((row: any) =>
              row.object_identifier ? { ...row, object_identifier: JSON.parse(row.object_identifier.toString()) } : row
            );
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
