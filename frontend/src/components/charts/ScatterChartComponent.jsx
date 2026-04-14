import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

export default function ScatterChartComponent({ data, xKey = "x", yKey = "y", color = "#3498DB", height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey={yKey} tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
        <Scatter name="Points" fill={color} opacity={0.55} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
