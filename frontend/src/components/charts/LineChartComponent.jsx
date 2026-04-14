import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function LineChartComponent({ data, lines, xKey, yUnit = "", height = 320, threshold }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dce2ea" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(2)} ${yUnit}`} />
        {lines.map((line) => (
          <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={line.strokeWidth || 2} dot={false} />
        ))}
        {threshold !== undefined ? <Line dataKey={() => threshold} stroke="#E74C3C" strokeDasharray="5 5" dot={false} /> : null}
      </LineChart>
    </ResponsiveContainer>
  );
}
