const levelColor = (value) => {
  if (value > 35) return "text-critical";
  if (value > 15) return "text-bad";
  if (value > 5) return "text-moderate";
  return "text-good";
};

export default function Header({ title, currentPm25 }) {
  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-display font-bold text-primary">{title}</h1>
      <div className="flex items-center gap-4">
        {/* <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulseSlow" />
          Données live
        </div>
        <div className="text-sm">
          PM2.5 actuel: <span className={`font-bold ${levelColor(currentPm25)}`}>{currentPm25 ?? "-"} µg/m³</span>
        </div> */}
      </div>
    </header>
  )
}
