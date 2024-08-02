import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { useEffect, useState } from "react";
import _, { map, orderBy } from "lodash";

interface TAppModbusDevice {
  originDevice?: any;
  originTarget?: any;
  name: string;
  ipAddress: string;
  port: number;
  address: number;
  value: number;
}

const Hello = () => {
  const [appModbusDevices, setAppModbusDevices] = useState<TAppModbusDevice[]>([]);
  const [appBacnetDevices, setAppBacnetDevices] = useState<any[]>([]);

  const updateBacnetDevices = (data: any) => {
    setAppBacnetDevices(props => {
      return props.map(device => {
        if (device.sender.address === data.sender.address) {
          return {
            ...device,
            object_list: device.object_list.map((object: any) => {
              if (JSON.stringify(object.object_identifier) === JSON.stringify(data.object)) {
                return { ...object, ...data.updateData };
              }
              return object;
            })
          };
        }
        return device;
      });
    });
  };
  useEffect(() => {
    const getModbusDevices = window.electron.ipcRenderer.on("modbusDevice", modbusDevices => {
      const newAppModbusDevice: TAppModbusDevice[] = [];
      JSON.parse(modbusDevices).map((device: IModbusDeviceGroup) => {
        return device.targets.map(target => {
          newAppModbusDevice.push({
            originDevice: device,
            originTarget: target,
            name: target.name,
            ipAddress: device.ipAddress,
            port: device.port,
            address: target.position,
            value: 0
          });
        });
      });
      setAppModbusDevices(newAppModbusDevice);
      window.electron.ipcRenderer.sendMessage("readData", "");
    });
    const updateModbusValue = window.electron.ipcRenderer.on("updateModbusValue", data => {
      setAppModbusDevices(props => {
        return props.map(device => {
          if (device.ipAddress === data.ipAddress && device.address === data.address && device.port === data.port) {
            return {
              ...device,
              value: data.value
            };
          } else {
            return device;
          }
        });
      });
    });

    const getBacnetDevices = window.electron.ipcRenderer.on("bacnetDevices", data => {
      const newBacnetDevice = map(JSON.parse(data), device => {
        return {
          ...device,
          object_list: orderBy(device.object_list, ["id"], ["asc"])
        };
      });
      setAppBacnetDevices(newBacnetDevice);
    });

    const updateBacnet = window.electron.ipcRenderer.on("updateBacnet", data => {
      updateBacnetDevices(data);
    });
    const menuClick = window.electron.ipcRenderer.on("context-menu-command", data => {
      console.log(data);
    });

    window.electron.ipcRenderer.sendMessage("getModbusDevice", "");
    window.electron.ipcRenderer.sendMessage("getBacnetDevices", "");
    return () => {
      if (getModbusDevices) getModbusDevices();
      if (updateModbusValue) updateModbusValue();
      if (getBacnetDevices) getBacnetDevices();
      if (updateBacnet) updateBacnet();
      // window.removeEventListener("contextmenu", contextMenuFn);
      if (menuClick) menuClick();
    };
  }, []);

  const subscibeBacnetObject = (sender: IBacnetSender, object: IBacnetIdentifier, enabled: boolean) => {
    window.electron.ipcRenderer.sendMessage("getUpdateBacnet", { sender, object, enabled });
  };

  const modbusDataUpdate = (device: TAppModbusDevice) => {
    const value = Math.floor(Math.random() * 10000);
    window.electron.ipcRenderer.sendMessage("writeModbusData", { ipAddress: device.ipAddress, address: device.address, value });
  };

  const onContextMenu = (type: string, device: any, target?: any) => {
    window.electron.ipcRenderer.sendMessage("show-context-menu", { type, device, target });
  };

  return (
    <div className="page-container">
      <section style={{ background: "#FFF", color: "black", overflow: "scroll" }}>
        <div>Bacnet</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ fontWeight: "bold" }}>
              <td>DeviceId</td>
              <td>DeviceAddress</td>
              <td>DeviceName</td>
              <td>DeviceVendor</td>
              <td>ObjectId</td>
              <td>ObjectName</td>
              <td>ObjectDescription</td>
              <td>ObjectType</td>
              <td>enabled</td>
              <td>ObjectValue</td>
            </tr>
            {appBacnetDevices.map(device => {
              return (
                <>
                  {device.object_list.map((object: any) => {
                    return (
                      <tr
                        key={object.id}
                        onContextMenu={() => {
                          onContextMenu("bacnet", device);
                        }}
                        onClick={() => {
                          subscibeBacnetObject(device.sender, object.object_identifier, !object.enabled);
                        }}
                      >
                        <td>{device.name}</td>
                        <td>{device.sender.address}</td>
                        <td>{device.object_name}</td>
                        <td>{device.vendor_name}</td>
                        <td>{object.id}</td>
                        <td>{object.object_name}</td>
                        <td>{object.description}</td>
                        <td>{object.object_type}</td>
                        <td>{object.enabled ? "1" : "0"}</td>
                        <td>{object.present_value}</td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
        <div>Modbus</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ fontWeight: "bold" }}>
              <td>IP</td>
              <td>포트</td>
              <td>시작주소</td>
              <td>태그</td>
              <td>값</td>
            </tr>
            {appModbusDevices.map(device => {
              return (
                <tr
                  key={device.name}
                  onContextMenu={() => {
                    onContextMenu("modbus", device.originDevice, device.originTarget);
                  }}
                  onClick={() => {
                    modbusDataUpdate(device);
                  }}
                >
                  <td>{device.ipAddress}</td>
                  <td>{device.port}</td>
                  <td>{device.address}</td>
                  <td>{device.name}</td>
                  <td>{device.value}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
