export default function ProgressBar({ value }) {
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${Math.min(value || 0, 100)}%` }} />
    </div>
  );
}
