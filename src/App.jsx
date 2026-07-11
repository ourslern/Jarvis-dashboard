import { useEffect, useState } from "react";
import "./App.css";
import { useStatus } from "./hooks/useStatus";
import Sparkline from "./components/Sparkline";

const WEBUI_URL = "http://192.168.1.29:8080";
const MAX_HISTORY = 30;

function formatGB(mb) {
  if (mb === null || mb === undefined) return "--";
  return (mb / 1024).toFixed(1);
}

function appendHistory(history, value) {
  const number = Number(value);

  if (value === null || value === undefined || Number.isNaN(number)) {
    return history;
  }

  return [...history, number].slice(-MAX_HISTORY);
}

function Meter({ value }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100));

  return (
    <div className="meter">
      <div className="meter-fill" style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function Resource({
  label,
  value,
  secondary,
  percent,
  history,
  historyLabel,
}) {
  return (
    <div className="resource">
      <div className="resource-top">
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <b>{secondary}</b>
      </div>

      <Meter value={percent} />

      {history && (
        <div className="chart-area">
          <div className="chart-title">{historyLabel}</div>
          <Sparkline values={history} />
        </div>
      )}
    </div>
  );
}

function DetailCard({ icon, label, value }) {
  return (
    <div className="detail-card">
      <div className="detail-icon">{icon}</div>
      <div className="detail-text">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function OverviewRow({ icon, label, value, good = false }) {
  return (
    <div className="overview-row">
      <div className="row-icon">{icon}</div>
      <span>{label}</span>
      <strong className={good ? "good-text" : ""}>{value}</strong>
    </div>
  );
}

function ServiceRow({ name, good }) {
  return (
    <div className="service-row">
      <span className={good ? "service-led service-good" : "service-led service-bad"} />
      <span>{name}</span>
      <strong className={good ? "good-text" : "bad-text"}>
        {good ? "OK" : "DOWN"}
      </strong>
    </div>
  );
}

function App() {
  const status = useStatus();
  const [time, setTime] = useState(new Date());
  const [gpuHistory, setGpuHistory] = useState([]);
  const [cpuHistory, setCpuHistory] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!status) return;

    setGpuHistory((history) =>
      appendHistory(history, status?.gpu?.usage)
    );

    setCpuHistory((history) =>
      appendHistory(history, status?.cpu?.usage)
    );
  }, [status]);

  const gpu = status?.gpu || {};
  const cpu = status?.cpu || {};
  const ram = status?.ram || {};
  const jarvis = status?.jarvis || {};

  const online = status?.ollama === "running";

  const ramPercent =
    ram.used && ram.total
      ? Math.round((ram.used / ram.total) * 100)
      : 0;

  const vramPercent =
    gpu.vramUsed && gpu.vramTotal
      ? Math.round((gpu.vramUsed / gpu.vramTotal) * 100)
      : 0;

  const freeRam =
    ram.total && ram.used
      ? formatGB(ram.total - ram.used)
      : "--";

  const lastUpdated = jarvis.lastUpdated
    ? new Date(jarvis.lastUpdated).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "--";

  const activityLevel = jarvis.activityLevel || "idle";

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <div className="brand">JARVIS</div>
          <div className="subbrand">PRIVATE AI</div>
        </div>

        <div className={online ? "system-banner online" : "system-banner offline"}>
          <span className="banner-led" />
          <strong>{online ? "ONLINE" : "OFFLINE"}</strong>
          <small>{online ? "System Operational" : "System Unavailable"}</small>
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

      <main className="console-grid">
        <div className="left-column">
          <section className="panel resource-panel">
            <div className="panel-title">
              <span>▣</span>
              GPU
            </div>

            <Resource
              label="Load"
              value={gpu.usage !== null && gpu.usage !== undefined ? `${gpu.usage}%` : "--"}
              secondary={`${gpu.temp ?? "--"}°C`}
              percent={gpu.usage}
              history={gpuHistory}
              historyLabel="GPU LOAD — LAST 60 SECONDS"
            />

            <Resource
              label="VRAM"
              value={`${formatGB(gpu.vramUsed)} / ${formatGB(gpu.vramTotal)} GB`}
              secondary={`${vramPercent}%`}
              percent={vramPercent}
            />
          </section>

          <section className="panel resource-panel">
            <div className="panel-title">
              <span>▭</span>
              SYSTEM
            </div>

            <Resource
              label="CPU"
              value={cpu.usage !== null && cpu.usage !== undefined ? `${cpu.usage}%` : "--"}
              secondary={`${cpu.temp ?? "--"}°C`}
              percent={cpu.usage}
              history={cpuHistory}
              historyLabel="CPU LOAD — LAST 60 SECONDS"
            />

            <Resource
              label="RAM"
              value={`${formatGB(ram.used)} / ${formatGB(ram.total)} GB`}
              secondary={`${ramPercent}%`}
              percent={ramPercent}
            />
          </section>
        </div>

        <section className="panel activity-panel">
          <div className="panel-title activity-title">
            <span>⌁</span>
            CURRENT ACTIVITY
          </div>

          <div className={`activity-box activity-${activityLevel}`}>
            <div className="activity-state">
              <span className="activity-led" />
              {jarvis.state || "Idle"}
            </div>
            <div className="activity-message">
              {jarvis.activity || "Waiting"}
            </div>
          </div>

          <div className="detail-grid">
            <DetailCard
              icon="◇"
              label="MODEL"
              value={jarvis.loadedModel || "No active model"}
            />

            <DetailCard
              icon="⌁"
              label="STATUS"
              value={jarvis.state || "Idle"}
            />

            <DetailCard
              icon="◷"
              label="UPTIME"
              value={status?.uptime || "--"}
            />

            <DetailCard
              icon="◴"
              label="UPDATED"
              value={lastUpdated}
            />
          </div>

          <button
            className="launch-button"
            onClick={() => {
              window.location.href = WEBUI_URL;
            }}
          >
            ▣ &nbsp; OPEN JARVIS CHAT
          </button>
        </section>

        <div className="right-column">
          <section className="panel overview-panel">
            <div className="panel-title">
              <span>⊞</span>
              OVERVIEW
            </div>

            <div className="overview-list">
              <OverviewRow
                icon="◉"
                label="Ollama"
                value={online ? "Running" : "Offline"}
                good={online}
              />

              <OverviewRow
                icon="◇"
                label="Model"
                value={jarvis.loadedModel || "No active model"}
              />

              <OverviewRow
                icon="⌁"
                label="AI State"
                value={jarvis.state || "Idle"}
              />

              <OverviewRow
                icon="▤"
                label="RAM Available"
                value={`${freeRam} GB`}
              />
            </div>
          </section>

          <section className="panel services-panel">
            <div className="panel-title">
              <span>☷</span>
              SERVICES
            </div>

            <div className="services-list">
              <ServiceRow name="Ollama" good={online} />
              <ServiceRow name="Open WebUI" good={true} />
              <ServiceRow name="Grafana" good={true} />
              <ServiceRow name="Status API" good={Boolean(status)} />
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <span>JARVIS</span> Dashboard v2.0
      </footer>
    </div>
  );
}

export default App;
