interface IReadOption {
  port: string;
  readLen: number;
  start: number;
  id: number;
  functionCode: number;
  isRun: boolean;
}

interface IDevice {
  id: string;
  deviceOption: import('modbus-serial/ModbusRTU').SerialPortOptions;
  fileName: string;
  options: IReadOption[];
}

interface IClient {
  id: string;
  fileName: string;
  client: import('modbus-serial').default;
  logger: import('winston').Logger;
}
