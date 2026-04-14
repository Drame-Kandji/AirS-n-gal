export default function KpiCard({ icon, title, value, subtitle, level = "moderate", badge }) {
  const levelColor = {
    excellent: "bg-excellent",
    good: "bg-good",
    moderate: "bg-moderate",
    bad: "bg-bad",
    critical: "bg-critical",
  }[level];

  return (
    <div className="rounded-xl bg-card p-5 shadow-soft border border-slate-100">
      <div className="flex items-center justify-between">
        <div className="text-secondary">{icon}</div>
        {badge ? <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">{badge}</span> : null}
      </div>
      <p className="mt-3 text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-display font-bold text-primary">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      <div className={`mt-4 h-1.5 rounded-full ${levelColor}`} />
    </div>
  );
}
