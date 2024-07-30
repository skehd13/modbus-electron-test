import { WebContents } from "electron";
import ModbusRTU from "modbus-serial";
import { SerialPort } from "serialport";
import winston from "winston";
import os from "os";
import _ from "lodash";
import moment from "moment-timezone";

const homeDir = os.homedir();

let mWebContents: WebContents;
let devices: IDevice[] = [];
const clients: IClient[] = [];

export const listSerialPorts = async () => {
  console.log("get list");
  const ports = await SerialPort.list().then(async info => {
    console.log("!!!!!!!");
    console.log(info);
    const ports: { port: string; enalbedId: number[] }[] = [];
    await Promise.all(
      info.map(serial => {
        if (serial.productId) {
          console.log(serial.path);
          ports.push({ port: serial.path, enalbedId: [] });
          idScan(serial.path);
        }
      })
    );
    return ports;
  });
  console.log("ports: ", ports);
  return ports;
};

export const idScan = async (port: string) => {
  const option = { id: 0, functionCode: 3, start: 0, readLen: 1, port, isRun: true };
  const { client, logger } = await createClient({ id: port, deviceOption: { baudRate: 9600 }, options: [option], fileName: "scan" });
  client.setTimeout(30);
  const enabledId: { id: number[]; function: number }[] = [];
  const disabledId: number[] = [];
  for (let id = 1; id < 256; id++) {
    const option = { id, functionCode: 0, start: 0, readLen: 1, port, isRun: true };
    console.log("option:", option);
    await readCoilData(client, logger, option)
      .then(async () => {
        const enabled = _.findIndex(enabledId, { function: 1 });
        if (enabled >= 0) {
          enabledId[enabled].id.push(id);
        } else {
          enabledId.push({ function: 1, id: [id] });
        }
        logger.info(`connect enable id: ${id}`);
      })
      .catch(async () => {
        disabledId.push(id);
        console.log(`connect disable id: ${id}`);
      });
    await readInputCoilData(client, logger, option)
      .then(async () => {
        const enabled = _.findIndex(enabledId, { function: 2 });
        if (enabled >= 0) {
          enabledId[enabled].id.push(id);
        } else {
          enabledId.push({ function: 2, id: [id] });
        }
        logger.info(`connect enable id: ${id}`);
      })
      .catch(async () => {
        disabledId.push(id);
        console.log(`connect disable id: ${id}`);
      });
    await readRegisterData(client, logger, option)
      .then(async () => {
        const enabled = _.findIndex(enabledId, { function: 3 });
        if (enabled >= 0) {
          enabledId[enabled].id.push(id);
        } else {
          enabledId.push({ function: 3, id: [id] });
        }
        logger.info(`connect enable id: ${id}`);
      })
      .catch(async () => {
        disabledId.push(id);
        console.log(`connect disable id: ${id}`);
      });
    await readInputRegisterData(client, logger, option)
      .then(async () => {
        const enabled = _.findIndex(enabledId, { function: 4 });
        if (enabled >= 0) {
          enabledId[enabled].id.push(id);
        } else {
          enabledId.push({ function: 4, id: [id] });
        }
        logger.info(`connect enable id: ${id}`);
      })
      .catch(async () => {
        disabledId.push(id);
        console.log(`connect disable id: ${id}`);
      });
  }
  await client.close(() => {
    console.log("close client");
    logger.close();
  });
  console.log("idState", disabledId, enabledId, port);
  mWebContents.send("idState", { enabledId, port });
  return { disabledId, enabledId, port };
};

export const setWebContents = (webContents: WebContents) => {
  mWebContents = webContents;
};

export const updateRead = async (newDevices: IDevice[]) => {
  if (devices.length > 0) {
    await Promise.all(
      devices.map(device => {
        const findDeviceIndex = _.findIndex(newDevices, { id: device.id });
        console.log("findDeviceIndex", findDeviceIndex);
        if (findDeviceIndex < 0) {
          const clientObjectIndex = _.findIndex(clients, { id: device.id });
          const clientObject = clients[clientObjectIndex];
          if (clientObject) {
            const client = clientObject.client;
            const logger = clientObject.logger;
            if (client) {
              client.close(() => {
                console.log("client close");
                logger.info(JSON.stringify({ message: "client close", port: device.id }));
                logger.close();
              });
            }
            clients.splice(clientObjectIndex, 1);
          }
        }
      })
    );
  }

  await Promise.all(
    newDevices.map(async device => {
      const findClientIndex = _.findIndex(clients, { id: device.id });
      const findClient = clients[findClientIndex];
      if (!findClient) {
        const { client, logger } = await createClient(device);
        clients.push({
          id: device.id,
          fileName: device.fileName,
          client,
          logger
        });
      } else if (findClient.fileName !== device.fileName) {
        findClient.logger.close();
        findClient.client.close(() => {
          console.log("old client close");
          clients.splice(findClientIndex, 1);
        });
        const { client, logger } = await createClient(device);
        clients.push({
          id: device.id,
          fileName: device.fileName,
          client,
          logger
        });
      }
    })
  );
  devices = newDevices;
};

