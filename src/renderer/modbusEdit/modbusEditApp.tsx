import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
// import "./App.css";
import { useEffect, useState } from "react";
import _, { map, orderBy } from "lodash";
import { generateDeviceOption } from "main/deviceValue";

const Hello = () => {
  const [id, setId] = useState<number>();
  const [ipAddress, setIpAddress] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [port, setPort] = useState<number>();
  const [start, setStart] = useState<number>();
  const [length, setlength] = useState<number>();
  const [type, setType] = useState<number>();
  const [delay, setDelay] = useState<number>();
  const [targetName, setTargetName] = useState<string>("");
  const [position, setPosition] = useState<number>();
  // const [device_id, setDevice_id] = useState<number>();
  const [viewType, setViewType] = useState<"device" | "target">("device");

  useEffect(() => {
    window.electron.ipcRenderer.on("modbusSetting", data => {
      setViewType(data.viewType);
      if (data.viewType === "device") {
        setId(data.id);
        setIpAddress(data.ipAddress);
        setName(data.name);
        setPort(data.port);
        setStart(data.start);
        setlength(data.length);
        setType(data.type);
        setDelay(data.delay);
        setTargetName(data.targetName);
      } else if (data.viewType === "target") {
        setId(data.id);
        setName(data.name);
        setPosition(data.position);
        // setDevice_id(data.device_id);
      }
    });
  }, []);

  const addFn = () => {
    if (id === undefined || port === undefined || start === undefined || length === undefined || type === undefined || delay === undefined) {
      return;
    }
    const device: generateDeviceOption = {
      ipAddress,
      name,
      port,
      start,
      length,
      type,
      delay,
      targetName
    };
    window.electron.ipcRenderer.sendMessage("addModbusDevice", device);
  };

  const deleteFn = () => {
    window.electron.ipcRenderer.sendMessage("deleteModbus", id);
  };

  const updateDeviceFn = () => {
    if (id === undefined || port === undefined || start === undefined || length === undefined || type === undefined || delay === undefined) {
      return;
    }
    const device: generateDeviceOption & { id: number } = {
      id,
      ipAddress,
      name,
      port,
      start,
      length,
      type,
      delay,
      targetName
    };
    window.electron.ipcRenderer.sendMessage("updateModbusDevice", device);
  };
  const updateTargetFn = () => {
    if (id === undefined || position === undefined) {
      return;
    }
    const target: ITarget = {
      id,
      name,
      position
    };
    window.electron.ipcRenderer.sendMessage("updateModbusTarget", target);
  };
  return (
    <div>
      <div>ModbusEdit</div>
      {viewType === "device" ? (
        <div>
          <div>
            <div>ipAddress</div>
            <input value={ipAddress} onChange={e => setIpAddress(e.target.value)}></input>
          </div>
          <div>
            <div>name</div>
            <input value={name} onChange={e => setName(e.target.value)}></input>
          </div>
          <div>
            <div>port</div>
            <input value={port} type="number" onChange={e => setPort(parseInt(e.target.value))}></input>
          </div>
          <div>
            <div>start</div>
            <input value={start} type="number" onChange={e => setStart(parseInt(e.target.value))}></input>
          </div>
          <div>
            <div>length</div>
            <input value={length} type="number" onChange={e => setlength(parseInt(e.target.value))}></input>
          </div>
          <div>
            <div>type</div>
            <input value={type} type="number" onChange={e => setType(parseInt(e.target.value))}></input>
          </div>
          <div>
            <div>delay</div>
            <input value={delay} type="number" onChange={e => setDelay(parseInt(e.target.value))}></input>
          </div>
          <div>
            <div>targetName</div>
            <input disabled={id !== undefined} onChange={e => setTargetName(e.target.value)}></input>
          </div>
          {id ? (
            <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
              <div onClick={() => updateDeviceFn()}>수정</div>
              <div onClick={() => deleteFn()}>삭제</div>
            </div>
          ) : (
            <>
              <div onClick={() => addFn()}>추가</div>
            </>
          )}
        </div>
      ) : (
        <div>
          <div>
            <div>name</div>
            <input value={name} onChange={e => setName(e.target.value)}></input>
          </div>
          <div>
            <div>position</div>
            <input disabled value={position} type="number" onChange={e => setPosition(parseInt(e.target.value))}></input>
          </div>
          <div onClick={() => updateTargetFn()}>수정</div>
        </div>
      )}
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
