import React from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ScatterChartComponent from "../components/charts/ScatterChartComponent";
import { api } from "../api";

const Spinner = () => <div className="py-16 text-center text-slate-500">Chargement...</div>;

const colorScale = (v) => {
  const t = (v + 1) / 2;
  const r = Math.round(32 + (220 - 32) * t);
  const g = Math.round(56 + (255 - 56) * (1 - Math.abs(v)));
  const b = Math.round(173 + (32 - 173) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

export default function Correlations() {
  const matrixQuery = useQuery({ queryKey: ["corrMatrix"], queryFn: api.corrMatrix });
  const pmQuery = useQuery({ queryKey: ["corrPm"], queryFn: api.corrWithPm25 });

  const scatterQueries = useQueries({
    queries: [
      { queryKey: ["scatter", "PM10", "PM25"], queryFn: () => api.corrScatter("PM10", "PM25") },
      { queryKey: ["scatter", "Temperature", "PM25"], queryFn: () => api.corrScatter("Temperature", "PM25") },
      { queryKey: ["scatter", "Humidity", "PM25"], queryFn: () => api.corrScatter("Humidity", "PM25") },
      { queryKey: ["scatter", "TVOC", "PM25"], queryFn: () => api.corrScatter("TVOC", "PM25") },
    ],
  });

  if ([matrixQuery, pmQuery, ...scatterQueries].some((q) => q.isLoading)) return <Spinner />;

  const matrix = matrixQuery.data?.matrix || [];
  const vars = matrixQuery.data?.variables || [];
  const withPm = pmQuery.data?.correlations || [];

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h2 className="text-2xl font-display font-bold text-primary">Analyse des corrélations</h2>
        <p className="text-slate-600 mt-2">Corrélations de Spearman entre les polluants et les variables environnementales. Toutes les corrélations sont significatives (p &lt; 0.001).</p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100 overflow-x-auto">
        <h3 className="font-display text-lg mb-3">Matrice de corrélation</h3>
        <div className="grid" style={{ gridTemplateColumns: `140px repeat(${vars.length}, 1fr)` }}>
          <div />
          {vars.map((v) => <div key={v} className="text-xs font-bold text-center py-2">{v}</div>)}
          {matrix.map((row, i) => (
            <React.Fragment key={`r-${i}`}>
              <div key={`row-${i}`} className="text-xs font-bold pr-2 py-2">{vars[i]}</div>
              {row.map((cell, j) => (
                <div key={`${i}-${j}`} className="h-11 text-xs flex items-center justify-center border border-white" style={{ background: colorScale(cell), color: "#0f172a" }}>
                  {Number(cell).toFixed(2)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
        <p className="text-sm text-slate-600 mt-3">
          Plus la cellule est rouge, plus l'association est positive; plus elle est bleue, plus l'association est négative. Les valeurs proches de 0 indiquent une relation faible.
        </p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Corrélations avec PM2.5</h3>
        <ResponsiveContainer width="100%" height={330}>
          <BarChart data={withPm} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="variable" type="category" width={140} />
            <Tooltip />
            <Bar dataKey="r">
              {withPm.map((d, i) => <Cell key={i} fill={d.r >= 0 ? "#E74C3C" : "#3498DB"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-slate-600 mt-2">Les associations les plus fortes concernent PM10, PM1 et le comptage particulaire, confirmant une cohérence des indicateurs de particules fines.</p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {scatterQueries.map((q, idx) => (
          <div key={idx} className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
            <h3 className="font-display text-base mb-2">{q.data?.x_label} vs {q.data?.y_label} | r={q.data?.r} p={q.data?.p_value}</h3>
            <ScatterChartComponent data={q.data?.points || []} color={["#E74C3C", "#3498DB", "#27AE60", "#F39C12"][idx]} />
            <p className="text-sm text-slate-600 mt-2">
              Interprétation: la pente globale des nuages et le coefficient r indiquent le sens et l'intensité de la liaison entre PM2.5 et la variable comparée.
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
