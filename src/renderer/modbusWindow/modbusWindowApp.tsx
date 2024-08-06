import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import "./modbusWindow.css";
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

    const menuClick = window.electron.ipcRenderer.on("context-menu-command", data => {
      console.log(data);
    });

    window.electron.ipcRenderer.sendMessage("getModbusDevice", "");
    return () => {
      if (getModbusDevices) getModbusDevices();
      if (updateModbusValue) updateModbusValue();
      if (menuClick) menuClick();
    };
  }, []);

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
