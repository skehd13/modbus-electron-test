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
import { app, BrowserWindow, shell, ipcMain, Menu } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import MenuBuilder from "./menu";
import { resolveHtmlPath } from "./util";
import { closeSocket, createModbus, readData, writeModbusData } from "./modbus_tcp";
import { generateDevice } from "./deviceValue";
import { getDevices, subscribeCOV, unsubscribeCOVAll } from "./bacnet";
import "./sqlite";
import { addModbusDevice, deleteModbusDevice, getModbusDevice, updateBacnetSubscribe, updateModbusDevice, updateModbusTarget } from "./sqlite";
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
  event.reply("ipc-example", msgTemplate("pong"));
});

/**
 * ipcMain Start
 */
// 마우스 우클릭 이벤트가 발생하면 동작하는 이벤트
// 여기서는 메뉴를 열어서 클릭된 row에따라서 다른 메뉴를 보여주게 처리
ipcMain.on("show-context-menu", (event, data) => {
  const template: Electron.MenuItemConstructorOptions[] = [];
  if (data.type === "modbus") {
    template.push({
      label: "open Modbus Device",
      click: () => {
        event.sender.send("context-menu-command", "menu-item-1");
        createModbusEditView().then(modbusWindow => {
          modbusWindow.once("show", () => {
            modbusWindow.webContents.send("modbusSetting", { ...data.device, viewType: "device" });
          });
        });
      }
    });
    if (data.target) {
      template.push({
        label: "open Modbus Target",
        click: () => {
          createModbusEditView().then(modbusWindow => {
            modbusWindow.once("show", () => {
              modbusWindow.webContents.send("modbusSetting", { ...data.target, viewType: "target" });
            });
          });
        }
      });
    }
  }
  if (template.length > 0) {
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) || undefined });
  }
});

// 모드버스 디바이스를 요청하는 이벤트
ipcMain.on("getModbusDevice", async event => {
  event.reply("modbusDevice", JSON.stringify(modbusDevices));
  // event.reply("getModbusDevice", JSON.stringify(modbusDevices));
});

// 모드버스 데이터를 읽기를 시작하는 이벤트
ipcMain.on("readData", async () => {
  if (mainWindow) {
    readData(modbusDevices, mainWindow.webContents);
  }
});

// 모드버스 디바이스에 데이터입력하는 이벤트
ipcMain.on("writeModbusData", (_event, data) => {
  const modbusDevice = modbusDevices.find(device => device.ipAddress === data.ipAddress);
  if (modbusDevice) {
    writeModbusData(modbusDevice, data.address, data.value);
  }
});

// 모드버스 디바이스를 추가하는 이벤트
ipcMain.on("addModbusDevice", async (_event, data) => {
  const newModbusDevice = generateDevice(data);
  await addModbusDevice(newModbusDevice);
  await getModbus();
  if (mainWindow) {
    mainWindow.webContents.send("modbusDevice", JSON.stringify(modbusDevices));
    BrowserWindow.fromWebContents(_event.sender)?.close();
    // readData(modbusDevices, mainWindow.webContents);
  }
});

// 모드버스 디바이스를 삭제하는 이벤트
ipcMain.on("deleteModbus", async (_event, data) => {
  const existDeviceIndex = modbusDevices.findIndex(device => device.id === data);
  const existDevice = modbusDevices[existDeviceIndex];
  existDevice?.socket?.destroy();
  await deleteModbusDevice(existDevice);
  await getModbus();
  if (mainWindow) {
    mainWindow.webContents.send("modbusDevice", JSON.stringify(modbusDevices));
    BrowserWindow.fromWebContents(_event.sender)?.close();
  }
});

// 모드버스 디바이스를 업데이트하는 이벤트
ipcMain.on("updateModbusDevice", async (_event, data) => {
  const newModbusDevice = generateDevice(data);
  await updateModbusDevice({ ...newModbusDevice[0], id: data.id });
  await getModbus();
  if (mainWindow) {
    mainWindow.webContents.send("modbusDevice", JSON.stringify(modbusDevices));
    BrowserWindow.fromWebContents(_event.sender)?.close();
  }
});

// 모드버스 타겟을 업데이트하는 이벤트
ipcMain.on("updateModbusTarget", async (_event, data) => {
  await updateModbusTarget(data);
  await getModbus();
  if (mainWindow) {
    mainWindow.webContents.send("modbusDevice", JSON.stringify(modbusDevices));
    BrowserWindow.fromWebContents(_event.sender)?.close();
  }
});

// BACnet 디바이스를 요청하는 이벤트
ipcMain.on("getBacnetDevices", () => {
  getDevices();
});

// BACnet Object를 subscribe 등록하는 이벤트
ipcMain.on("getUpdateBacnet", (_event, data) => {
  updateBacnetSubscribe(data.sender, data.object, data.enabled);
});
/**
 * ipcMain End
 */

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

// 모드버스 임시 데이터 생성 및 sqlite 저장
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

// 모드버스의 연결된 소켓을 끊고 sqlite에서 데이터를 다시받은뒤
// 소켓을 다시연결하는 함수
const getModbus = async () => {
  await closeSocket(modbusDevices);
  await getModbusDevice().then(data => {
    modbusDevices = data;
  });
  await Promise.all(
    modbusDevices.map(modbusDevice => {
      createModbus(modbusDevice);
    })
  );
  return modbusDevices;
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

/**
 * createWindow Start
 */
export const createModbusEditView = async () => {
  const modbusEditWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    webPreferences: {
      preload: app.isPackaged ? path.join(__dirname, "preload.js") : path.join(__dirname, "../../.erb/dll/preload.js")
    }
  });

  // modbusEditWindow.loadURL(`file://${path.join(__dirname, "../renderer/modbusEdit.html")}`);
  modbusEditWindow.loadURL(resolveHtmlPath("modbusEdit.html"));

  modbusEditWindow.on("ready-to-show", async () => {
    console.log("ready-to-show modbusEditWindow");

    if (!modbusEditWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      modbusEditWindow.minimize();
    } else {
      modbusEditWindow.show();
    }
  });
  return modbusEditWindow;
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
    console.log("ready-to-show mainWindow");

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
 * createWindow End
 */

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
    // 모드버스 데이터 초기값셋팅 임시처리 sqlite 데이터가 없는경우 활성화
    // await createModbusData();
    createWindow();
    app.on("activate", () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
