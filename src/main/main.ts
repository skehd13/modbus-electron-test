/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from "path";
import { app, BrowserWindow, shell, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import MenuBuilder from "./menu";
import { resolveHtmlPath } from "./util";
import { closeSocket, createModbus, readData } from "./modbus_tcp";
import { generateDevice } from "./deviceValue";
import { getDevices, subscribeCOV, unsubscribeCOVAll } from "./bacnet";
import "./sqlite";
import { addModbusDevice, getModbusDevice } from "./sqlite";
export default class AppUpdater {
  constructor() {
    log.transports.file.level = "info";
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let modbusDevices: IModbusDeviceGroup[];
ipcMain.on("ipc-example", async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply("ipc-example", msgTemplate("pong"));
});

// 모드버스 디바이스 renderer로 보내기
ipcMain.on("getModbusDevice", async event => {
  event.reply("modbusDevice", JSON.stringify(modbusDevices));
  event.reply("getModbusDevice", JSON.stringify(modbusDevices));
});

// 모드버스 데이터 가져오기
ipcMain.on("readData", async () => {
  console.log("readData");
  if (mainWindow) {
    readData(modbusDevices, mainWindow.webContents);
  }
});

// BACnet 디바이스 불러오기
ipcMain.on("getBacnetDevices", () => {
  console.log("getBacnetDevices");
  getDevices();
});

// BACnet Object를 subscribe 등록
ipcMain.on("getUpdateBacnet", (_event, data) => {
  console.log(data);
  subscribeCOV(data.sender, data.object);
});

// BACnet Device render로 전송
export const sendBacnetData = (bacnetDevices: IBacnetDevice[]) => {
  if (mainWindow) {
    mainWindow.webContents.send("bacnetDevices", JSON.stringify(bacnetDevices));
  }
};

// BACnet Object의 변경된 value를 renderer로 전송
export const updateBacnet = (sender: IBacnetSender, object: IBacnetIdentifier, updateData: any) => {
  if (mainWindow) {
    mainWindow.webContents.send("updateBacnet", { sender, object, updateData });
  }
};

// 모드버스 데이터 생성 및 sqlite 저장
const createModbusData = async () => {
  const newModbusDevices = generateDevice([
    {
      ipAddress: "192.168.0.47",
      name: "remote1",
      port: 502,
      start: 0,
      length: 10,
      type: 3,
      delay: 3000,
      targetName: "port1"
    },
    {
      ipAddress: "192.168.0.47",
      name: "remote2",
      port: 502,
      start: 10,
      length: 10,
      type: 3,
      delay: 3000,
      targetName: "port2"
    },
    {
      ipAddress: "192.168.0.115",
      name: "local1",
      port: 502,
      start: 0,
      length: 10,
      type: 3,
      delay: 1000,
      targetName: "port1"
    },
    {
      ipAddress: "192.168.0.115",
      name: "local2",
      port: 502,
      start: 10,
      length: 10,
      type: 3,
      delay: 1000,
      targetName: "port2"
    }
  ]);
  await addModbusDevice(newModbusDevices);
  await getModbusDevice().then(data => {
    modbusDevices = data;
  });
  await Promise.all(
    modbusDevices.map(modbusDevice => {
      createModbus(modbusDevice);
    })
  );
};

if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}

const isDebug = process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

if (isDebug) {
  require("electron-debug")();
}

const installExtensions = async () => {
  const installer = require("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ["REACT_DEVELOPER_TOOLS"];

  return installer
    .default(
      extensions.map(name => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged ? path.join(process.resourcesPath, "assets") : path.join(__dirname, "../../assets");

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath("icon.png"),
    webPreferences: {
      preload: app.isPackaged ? path.join(__dirname, "preload.js") : path.join(__dirname, "../../.erb/dll/preload.js")
    }
  });

  mainWindow.loadURL(resolveHtmlPath("index.html"));

  mainWindow.on("ready-to-show", async () => {
    console.log("ready-to-show");

    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on("closed", () => {
    unsubscribeCOVAll();
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler(edata => {
    shell.openExternal(edata.url);
    return { action: "deny" };
  });
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on("window-all-closed", () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  closeSocket(modbusDevices);
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    // await addModbusDevice().then(res => {
    //   console.log("addModbusDevice res", res);
    await createModbusData();
    // });
    createWindow();
    app.on("activate", () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
