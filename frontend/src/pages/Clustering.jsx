import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";

const Spinner = () => <div className="py-16 text-center text-slate-500">Chargement...</div>;
const ErrorBox = ({ message }) => (
  <div className="rounded-xl bg-red-50 text-red-700 border border-red-200 p-4">
    {message}
  </div>
);

export default function Clustering() {
  const elbowQuery = useQuery({ queryKey: ["clusterElbow"], queryFn: api.clusteringElbow });
  const profileQuery = useQuery({
    queryKey: ["clusterProfiles"],
    queryFn: api.clusteringProfiles,
    enabled: elbowQuery.isSuccess,
  });
  const scatterQuery = useQuery({
    queryKey: ["clusterScatter"],
    queryFn: () => api.clusteringScatter(5000),
    enabled: profileQuery.isSuccess,
  });

  if ([elbowQuery, profileQuery, scatterQuery].some((q) => q.isLoading)) return <Spinner />;
  if ([elbowQuery, profileQuery, scatterQuery].some((q) => q.isError)) {
    return <ErrorBox message="Impossible de charger les données de clustering. Vérifie que le backend est actif et recharge la page." />;
  }

  const elbow = elbowQuery.data?.data || [];
  const clusters = profileQuery.data?.clusters || [];
  const points = scatterQuery.data?.points || [];

  const donut = clusters.map((c) => ({ name: c.label, value: c.count, color: c.color }));

  const normalized = (() => {
    const metrics = ["pm25_mean", "co2_mean", "temp_mean", "humidity_mean", "tvoc_mean"];
    return metrics.flatMap((metric) => {
      const max = Math.max(...clusters.map((c) => c[metric] || 0), 1);
      return clusters.map((c) => ({ metric, cluster: c.label, value: (c[metric] || 0) / max, color: c.color }));
    });
  })();

  // Restructure scatter data with color per point
  const scatterWithColors = (points || []).map((p) => {
    const clusterInfo = clusters.find((c) => c.id === p.cluster);
    return { ...p, color: clusterInfo?.color || "#999" };
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h2 className="text-2xl font-display font-bold text-primary">Analyse de clustering - K-Means</h2>
        <p className="text-slate-600 mt-2">Regroupement des observations en profils homogènes de pollution. K=3 retenu pour l'interprétabilité environnementale.</p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Méthode du coude</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={elbow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis xAxisId={0} dataKey="k" />
            <YAxis yAxisId={0} />
            <YAxis yAxisId={1} orientation="right" />
            <Tooltip />
            {Number.isFinite(elbowQuery.data?.k_optimal) ? (
              <ReferenceLine xAxisId={0} yAxisId={0} x={elbowQuery.data?.k_optimal} stroke="#2ECC71" strokeWidth={2} />
            ) : null}
            <Line yAxisId={0} dataKey="inertia" stroke="#3498DB" strokeWidth={3} />
            <Line yAxisId={1} dataKey="silhouette" stroke="#E74C3C" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-slate-600 mt-3">
          L'inertie baisse mécaniquement avec K, alors que la silhouette mesure la séparation des groupes; un compromis lisible est retenu pour l'interprétation métier.
        </p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {clusters.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-5 shadow-soft border border-slate-100" style={{ borderTop: `4px solid ${c.color}` }}>
            <p className="font-display text-lg" style={{ color: c.color }}>{c.label}</p>
            <p className="text-sm text-slate-500">{c.count?.toLocaleString("fr-FR")} obs. ({c.pct}%)</p>
            <p className="mt-2">PM2.5: <strong>{c.pm25_mean}</strong></p>
            <p>CO2: <strong>{c.co2_mean}</strong></p>
            <p>Temp: <strong>{c.temp_mean}</strong></p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" outerRadius={125}>
                {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-sm text-slate-600 mt-3">
            Le donut montre le poids relatif de chaque profil de pollution dans l'ensemble des observations.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart data={scatterWithColors}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="pc1" />
              <YAxis type="number" dataKey="pc2" />
              <Tooltip />
              <Scatter name="Clusters" fill="#999">
                {scatterWithColors.map((p, i) => (
                  <Cell key={i} fill={p.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-sm text-slate-600 mt-3">
            Le nuage ACP coloré par cluster visualise la séparation réelle des profils et leurs zones de recouvrement.
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Profils normalisés</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={normalized}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value">
              {normalized.map((row, i) => <Cell key={i} fill={row.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-slate-600 mt-3">
          Ce graphique compare les signatures relatives des clusters variable par variable après normalisation.
        </p>
      </section>
    </div>
  );
}
