import ProgressBar from "./ProgressBar";

export default function Stat({ label, value, sub, bar, compact = false }) {
  return (
    <div className={compact ? "stat compact-stat" : "stat"}>
      <div className="stat-row">
        <div>
          <span>{label}</span>
          {sub && <small>{sub}</small>}
        </div>
        <strong>{value}</strong>
      </div>
      {bar !== undefined && <ProgressBar value={bar} />}
    </div>
  );
}
