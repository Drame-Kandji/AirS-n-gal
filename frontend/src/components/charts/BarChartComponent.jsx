import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function BarChartComponent({ data, xKey, yKey, color = "#3498DB", colors }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey={yKey} fill={color}>
          {colors
            ? data.map((_, i) => <Cell key={`cell-${i}`} fill={colors[i] || color} />)
            : null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
