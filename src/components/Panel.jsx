export default function Panel({ title, className = "", children }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-title">{title}</div>
      {children}
    </section>
  );
}