const readData = async () => {
  _.map(devices, async device => {
    const runOptions = _.filter(device.options, { isRun: true });
    const clientObject = _.find(clients, { id: device.id });
    if (runOptions.length > 0 && clientObject) {
      const client = clientObject.client;
      const logger = clientObject.logger;
      for (const option of runOptions) {
        console.log(option);
        if (option.functionCode === 1) {
          await readCoilData(client, logger, option);
        } else if (option.functionCode === 2) {
          await readInputCoilData(client, logger, option);
        } else if (option.functionCode === 3) {
          await readRegisterData(client, logger, option);
        } else if (option.functionCode === 4) {
          await readInputRegisterData(client, logger, option);
        }
      }
    }
  });
};

setInterval(readData, 1000);

const appendTimestamp = winston.format((info, opts) => {
  if (opts.tz) {
    info.timestamp = moment().tz(opts.tz).format("YYYY-MM-DD HH:mm:ss ||");
  }
  return info;
});

const format = winston.format.combine(
  appendTimestamp({ tz: "Asia/Seoul" }),
  winston.format.printf(info => `${info.timestamp} ${info.level} | ${info.message}`)
);

const createClient = async (device: IDevice) => {
  const logger = winston.createLogger({
    format,
    transports: [
      new winston.transports.File({
        filename: `${homeDir}/Desktop/${device.fileName}.log`,
        level: "info"
      }),
      new winston.transports.File({
        filename: `${homeDir}/Desktop/${device.fileName}_error.log`,
        level: "error"
      })
    ]
  });
  const client = new ModbusRTU();
  // client.connectRTU()
  // client.setID(option.id);
  console.log("connect", device.id);
  logger.info(`connect ${JSON.stringify(device)}`);
  await client.connectRTUBuffered(device.id, device.deviceOption);
  return { client, logger };
};

const readCoilData = async (client: ModbusRTU, logger: winston.Logger | undefined, option: IReadOption) => {
  client.setID(option.id);
  return await client
    .readCoils(option.start, option.readLen)
    .then(({ data }) => {
      console.log("id:", client.getID());
      console.log("readData:", data);
      console.log("options:", JSON.stringify(option));
      if (logger) {
        logger.info(
          `${JSON.stringify({
            option,
            id: client.getID(),
            readData: data
          })}`
        );
      }
      if (mWebContents) {
        mWebContents.send("data", data);
      }
    })
    .catch(err => {
      if (logger) {
        logger.error(
          `${JSON.stringify({
            option,
            id: client.getID(),
            error: err
          })}`
        );
      }
      console.log("err", err);
      throw new Error(err);
    });
};

const readInputCoilData = async (client: ModbusRTU, logger: winston.Logger | undefined, option: IReadOption) => {
  client.setID(option.id);
  return await client
    .readDiscreteInputs(option.start, option.readLen)
    .then(({ data }) => {
      console.log("id:", client.getID());
      console.log("readData:", data);
      console.log("options:", JSON.stringify(option));
      if (logger) {
        logger.info(
          `${JSON.stringify({
            option,
            id: client.getID(),
            readData: data
          })}`
        );
      }
      if (mWebContents) {
        mWebContents.send("data", data);
      }
    })
    .catch(err => {
      if (logger) {
        logger.error(
          `${JSON.stringify({
            option,
            id: client.getID(),
            error: err
          })}`
        );
      }
      console.log("err", err);
      throw new Error(err);
    });
};

const readRegisterData = async (client: ModbusRTU, logger: winston.Logger | undefined, option: IReadOption) => {
  client.setID(option.id);
  return await client
    .readHoldingRegisters(option.start, option.readLen)
    .then(({ data }) => {
      console.log("id:", client.getID());
      console.log("readData:", data);
      console.log("options:", JSON.stringify(option));
      if (logger) {
        logger.info(
          `${JSON.stringify({
            option,
            id: client.getID(),
            readData: data
          })}`
        );
      }
      if (mWebContents) {
        mWebContents.send("data", data);
      }
    })
    .catch(err => {
      console.log("err", err);
      if (logger) {
        logger.error(
          `${JSON.stringify({
            option,
            id: client.getID(),
            error: err
          })}`
        );
      }
      throw new Error(err);
    });
};

const readInputRegisterData = async (client: ModbusRTU, logger: winston.Logger | undefined, option: IReadOption) => {
  client.setID(option.id);
  return await client
    .readInputRegisters(option.start, option.readLen)
    .then(({ data }) => {
      console.log("id:", client.getID());
      console.log("readData:", data);
      console.log("options:", JSON.stringify(option));
      if (logger) {
        logger.info(
          `${JSON.stringify({
            option,
            id: client.getID(),
            readData: data
          })}`
        );
      }
      if (mWebContents) {
        mWebContents.send("data", data);
      }
    })
    .catch(err => {
      if (logger) {
        logger.error(
          `${JSON.stringify({
            option,
            id: client.getID(),
            error: err
          })}`
        );
      }
      console.log("err", err);
      throw new Error(err);
    });
};
