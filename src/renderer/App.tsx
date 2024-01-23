import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { useEffect, useState } from 'react';
import _ from 'lodash';

const Hello = () => {
  const [ports, setPorts] = useState<string[]>([]);
  const [port, setPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [start, setStart] = useState<number>(0);
  const [readLen, setReadLen] = useState<number>(1);
  const [id, setId] = useState<number>(1);
  const [fileName, setFileName] = useState<string>('');
  const [functionCode, setFunctionCode] = useState<number>(3);
  const [devices, setDevices] = useState<IDevice[]>([]);
  useEffect(() => {
    console.log('hello');
    const getPortEvent = window.electron.ipcRenderer.on('getPorts', (data) => {
      setPorts(data);
      console.log('data', data);
    });
    const getData = window.electron.ipcRenderer.on('data', (data) => {
      console.log(data);
    });
    const updateDevice = window.electron.ipcRenderer.on(
      'updateDevices',
      updateDeviceFn
    );
    window.electron.ipcRenderer.sendMessage('getPorts', '');
    return () => {
      if (getPortEvent) getPortEvent();
      if (getData) getData();
      if (updateDevice) updateDevice();
    };
  }, []);

  const updateDeviceFn = (newDevices: IDevice[]) => {
    if (JSON.stringify(devices) !== JSON.stringify(newDevices)) {
      setDevices(newDevices);
    }
  };

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('updateRead', devices);
  }, [devices]);

  const addDevices = () => {
    if (port === '' || fileName === '') return;
    const deviceOption = { baudRate };
    setDevices((prev) => {
      const prevDeviceIndex = _.findIndex(prev, { id: port });
      if (prevDeviceIndex >= 0) {
        const oldDevice = prev[prevDeviceIndex];
        if (
          oldDevice.fileName !== fileName ||
          oldDevice.deviceOption !== deviceOption
        ) {
          return prev.map((device, index) =>
            prevDeviceIndex === index
              ? { ...device, fileName, deviceOption }
              : device
          );
        }
        return prev;
      } else {
        return [...prev, { id: port, fileName, deviceOption, options: [] }];
      }
    });
  };

  const deleteDevice = (device: IDevice) => {
    console.log(device);
    setDevices((prev) => {
      const prevDeviceIndex = _.findIndex(devices, { id: device.id });
      console.log(prevDeviceIndex);
      if (prevDeviceIndex >= 0) {
        prev.splice(prevDeviceIndex, 1);
        console.log(prev);
      }
      return prev.map((device, index) =>
        prevDeviceIndex === index ? { ...device, options: [] } : device
      );
    });
  };

  const addOption = () => {
    if (port === '' || fileName === '') return;
    const deviceOption = { baudRate };
    const options: IReadOption = {
      port,
      functionCode,
      start,
      readLen,
      id,
      isRun: false,
    };
    setDevices((prev) => {
      const prevDeviceIndex = _.findIndex(prev, {
        id: port,
        fileName,
        deviceOption,
      });
      if (prevDeviceIndex >= 0) {
        const oldOptions = prev[prevDeviceIndex].options;
        if (!_.find(oldOptions, { id, start, readLen, functionCode })) {
          const newOptions = [...oldOptions, options];
          return prev.map((device, index) =>
            prevDeviceIndex === index
              ? { ...device, options: newOptions }
              : device
          );
        }
        return prev;
      } else {
        return prev;
      }
    });
  };

  const deleteOption = (option: IReadOption) => {
    setDevices((prev) => {
      const prevDeviceIndex = _.findIndex(prev, { id: option.port });
      if (prevDeviceIndex >= 0) {
        const oldOptions = prev[prevDeviceIndex].options;
        const optionIndex = _.findIndex(oldOptions, {
          id: option.id,
          start: option.start,
          readLen: option.readLen,
        });
        if (optionIndex >= 0) {
          const newOptions = oldOptions;
          newOptions.splice(optionIndex, 1);
          // newOptions[optionIndex] = {
          //   ...newOptions[optionIndex],
          //   isRun: !newOptions[optionIndex].isRun,
          // };
          return prev.map((device, index) =>
            prevDeviceIndex === index
              ? { ...device, options: newOptions }
              : device
          );
        }
        return prev;
      } else {
        return prev;
      }
    });
  };

  const read = (option: IReadOption) => {
    setDevices((prev) => {
      const prevDeviceIndex = _.findIndex(prev, { id: option.port });
      if (prevDeviceIndex >= 0) {
        const oldOptions = prev[prevDeviceIndex].options;
        const optionIndex = _.findIndex(oldOptions, {
          id: option.id,
          start: option.start,
          readLen: option.readLen,
        });
        if (optionIndex >= 0) {
          const newOptions = oldOptions;
          newOptions[optionIndex] = {
            ...newOptions[optionIndex],
            isRun: !newOptions[optionIndex].isRun,
          };
          return prev.map((device, index) =>
            prevDeviceIndex === index
              ? { ...device, options: newOptions }
              : device
          );
        }
        return prev;
      } else {
        return prev;
      }
    });
  };
  return (
    <div className="page-container">
      <section
        style={{
          alignSelf: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div>
          <div>포트</div>
          <select onChange={(e) => setPort(e.target.value)}>
            <option value=""></option>
            {ports.map((port) => (
              <option value={port}>{port}</option>
            ))}
          </select>
        </div>
        <div>
          <div>BaudRate</div>
          <select onChange={(e) => setBaudRate(parseInt(e.target.value))}>
            <option value={9600}>9600</option>
            <option value={14400}>14400</option>
            <option value={19200}>19200</option>
            <option value={38400}>38400</option>
            <option value={57600}>57600</option>
            <option value={115200}>115200</option>
            <option value={128000}>128000</option>
          </select>
        </div>
        <div>
          <div>로그파일명</div>
          <input
            defaultValue={''}
            onChange={(e) => setFileName(e.target.value)}
          />
        </div>
        <div>
          <button onClick={addDevices}>추가</button>
        </div>
      </section>
      <section
        style={{
          alignSelf: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div>
          <div>함수</div>
          <select
            defaultValue={functionCode}
            onChange={(e) => setFunctionCode(parseInt(e.target.value))}
          >
            <option value={1}>Read Coil(FC1)</option>
            <option value={2}>Read Input Coil(FC2)</option>
            <option value={3}>Read Holiding Registers(FC3)</option>
            <option value={4}>Read Input Registers(FC4)</option>
          </select>
        </div>
        <div>
          <div>id</div>
          <input
            type="number"
            defaultValue={1}
            onChange={(e) => setId(parseInt(e.target.value))}
          />
        </div>
        <div>
          <div>시작주소</div>
          <input
            type="number"
            defaultValue={0}
            onChange={(e) => setStart(parseInt(e.target.value))}
          />
        </div>
        <div>
          <div>길이</div>
          <input
            type="number"
            defaultValue={1}
            onChange={(e) => setReadLen(parseInt(e.target.value))}
          />
        </div>
        <div>
          <button onClick={addOption}>추가</button>
        </div>
      </section>
      <section style={{ background: '#FFF', color: 'black' }}>
        <div>포트/로그파일명/baudRate</div>
        {devices.map((device) => (
          <div style={{ color: 'black' }} key={device.id}>
            <div
              onDoubleClick={() => {
                deleteDevice(device);
              }}
            >{`${device.id}/${device.fileName}/${device.deviceOption.baudRate}`}</div>
            <div>함수코드/ID/시작주소/길이</div>
            {device.options.map((option) => (
              <div
                key={`${option.functionCode}/${option.id}/${option.start}/${option.readLen}`}
                onClick={() => {
                  read(option);
                }}
                onDoubleClick={() => {
                  deleteOption(option);
                }}
              >{`${option.functionCode}/${option.id}/${option.start}/${
                option.readLen
              }/${option.isRun ? '정지' : '읽기'}`}</div>
            ))}
          </div>
        ))}
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
