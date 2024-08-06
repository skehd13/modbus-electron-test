import "./App.css";
import _ from "lodash";

const App = () => {
  return (
    <div className="page-container">
      <section style={{ background: "#FFF", color: "black", overflow: "scroll" }}>
        <div style={{ display: "flex", flexDirection: "row", width: "100%", justifyContent: "space-around" }}>
          <div
            className="borderBox"
            onClick={() => {
              window.electron.ipcRenderer.sendMessage("openBrowser", "modbusWindow");
            }}
          >
            MODBUS DAQ
          </div>
          <div
            className="borderBox"
            onClick={() => {
              window.electron.ipcRenderer.sendMessage("openBrowser", "bacnetWindow");
            }}
          >
            BACNET DAQ
          </div>
        </div>
      </section>
    </div>
  );
};

export default App;

// export default function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<Hello />} />
//       </Routes>
//     </Router>
//   );
// }
