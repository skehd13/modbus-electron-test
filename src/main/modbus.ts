import { WebContents } from 'electron';
import ModbusRTU from 'modbus-serial';
import { SerialPort } from 'serialport';
import winston from 'winston';
import os from 'os';
import _ from 'lodash';

const homeDir = os.homedir();

let mWebContents: WebContents;
let devices: IDevice[];
const clients: IClient[] = [];

export const listSerialPorts = async () => {
  console.log('get list');
  const ports = await SerialPort.list().then(async (info) => {
    console.log('!!!!!!!');
    console.log(info);
    const ports: string[] = [];
    await Promise.all(
      info.map((serial) => {
        if (serial.productId) {
          console.log(serial.path);
          ports.push(serial.path);
        }
      })
    );
    return ports;
  });
  console.log('ports: ', ports);
  return ports;
};

export const setWebContents = (webContents: WebContents) => {
  mWebContents = webContents;
};

export const updateRead = async (newDevices: IDevice[]) => {
  await Promise.all(
    newDevices.map(async (device) => {
      const findClientIndex = _.findIndex(clients, { id: device.id });
      const findClient = clients[findClientIndex];
      if (!findClient) {
        const { client, logger } = await createClient(device);
        clients.push({
          id: device.id,
          fileName: device.fileName,
          client,
          logger,
        });
      } else if (findClient.fileName !== device.fileName) {
        findClient.logger.close();
        findClient.client.close(() => {
          console.log('old client close');
          clients.splice(findClientIndex, 1);
        });
        const { client, logger } = await createClient(device);
        clients.push({
          id: device.id,
          fileName: device.fileName,
          client,
          logger,
        });
      }
    })
  );
  devices = newDevices;
};

const readData = async () => {
  _.map(devices, async (device) => {
    const runOptions = _.filter(device.options, { isRun: true });
    const clientObject = _.find(clients, { id: device.id });
    if (runOptions.length > 0 && clientObject) {
      const client = clientObject.client;
      const logger = clientObject.logger;
      for (const option of runOptions) {
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

const createClient = async (device: IDevice) => {
  const logger = winston.createLogger({
    defaultMeta: { time: new Date().toISOString() },
    transports: new winston.transports.File({
      filename: `${homeDir}/Desktop/${device.fileName}.log`,
    }),
  });
  const client = new ModbusRTU();
  // client.connectRTU()
  // client.setID(option.id);
  console.log('connect', device.id);
  logger.info(`connect ${JSON.stringify(device)}`);
  await client.connectRTUBuffered(device.id, device.deviceOption);
  return { client, logger };
};

const readCoilData = async (
  client: ModbusRTU,
  logger: winston.Logger | undefined,
  option: IReadOption
) => {
  client.setID(option.id);
  return await client
    .readCoils(option.start, option.readLen)
    .then(({ data }) => {
      console.log('id:', client.getID());
      console.log('readData:', data);
      console.log('options:', JSON.stringify(option));
      if (logger) {
        logger.info(
          `${JSON.stringify({
            option,
            id: client.getID(),
            readData: data,
          })}`
        );
      }
      if (mWebContents) {
        mWebContents.send('data', data);
      }
    })
    .catch((err) => console.log('err', err));
};

const readInputCoilData = async (
  client: ModbusRTU,
  logger: winston.Logger | undefined,
  option: IReadOption
) => {
  client.setID(option.id);
  return await client
    .readDiscreteInputs(option.start, option.readLen)
    .then(({ data }) => {
      console.log('id:', client.getID());
      console.log('readData:', data);
      console.log('options:', JSON.stringify(option));
      if (logger) {
        logger.info(
          `${JSON.stringify({
            option,
            id: client.getID(),
            readData: data,
          })}`
        );
      }
      if (mWebContents) {
        mWebContents.send('data', data);
      }
    })
    .catch((err) => console.log('err', err));
};

const readRegisterData = async (
  client: ModbusRTU,
  logger: winston.Logger | undefined,
  option: IReadOption
) => {
  client.setID(option.id);
  return await client
    .readHoldingRegisters(option.start, option.readLen)
    .then(({ data }) => {
      console.log('id:', client.getID());
      console.log('readData:', data);
      console.log('options:', JSON.stringify(option));
      if (logger) {
        logger.info(
          `${JSON.stringify({
            option,
            id: client.getID(),
            readData: data,
          })}`
        );
      }
      if (mWebContents) {
        mWebContents.send('data', data);
      }
    })
    .catch((err) => console.log('err', err));
};

const readInputRegisterData = async (
  client: ModbusRTU,
  logger: winston.Logger | undefined,
  option: IReadOption
) => {
  client.setID(option.id);
  return await client
    .readInputRegisters(option.start, option.readLen)
    .then(({ data }) => {
      console.log('id:', client.getID());
      console.log('readData:', data);
      console.log('options:', JSON.stringify(option));
      if (logger) {
        logger.info(
          `${JSON.stringify({
            option,
            id: client.getID(),
            readData: data,
          })}`
        );
      }
      if (mWebContents) {
        mWebContents.send('data', data);
      }
    })
    .catch((err) => console.log('err', err));
};
