import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import HeatmapComponent from "../components/charts/HeatmapComponent";
import { api } from "../api";

const Spinner = () => <div className="py-16 text-center text-slate-500">Chargement...</div>;

export default function TimeSeries() {
  const dailyQuery = useQuery({ queryKey: ["tsDaily"], queryFn: api.tsDaily });
  const decompQuery = useQuery({ queryKey: ["tsDecomp"], queryFn: api.tsDecomposition });
  const adfQuery = useQuery({ queryKey: ["tsAdf"], queryFn: api.tsAdf });
  const seasonQuery = useQuery({ queryKey: ["tsSeason"], queryFn: api.tsSeasonal });
  const heatQuery = useQuery({ queryKey: ["tsHeat"], queryFn: api.tsHeatmap });
  const top5Query = useQuery({ queryKey: ["tsTop5"], queryFn: api.tsTop5 });

  if ([dailyQuery, decompQuery, adfQuery, seasonQuery, heatQuery, top5Query].some((q) => q.isLoading)) return <Spinner />;

  const daily = dailyQuery.data?.data || [];
  const decomp = decompQuery.data?.series || [];
  const seasons = seasonQuery.data?.seasons || [];

  const seasonBars = seasons.map((s) => ({ season: s.name, mean: s.mean, median: s.median }));

  const top5Merged = (() => {
    const map = new Map();
    (top5Query.data?.sites || []).forEach((site) => {
      site.data.forEach((pt) => {
        if (!map.has(pt.date)) map.set(pt.date, { date: pt.date });
        map.get(pt.date)[site.name] = pt.pm25;
      });
    });
    return Array.from(map.values()).slice(-240);
  })();

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h2 className="text-2xl font-display font-bold text-primary">Analyse de série temporelle</h2>
        <p className="text-slate-600 mt-2">Évolution du PM2.5 de décembre 2024 à février 2026 avec analyse des tendances saisonnières et test de stationnarité.</p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Évolution journalière</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip />
            <ReferenceLine y={15} stroke="#E74C3C" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="pm25" stroke="#EC4899" fill="#EC489955" />
            <Line type="monotone" dataKey="ma7" stroke="#E67E22" dot={false} />
            <Line type="monotone" dataKey="ma30" stroke="#2C3E50" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-sm text-slate-600 mt-3">
          La courbe brute montre la variabilité quotidienne, tandis que les moyennes mobiles 7j et 30j révèlent la tendance de fond.
        </p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100 space-y-4">
        <h3 className="font-display text-lg">Décomposition</h3>
        {["observed", "trend", "seasonal", "residual"].map((key) => (
          <ResponsiveContainer key={key} width="100%" height={160}>
            <LineChart data={decomp}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={key} stroke={{ observed: "#2C3E50", trend: "#E74C3C", seasonal: "#3498DB", residual: "#94a3b8" }[key]} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ))}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded bg-slate-50">Tendance: min {decompQuery.data?.trend_stats?.min}, max {decompQuery.data?.trend_stats?.max}, moy {decompQuery.data?.trend_stats?.mean}</div>
          <div className="p-3 rounded bg-slate-50">Saisonnalité: amplitude {decompQuery.data?.seasonal_amplitude}</div>
          <div className="p-3 rounded bg-slate-50">Résidus: std {decompQuery.data?.residual_stats?.std}, max abs {decompQuery.data?.residual_stats?.max_abs}</div>
        </div>
        <p className="text-sm text-slate-600">
          La décomposition sépare clairement le signal global, la composante saisonnière périodique et les fluctuations résiduelles non expliquées.
        </p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg">Test ADF</h3>
        <p>Statistique ADF: <strong>{adfQuery.data?.adf_statistic}</strong></p>
        <p>P-value: <strong>{adfQuery.data?.p_value}</strong></p>
        <p className="font-semibold text-red-700">{adfQuery.data?.conclusion}</p>
        <p className="text-sm text-slate-600 mt-2">
          Une p-value supérieure à 0.05 indique une série non stationnaire, donc un niveau moyen qui évolue dans le temps.
        </p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Comparaison saisonnière</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={seasonBars}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="season" />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine y={15} stroke="#E74C3C" strokeDasharray="5 5" />
            <Bar dataKey="mean" fill="#E67E22" />
            <Bar dataKey="median" fill="#3498DB" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-slate-600 mt-3">
          La comparaison moyenne/médiane distingue l'effet des pics extrêmes entre hivernage et saison sèche.
        </p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Heatmap semaine</h3>
        <HeatmapComponent data={heatQuery.data?.data || []} days={heatQuery.data?.days || []} hours={heatQuery.data?.hours || []} />
        <p className="text-sm text-slate-600 mt-3">
          Cette carte met en évidence les créneaux horaires et jours les plus exposés, utiles pour cibler des mesures de prévention.
        </p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Top 5 sites</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={top5Merged}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip />
            <ReferenceLine y={15} stroke="#E74C3C" strokeDasharray="5 5" />
            {(top5Query.data?.sites || []).map((site) => (
              <Line key={site.name} type="monotone" dataKey={site.name} dot={false} stroke={site.color} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-slate-600 mt-3">
          La comparaison multi-sites permet d'identifier les localités les plus persistantes au-dessus du seuil OMS sur la durée.
        </p>
      </section>
    </div>
  );
}
