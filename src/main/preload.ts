import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
type MODBUS_CHANNELS =
  | "readData"
  | "getModbusDevice"
  | "modbusDevice"
  | "updateModbusValue"
  | "writeModbusData"
  | "addModbusDevice"
  | "modbusSetting"
  | "deleteModbus"
  | "updateModbusDevice"
  | "updateModbusTarget";
type BACNET_CHANNEL = "getBacnetDevices" | "getUpdateBacnet" | "updateBacnet" | "bacnetDevices";
export type Channels = MODBUS_CHANNELS | BACNET_CHANNEL | "ipc-example" | "show-context-menu";

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
      ipcRenderer.on(channel, subscription);

      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    }
  }
});
