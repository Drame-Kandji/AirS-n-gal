import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Factory, Gauge, MapPin } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, CartesianGrid, ReferenceLine } from "recharts";
import KpiCard from "../components/KpiCard";
import { api } from "../api";

const Spinner = () => <div className="py-16 text-center text-slate-500">Chargement...</div>;

const levelColor = (value) => {
  if (value > 35) return "#E74C3C";
  if (value > 15) return "#E67E22";
  return "#2ECC71";
};

export default function Overview() {
  const [region, setRegion] = useState("all");
  const [type, setType] = useState("all");

  const statsQuery = useQuery({ queryKey: ["overviewStats"], queryFn: api.overviewStats });
  const sitesQuery = useQuery({ queryKey: ["overviewSites"], queryFn: api.overviewSites });

  if (statsQuery.isLoading || sitesQuery.isLoading) return <Spinner />;

  const stats = statsQuery.data;
  const sites = sitesQuery.data || [];

  const top10 = sites.slice(0, 10).map((s) => ({ ...s, short: s.name.slice(0, 24) }));

  const indoorOutdoor = (() => {
    const indoor = sites.filter((s) => String(s.type).toLowerCase() === "indoor").length;
    const outdoor = sites.filter((s) => String(s.type).toLowerCase() === "outdoor").length;
    return [
      { name: "Indoor", value: indoor, color: "#2ECC71" },
      { name: "Outdoor", value: outdoor, color: "#E74C3C" },
    ];
  })();

  const regions = (() => {
    const list = [...new Set(sites.map((s) => s.name.split(",")[0].trim()).filter(Boolean))];
    return list.sort();
  })();

  const filtered = sites.filter((s) => {
    const regionOk = region === "all" || s.name.startsWith(region);
    const typeOk = type === "all" || String(s.type).toLowerCase() === type;
    return regionOk && typeOk;
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h2 className="text-2xl font-display font-bold text-primary">Vue générale - Qualité de l'air au Sénégal</h2>
        <p className="text-slate-600 mt-2">Ce tableau de bord synthétise les mesures issues de 56 capteurs environnementaux répartis au Sénégal. L'objectif est d'identifier les zones et périodes où les niveaux de pollution particulaire dépassent les recommandations OMS.</p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <KpiCard icon={<Database />} title="Total enregistrements" value={stats.total_records?.toLocaleString("fr-FR")} subtitle="mesures consolidées" level="good" />
        <KpiCard icon={<MapPin />} title="Sites de mesure" value={stats.total_sites} subtitle="réseau national" level="excellent" />
        <KpiCard icon={<Gauge />} title="PM2.5 moyen" value={`${stats.pm25_mean} µg/m³`} subtitle="moyenne nationale" level="critical" badge="1.2x seuil OMS" />
        <KpiCard icon={<Factory />} title="Sites > seuil OMS" value={`${stats.sites_above_oms} / ${stats.total_sites}`} subtitle={`${stats.pct_above_oms}% des mesures > 15`} level="bad" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
          <h3 className="font-display text-lg mb-3">Top 10 sites les plus pollués</h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={top10} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="short" type="category" width={160} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(2)} µg/m³`} />
              <ReferenceLine x={15} stroke="#E74C3C" strokeDasharray="5 5" />
              <Bar dataKey="pm25_mean">
                {top10.map((row, i) => (
                  <Cell key={i} fill={levelColor(row.pm25_mean)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-slate-600 mt-3">
            Lecture: les barres au-dessus de 15 µg/m³ franchissent le seuil OMS journalier PM2.5; les sites en rouge sont prioritaires pour les actions de réduction d'exposition.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
          <h3 className="font-display text-lg mb-3">Répartition Indoor / Outdoor</h3>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie data={indoorOutdoor} dataKey="value" nameKey="name" innerRadius={75} outerRadius={120} paddingAngle={4}>
                {indoorOutdoor.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            {indoorOutdoor.map((d) => (
              <div key={d.name} className="rounded bg-slate-50 p-2 flex justify-between">
                <span>{d.name}</span>
                <span className="font-bold">{((d.value / (stats.total_sites || 1)) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 mt-3">
            Lecture: cette répartition contextualise le risque selon le type d'environnement; une part Outdoor dominante indique une exposition plus marquée en espaces ouverts.
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <div className="flex flex-wrap gap-3 mb-4">
          <select className="border rounded px-3 py-2" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">Toutes les régions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex gap-2">
            {[
              { k: "all", t: "Tous" },
              { k: "indoor", t: "Indoor" },
              { k: "outdoor", t: "Outdoor" },
            ].map((b) => (
              <button key={b.k} onClick={() => setType(b.k)} className={`px-3 py-2 rounded ${type === b.k ? "bg-secondary text-white" : "bg-slate-100"}`}>
                {b.t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Site</th>
                <th>Région</th>
                <th>Type</th>
                <th>PM2.5 moy</th>
                <th>Statut OMS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="py-2">{s.name}</td>
                  <td>{s.name.split(",")[0]}</td>
                  <td>{s.type}</td>
                  <td>{s.pm25_mean}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.pm25_mean > 35 ? "bg-red-100 text-red-700" : s.pm25_mean > 15 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                      {s.oms_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-600 mt-3">
          Le tableau permet un filtrage opérationnel par région et type pour cibler rapidement les sites avec dépassement OMS.
        </p>
      </section>
    </div>
  );
}
