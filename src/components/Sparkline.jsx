export default function Sparkline({ values = [] }) {
  if (values.length < 2) {
    return <div className="sparkline-empty">Collecting history...</div>;
  }

  const width = 240;
  const height = 42;
  const paddingX = 4;
  const paddingY = 5;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const points = values
    .map((value, index) => {
      const normalized = Math.max(0, Math.min(Number(value) || 0, 100));

      const x =
        paddingX +
        (index / Math.max(values.length - 1, 1)) * usableWidth;

      const y =
        paddingY +
        usableHeight -
        (normalized / 100) * usableHeight;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line className="chart-guide" x1="4" y1="6" x2="236" y2="6" />
      <line className="chart-guide" x1="4" y1="21" x2="236" y2="21" />
      <line className="chart-guide" x1="4" y1="36" x2="236" y2="36" />

      <polyline className="sparkline-line" points={points} />
    </svg>
  );
}
