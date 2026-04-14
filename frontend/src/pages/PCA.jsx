import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, ScatterChart, Scatter, ZAxis } from "recharts";
import { api } from "../api";

const Spinner = () => <div className="py-16 text-center text-slate-500">Chargement...</div>;

export default function PCA() {
  const varianceQuery = useQuery({ queryKey: ["pcaVariance"], queryFn: api.pcaVariance });
  const loadingQuery = useQuery({ queryKey: ["pcaLoadings"], queryFn: api.pcaLoadings });
  const biplotQuery = useQuery({ queryKey: ["pcaBiplot"], queryFn: () => api.pcaBiplot(5000) });

  if ([varianceQuery, loadingQuery, biplotQuery].some((q) => q.isLoading)) return <Spinner />;

  const variance = varianceQuery.data?.components || [];
  const loadings = loadingQuery.data?.variables || [];
  const points = biplotQuery.data?.points || [];

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h2 className="text-2xl font-display font-bold text-primary">Analyse en Composantes Principales (ACP)</h2>
        <p className="text-slate-600 mt-2">L'ACP réduit les 9 variables en composantes indépendantes et révèle les axes de variation principaux.</p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
        <h3 className="font-display text-lg mb-3">Scree plot</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={variance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="pc" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <ReferenceLine yAxisId="right" y={80} stroke="#E74C3C" strokeDasharray="5 5" />
            <ReferenceLine yAxisId="right" y={90} stroke="#F39C12" strokeDasharray="5 5" />
            <Bar yAxisId="left" dataKey="variance" fill="#3498DB" />
            <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#E74C3C" strokeWidth={3} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-sm text-slate-600 mt-3">
          Le scree plot aide à choisir le nombre de composantes utiles: au-delà du coude, chaque composante supplémentaire apporte peu d'information.
        </p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
          <h3 className="font-display text-lg mb-3">Cercle des corrélations</h3>
          <svg viewBox="0 0 420 420" className="w-full max-w-[420px] mx-auto">
            <circle cx="210" cy="210" r="170" fill="none" stroke="#cbd5e1" />
            <line x1="40" y1="210" x2="380" y2="210" stroke="#94a3b8" />
            <line x1="210" y1="40" x2="210" y2="380" stroke="#94a3b8" />
            {loadings.map((v) => {
              const x = 210 + v.pc1 * 170;
              const y = 210 - v.pc2 * 170;
              return (
                <g key={v.name}>
                  <line x1="210" y1="210" x2={x} y2={y} stroke="#E74C3C" strokeWidth="2" />
                  <text x={x + 4} y={y - 4} fontSize="12" fill="#E74C3C">{v.name}</text>
                </g>
              );
            })}
          </svg>
          <p className="text-sm text-slate-500 mt-2">PC1: {loadingQuery.data?.pc1_variance}% | PC2: {loadingQuery.data?.pc2_variance}%</p>
          <p className="text-sm text-slate-600 mt-2">
            Les flèches proches indiquent des variables corrélées; des flèches opposées suggèrent des relations inverses.
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-soft border border-slate-100">
          <h3 className="font-display text-lg mb-3">Biplot (projection des individus)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart data={points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="pc1" name="PC1" />
              <YAxis type="number" dataKey="pc2" name="PC2" />
              <Tooltip formatter={(v, n) => `${n}: ${Number(v).toFixed(2)}`} />
              <Scatter name="Points" fill="#E74C3C" opacity={0.35} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-sm text-slate-600 mt-3">
            Ce plan factoriel projette les observations: les points les plus éloignés du centre représentent des profils atmosphériques plus atypiques.
          </p>
        </div>
      </section>
    </div>
  );
}
