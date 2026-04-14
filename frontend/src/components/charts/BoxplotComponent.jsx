export default function BoxplotComponent({ stats, color = "#3498DB" }) {
  if (!stats) return null;

  const { min, q1, median, q3, max } = stats;
  const width = 460;
  const height = 120;
  const pad = 25;

  const values = [min, q1, median, q3, max].filter((v) => v !== null && v !== undefined);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const sx = (v) => pad + ((v - lo) / ((hi - lo) || 1)) * (width - pad * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28">
      <line x1={sx(min)} x2={sx(max)} y1="60" y2="60" stroke="#94a3b8" strokeWidth="2" />
      <line x1={sx(min)} x2={sx(min)} y1="45" y2="75" stroke="#64748b" />
      <line x1={sx(max)} x2={sx(max)} y1="45" y2="75" stroke="#64748b" />
      <rect x={sx(q1)} y="40" width={sx(q3) - sx(q1)} height="40" fill={color} opacity="0.35" stroke={color} />
      <line x1={sx(median)} x2={sx(median)} y1="40" y2="80" stroke={color} strokeWidth="3" />
      <text x={sx(min)} y="100" fontSize="10" textAnchor="middle">min</text>
      <text x={sx(median)} y="100" fontSize="10" textAnchor="middle">médiane</text>
      <text x={sx(max)} y="100" fontSize="10" textAnchor="middle">max</text>
    </svg>
  );
}
