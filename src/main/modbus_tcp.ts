import { ModbusTCPClient } from "jsmodbus";
import { find } from "lodash";
import net from "net";

let intervals: NodeJS.Timeout[] = [];

/**
 * 받아온 디바이스 값을 이용하여 modbus-TCP 연결
 * @param device IModbusDeviceGroup
 * @returns IModbusDeviceGroup
 */
export const createModbus = (device: IModbusDeviceGroup) => {
  console.log("create MODBUS", device.name);
  const socket = new net.Socket();
  const options = {
    host: device.ipAddress,
    port: device.port
  };
  socket.on("connect", () => {
    console.log("socket connect", device.name);
  });
  socket.on("close", () => {
    console.log("socket close", device.name);
  });
  socket.connect(options);
  const client = new ModbusTCPClient(socket, 1, 60000);
  console.log("createModbus", device.name);
  device.socket = socket;
  device.client = client;
  return device;
};

/**
 * 각 디바이스의 값을 받아와서 주기적으로 업데이트하는 함수
 * 업데이트 함수는 intervals로 등록됨
 * @param devices IModbusDeviceGroup[]
 * @param webContents Electron.WebContents
 * @returns
 */
export const readData = async (devices: IModbusDeviceGroup[], webContents: Electron.WebContents) => {
  if (intervals.length > 0) {
    await clearAllInterval();
  }
  console.log(devices.length);
  const newDevices = devices;
  return await Promise.all(
    newDevices.map(async device => {
      console.log("readData", device.name);
      const client = device.client;
      const targets = device.targets;
      if (!client) {
        console.log("client not found!!!!!");
      }
      if (client) {
        await Promise.all(
          targets.map(group => {
            const interval = setInterval(() => {
              const readFn = (type: number, start: number, length: number) => {
                if (type === 0) {
                  return client.readCoils(start, length);
                } else if (type === 1) {
                  return client.readDiscreteInputs(start, length);
                } else if (type === 2) {
                  return client.readInputRegisters(start, length);
                } else {
                  return client.readHoldingRegisters(start, length);
                }
              };
              readFn(device.type, device.start, device.length)
                .then(data => {
                  const values = data.response.body.valuesAsArray;
                  values.map((value: any, index) => {
                    const target = find(device.targets, { position: index });
                    if (target) {
                      target.value = value;
                      webContents.send("updateDevice", {
                        ipAddress: device.ipAddress,
                        port: device.port,
                        address: device.start + target.position,
                        value
                      });
                      // console.log(group.name, target.name, value);
                    } else {
                      console.log(group.name, "unkown", value);
                    }
                    return value;
                  });
                })
                .catch(err => console.log(err));
            }, device.delay);
            intervals.push(interval);
            return group;
          })
        );
      }
    })
  );
};

/**
 * 연결된 modbus 소켓을 제거하는 함수
 * @param devices IModbusDeviceGroup
 */
export const closeSocket = (devices: IModbusDeviceGroup[]) => {
  console.log("close socket");
  devices.map(device => {
    device.socket?.destroy();
  });
};

/**
 * 데이터를 갱신하는 intervals에 등록된 함수를 해제하는 함수
 */
export const clearAllInterval = async () => {
  Promise.all(
    intervals.map(interval => {
      clearInterval(interval);
    })
  );
  intervals = [];
};
