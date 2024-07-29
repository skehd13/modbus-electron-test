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
  deviceOption: import("modbus-serial/ModbusRTU.d.ts").SerialPortOptions;
  fileName: string;
  options: IReadOption[];
  enableIds?: number[];
}

interface IClient {
  id: string;
  fileName: string;
  client: import("modbus-serial").default;
  logger: import("winston").Logger;
}

interface IModbusDevice {
  id: number;
  ipAddress: string;
  name: string;
  port: number;
  socket?: import("net").Socket;
  client?: import("jsmodbus").ModbusTCPClient;
  groups: IGroup[];
}

interface IGroup {
  id: number;
  name: string;
  start: number;
  length: number;
  delay: number;
  type: TGroupType;
  targets: ITarget[];
}

interface ITarget {
  id: number;
  name: string;
  index: number;
  value?: any;
}

type TGroupType = 0 | 1 | 2 | 3;

interface IModbusDeviceGroup {
  id: number;
  ipAddress: string;
  name: string;
  port: number;
  socket?: import("net").Socket;
  client?: import("jsmodbus").ModbusTCPClient;
  start: number;
  length: number;
  delay: number;
  type: TGroupType;
  targets: ITarget[];
}
