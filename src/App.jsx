import { useEffect, useState } from "react";
import "./App.css";
import { useStatus } from "./hooks/useStatus";
import Panel from "./components/Panel";
import Stat from "./components/Stat";

const WEBUI_URL = "http://192.168.1.29:8080";

function formatGB(mb) {
  if (mb === null || mb === undefined) return "--";
  return (mb / 1024).toFixed(1);
}

function percentFromString(value) {
  if (!value) return 0;
  return Number(String(value).replace("%", "")) || 0;
}

function Service({ name, good }) {
  return (
    <div className="service">
      <span className={good ? "led green" : "led red"} />
      <span>{name}</span>
      <strong>{good ? "OK" : "DOWN"}</strong>
    </div>
  );
}

function App() {
  const status = useStatus();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const gpu = status?.gpu || {};
  const cpu = status?.cpu || {};
  const ram = status?.ram || {};
  const disk = status?.disk || {};

  const online = status?.ollama === "running";
  const ramPercent = ram.used && ram.total ? Math.round((ram.used / ram.total) * 100) : 0;
  const vramPercent = gpu.vramUsed && gpu.vramTotal ? Math.round((gpu.vramUsed / gpu.vramTotal) * 100) : 0;
  const diskPercent = percentFromString(disk.percent);

  const loadedModel = status?.model || "No active model";
  const aiState = loadedModel !== "No active model" ? "Model Loaded" : "Idle";

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="brand">JARVIS</div>
          <div className="subtitle">AI PC COMMAND CENTER</div>
        </div>

        <div className="header-right">
          <div className={online ? "state online" : "state offline"}>
            <span />
            {online ? "ONLINE" : "OFFLINE"}
          </div>
          <div className="clock">
            {time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>
      </header>

      <main className="dashboard">
        <div className="left-stack">
          <Panel title="GPU">
            <Stat label="Load" value={gpu.usage !== undefined && gpu.usage !== null ? `${gpu.usage}%` : "--"} sub={`${gpu.temp ?? "--"}°C`} bar={gpu.usage} />
            <Stat label="VRAM" value={`${formatGB(gpu.vramUsed)} / ${formatGB(gpu.vramTotal)} GB`} sub={`${vramPercent}% used`} bar={vramPercent} />
            <Stat label="Fan" value={gpu.fan !== undefined && gpu.fan !== null ? `${gpu.fan}%` : "--"} sub="zero-RPM normal at idle" />
          </Panel>

          <Panel title="SYSTEM">
            <Stat label="CPU" value={cpu.usage !== undefined && cpu.usage !== null ? `${cpu.usage}%` : "--"} sub={`${cpu.temp ?? "--"}°C`} bar={cpu.usage} />
            <Stat label="RAM" value={`${formatGB(ram.used)} / ${formatGB(ram.total)} GB`} sub={`${ramPercent}% used`} bar={ramPercent} />
            <Stat label="SSD" value={`${disk.used || "--"} / ${disk.total || "--"}`} sub={disk.percent || "--"} bar={diskPercent} />
          </Panel>
        </div>

        <div className="right-area">
          <Panel title="AI" className="ai-panel">
            <div className="model-card">
              <span>LOADED MODEL</span>
              <strong>{loadedModel}</strong>
            </div>

            <div className="ai-grid">
              <div>
                <span>State</span>
                <strong>{aiState}</strong>
              </div>
              <div>
                <span>Ollama</span>
                <strong>{status?.ollama || "Unknown"}</strong>
              </div>
              <div>
                <span>Runtime</span>
                <strong>{status?.uptime || "--"}</strong>
              </div>
              <div>
                <span>Activity</span>
                <strong>{aiState === "Idle" ? "Waiting" : "Ready"}</strong>
              </div>
            </div>

            <button className="launch-button" onClick={() => (window.location.href = WEBUI_URL)}>
              ▶ OPEN JARVIS CHAT
            </button>
          </Panel>

          <Panel title="SERVICES" className="services-panel">
            <div className="services-grid">
              <Service name="Ollama" good={online} />
              <Service name="Open WebUI" good={true} />
              <Service name="Grafana" good={true} />
              <Service name="Status API" good={!!status} />
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}

export default App;
