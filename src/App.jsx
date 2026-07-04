import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://192.168.1.29:5055/api/status";
const WEBUI_URL = "http://192.168.1.29:8080";

function formatGB(mb) {
  if (mb === null || mb === undefined) return "--";
  return (mb / 1024).toFixed(1);
}

function MetricCard({ title, value, detail, percent }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${percent || 0}%` }} />
      </div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

function ServiceRow({ name, good }) {
  return (
    <div className="service-row">
      <span className={good ? "service-dot good-dot" : "service-dot bad-dot"} />
      <span>{name}</span>
      <strong>{good ? "ONLINE" : "OFFLINE"}</strong>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error("Status fetch failed:", err);
      }
    }

    loadStatus();
    const timer = setInterval(loadStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  const gpu = status?.gpu || {};
  const cpu = status?.cpu || {};
  const ram = status?.ram || {};

  const ramPercent = ram.used && ram.total ? Math.round((ram.used / ram.total) * 100) : 0;
  const vramPercent = gpu.vramUsed && gpu.vramTotal ? Math.round((gpu.vramUsed / gpu.vramTotal) * 100) : 0;
  const online = status?.ollama === "running";

  return (
    <div className="screen">
      <header className="top">
        <div>
          <div className="brand">JARVIS</div>
          <div className="tagline">AI PC COMMAND CENTER</div>
        </div>

        <div className={online ? "system-state online" : "system-state offline"}>
          <span />
          {online ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
        </div>
      </header>

      <main className="layout">
        <section className="metrics">
          <MetricCard
            title="GPU LOAD"
            value={gpu.usage !== undefined && gpu.usage !== null ? `${gpu.usage}%` : "--"}
            detail={`RTX 3080 Ti · ${gpu.temp ?? "--"}°C`}
            percent={gpu.usage}
          />

          <MetricCard
            title="VRAM"
            value={`${formatGB(gpu.vramUsed)} / ${formatGB(gpu.vramTotal)} GB`}
            detail="GPU memory usage"
            percent={vramPercent}
          />

          <MetricCard
            title="CPU LOAD"
            value={cpu.usage !== undefined && cpu.usage !== null ? `${cpu.usage}%` : "--"}
            detail="AI PC processor"
            percent={cpu.usage}
          />

          <MetricCard
            title="SYSTEM RAM"
            value={`${formatGB(ram.used)} / ${formatGB(ram.total)} GB`}
            detail="Main memory usage"
            percent={ramPercent}
          />
        </section>

        <section className="main-card">
          <div className="panel-title">AI STATUS</div>

          <div className="model-box">
            <div className="label">ACTIVE MODEL</div>
            <strong>{status?.model || "No active model"}</strong>
          </div>

          <div className="status-grid">
            <div>
              <span>Ollama</span>
              <strong>{status?.ollama || "Unknown"}</strong>
            </div>
            <div>
              <span>Backend</span>
              <strong>CUDA</strong>
            </div>
            <div>
              <span>WebUI</span>
              <strong>8080</strong>
            </div>
            <div>
              <span>Grafana</span>
              <strong>3005</strong>
            </div>
          </div>

          <button className="open-button" onClick={() => (window.location.href = WEBUI_URL)}>
            OPEN JARVIS CHAT
          </button>
        </section>

        <section className="side-card">
          <div className="panel-title">SERVICES</div>

          <ServiceRow name="Ollama" good={online} />
          <ServiceRow name="Open WebUI" good={true} />
          <ServiceRow name="Grafana" good={true} />
          <ServiceRow name="Status API" good={!!status} />

          <div className="network-box">
            <div className="label">AI PC ADDRESS</div>
            <strong>192.168.1.29</strong>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
