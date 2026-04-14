import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import BoxplotComponent from "../components/charts/BoxplotComponent";
import { api } from "../api";

const Spinner = () => <div className="py-16 text-center text-slate-500">Chargement...</div>;

export default function Descriptive() {
  const [variable, setVariable] = useState("PM2.5 (μg/m³) corrected");

  const qualityQuery = useQuery({ queryKey: ["descQuality"], queryFn: api.descriptiveDataQuality });
  const statsQuery = useQuery({ queryKey: ["descStats"], queryFn: api.descriptiveStats });
  const distQuery = useQuery({ queryKey: ["descDist", variable], queryFn: () => api.descriptiveDistribution(variable, 50) });
  const topQuery = useQuery({ queryKey: ["descTop"], queryFn: api.descriptiveTop15 });
  const ioQuery = useQuery({ queryKey: ["descIndoorOutdoor"], queryFn: api.descriptiveIndoorOutdoor });
  const hourlyQuery = useQuery({ queryKey: ["descHourly"], queryFn: api.descriptiveHourly });
  const monthlyQuery = useQuery({ queryKey: ["descMonthly"], queryFn: api.descriptiveMonthly });

  if ([qualityQuery, statsQuery, distQuery, topQuery, ioQuery, hourlyQuery, monthlyQuery].some((q) => q.isLoading)) return <Spinner />;

  const variables = statsQuery.data?.variables || [];
  const bins = (distQuery.data?.bins || []).map((b) => ({ x: Number(((b.x_min + b.x_max) / 2).toFixed(2)), count: b.count }));

  const indoor = ioQuery.data?.indoor;
  const outdoor = ioQuery.data?.outdoor;
  const quality = qualityQuery.data;
  const indoorOutdoorBars = !indoor || !outdoor
    ? []
    : [
        { metric: "Moyenne", indoor: indoor.mean, outdoor: outdoor.mean },
        { metric: "Médiane", indoor: indoor.median, outdoor: outdoor.median },
        { metric: "P95", indoor: indoor.p95, outdoor: outdoor.p95 },
      ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h2 className="text-2xl font-display font-bold text-primary">Analyse descriptive</h2>
        <p className="text-slate-600 mt-2">Les statistiques descriptives résument les caractéristiques principales des polluants mesurés sur les 56 sites.</p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100 space-y-4">
        <h3 className="font-display text-lg">Qualité des données (brut vs nettoyé)</h3>
        <p className="text-sm text-slate-600">
          Cette section documente le prétraitement: taille des datasets, nombre de variables, valeurs manquantes,
          doublons et répartition des types de colonnes.
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[quality?.raw, quality?.clean].filter(Boolean).map((q) => (
            <div key={q.name} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <h4 className="font-semibold text-primary">{q.name}</h4>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <p>Lignes: <strong>{q.rows?.toLocaleString("fr-FR")}</strong></p>
                <p>Variables: <strong>{q.columns}</strong></p>
                <p>Colonnes numériques: <strong>{q.numeric_columns}</strong></p>
                <p>Colonnes catégorielles: <strong>{q.categorical_columns}</strong></p>
                <p>Valeurs manquantes: <strong>{q.missing_total?.toLocaleString("fr-FR")}</strong></p>
                <p>Doublons: <strong>{q.duplicate_rows?.toLocaleString("fr-FR")}</strong></p>
              </div>
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Colonnes les plus manquantes</p>
                <div className="max-h-44 overflow-auto text-sm">
                  {(q.top_missing || []).map((m) => (
                    <div key={m.column} className="flex justify-between py-0.5 border-b border-slate-200">
                      <span className="truncate pr-2">{m.column}</span>
                      <strong>{m.missing?.toLocaleString("fr-FR")}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100 overflow-x-auto">
        <h3 className="font-display text-lg mb-3">Statistiques descriptives</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2 text-left">Variable</th><th>Moy.</th><th>Médiane</th><th>Écart-type</th><th>Min</th><th>Max</th><th>Seuil OMS</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v, i) => (
              <tr key={i} className="border-b hover:bg-slate-50">
                <td className="py-2">{v.name}</td>
                <td>{v.mean}</td><td>{v.median}</td><td>{v.std}</td><td>{v.min}</td><td>{v.max}</td><td>{v.oms_threshold ?? "-"}</td>
                <td>
                  <span className={`text-xs px-2 py-1 rounded-full ${v.oms_threshold && v.mean > v.oms_threshold ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {v.oms_threshold && v.mean > v.oms_threshold ? "Au-dessus" : "Conforme"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-lg">Distributions</h3>
          <select className="border rounded px-3 py-2" value={variable} onChange={(e) => setVariable(e.target.value)}>
            {variables.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={bins}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <ReferenceLine x={distQuery.data?.median} stroke="#1f2937" strokeDasharray="4 4" />
            <ReferenceLine x={distQuery.data?.mean} stroke="#E67E22" strokeDasharray="4 4" />
            <ReferenceLine x={distQuery.data?.oms_threshold} stroke="#E74C3C" strokeDasharray="5 5" />
            <Bar dataKey="count" fill="#3498DB" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Top 15 sites</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={(topQuery.data?.sites || []).slice().reverse()} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={220} />
            <Tooltip />
            <ReferenceLine x={15} stroke="#E74C3C" strokeDasharray="5 5" />
            <ReferenceLine x={35} stroke="#E67E22" strokeDasharray="5 5" />
            <Bar dataKey="pm25_mean" fill="#E74C3C" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
          <h3 className="font-display text-lg">Indoor vs Outdoor</h3>
          <p className="mt-1 text-sm">Indoor: {ioQuery.data?.indoor?.mean} µg/m³ | Outdoor: {ioQuery.data?.outdoor?.mean} µg/m³</p>
          <BoxplotComponent stats={{ min: ioQuery.data?.indoor?.median, q1: ioQuery.data?.indoor?.median, median: ioQuery.data?.indoor?.mean, q3: ioQuery.data?.indoor?.p95, max: ioQuery.data?.indoor?.max }} color="#3498DB" />
          <BoxplotComponent stats={{ min: ioQuery.data?.outdoor?.median, q1: ioQuery.data?.outdoor?.median, median: ioQuery.data?.outdoor?.mean, q3: ioQuery.data?.outdoor?.p95, max: ioQuery.data?.outdoor?.max }} color="#E74C3C" />
        </div>

        <div className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={indoorOutdoorBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="indoor" fill="#3498DB" />
              <Bar dataKey="outdoor" fill="#E74C3C" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Profil journalier</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={hourlyQuery.data?.data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip formatter={(v) => `${v} µg/m³`} />
            <ReferenceLine y={15} stroke="#E74C3C" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="pm25" stroke="#E74C3C" fill="#E74C3C44" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Variation mensuelle</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyQuery.data?.data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(v) => `${v} µg/m³`} />
            <ReferenceLine y={15} stroke="#E74C3C" strokeDasharray="5 5" />
            <Bar dataKey="pm25">
              {(monthlyQuery.data?.data || []).map((d, i) => (
                <Cell key={i} fill={String(d.season).toLowerCase().includes("hiver") ? "#3498DB" : "#E74C3C"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
