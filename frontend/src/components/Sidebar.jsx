import { Activity, BarChart3, Clock3, Globe2, Leaf, Network, Shapes } from "lucide-react";

const ITEMS = [
  { key: "overview", label: "Vue générale", icon: Globe2 },
  { key: "descriptive", label: "Analyse descriptive", icon: BarChart3 },
  { key: "correlations", label: "Corrélations", icon: Network },
  { key: "pca", label: "ACP", icon: Shapes },
  { key: "clustering", label: "Clustering", icon: Activity },
  { key: "timeseries", label: "Série temporelle", icon: Clock3 },
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-sidebar text-white p-5 flex flex-col z-20">
      <div className="flex items-center gap-3 mb-8">
        <Leaf className="text-good" size={30} />
        <div>
          <p className="font-display text-xl">AirSénégal</p>
          <p className="text-xs text-slate-300">Qualité de l'air au sénégal</p>
        </div>
      </div>

      <nav className="space-y-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`w-full text-left flex items-center gap-3 py-3 px-3 rounded-lg transition border-l-4 ${
                isActive
                  ? "bg-secondary border-good"
                  : "bg-transparent border-transparent hover:bg-primary"
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* <div className="mt-auto text-xs text-slate-400">v1.0 - EPT 2025-2026</div> */}
    </aside>
  );
}
