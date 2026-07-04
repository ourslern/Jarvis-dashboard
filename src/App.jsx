import { useEffect, useState } from "react";
import "./App.css";
import { useStatus } from "./hooks/useStatus";
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

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
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
  const jarvis = status?.jarvis || {};

  const online = status?.ollama === "running";
  const ramPercent = ram.used && ram.total ? Math.round((ram.used / ram.total) * 100) : 0;
  const vramPercent = gpu.vramUsed && gpu.vramTotal ? Math.round((gpu.vramUsed / gpu.vramTotal) * 100) : 0;
  const diskPercent = percentFromString(disk.percent);

  const lastUpdated = jarvis.lastUpdated
    ? new Date(jarvis.lastUpdated).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "--";

  return (
    <div className="screen">
      <header className="topbar">
        <div className="identity">
          <div className="brand">JARVIS</div>
          <div className="subbrand">PRIVATE AI</div>
        </div>

        <div className={online ? "system-pill online" : "system-pill offline"}>
          <span />
          {online ? "ONLINE" : "OFFLINE"}
        </div>

        <div className="timebox">
          <div className="clock">
            {time.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </div>
          <div className="date">
            {time.toLocaleDateString([], {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </header>

      <main className="v1-grid">
        <section className="panel gpu-panel">
          <div className="panel-title">GPU</div>
          <Stat label="Load" value={gpu.usage !== undefined && gpu.usage !== null ? `${gpu.usage}%` : "--"} sub={`${gpu.temp ?? "--"}°C`} bar={gpu.usage} />
          <Stat label="VRAM" value={`${formatGB(gpu.vramUsed)} / ${formatGB(gpu.vramTotal)} GB`} sub={`${vramPercent}% used`} bar={vramPercent} />
          <Stat label="Fan" value={gpu.fan !== undefined && gpu.fan !== null ? `${gpu.fan}%` : "--"} sub="zero-RPM normal" />
        </section>

        <section className="panel hero-panel">
          <div className="hero-label">CURRENT ACTIVITY</div>
          <div className="hero-activity">{jarvis.activity || "Waiting"}</div>

          <div className="hero-details">
            <MiniStat label="Status" value={jarvis.state || "Idle"} />
            <MiniStat label="Model" value={jarvis.loadedModel || "No active model"} />
            <MiniStat label="Runtime" value={status?.uptime || "--"} />
            <MiniStat label="Updated" value={lastUpdated} />
          </div>

          <button className="launch-button" onClick={() => (window.location.href = WEBUI_URL)}>
            ▶ OPEN JARVIS CHAT
          </button>
        </section>

        <section className="panel system-panel">
          <div className="panel-title">SYSTEM</div>
          <Stat label="CPU" value={cpu.usage !== undefined && cpu.usage !== null ? `${cpu.usage}%` : "--"} sub={`${cpu.temp ?? "--"}°C`} bar={cpu.usage} />
          <Stat label="RAM" value={`${formatGB(ram.used)} / ${formatGB(ram.total)} GB`} sub={`${ramPercent}% used`} bar={ramPercent} />
          <Stat label="SSD" value={`${disk.used || "--"} / ${disk.total || "--"}`} sub={disk.percent || "--"} bar={diskPercent} />
        </section>

        <section className="panel services-panel">
          <div className="panel-title">SERVICES</div>
          <div className="services-grid">
            <Service name="Ollama" good={online} />
            <Service name="Open WebUI" good={true} />
            <Service name="Grafana" good={true} />
            <Service name="Status API" good={!!status} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
