import React from "react";

export default function HeatmapComponent({ data, days, hours }) {
  const lookup = new Map(data.map((d) => [`${d.day}-${d.hour}`, d.pm25]));
  const values = data.map((d) => d.pm25);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const color = (v) => {
    if (v === undefined || Number.isNaN(v)) return "#f1f5f9";
    const t = (v - min) / ((max - min) || 1);
    const r = Math.round(255 * t + 242 * (1 - t));
    const g = Math.round(77 * (1 - t) + 193 * t);
    const b = Math.round(79 * (1 - t) + 31 * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${hours.length}, minmax(32px, 1fr))` }}>
        <div />
        {hours.map((h) => (
          <div key={h} className="text-[10px] text-center text-slate-500">{h}</div>
        ))}
        {days.map((d) => (
          <React.Fragment key={d}>
            <div key={`${d}-label`} className="text-xs font-semibold pr-2 py-1">{d}</div>
            {hours.map((h) => {
              const v = lookup.get(`${d}-${h}`);
              return (
                <div
                  key={`${d}-${h}`}
                  title={`${d} ${h}h: ${v?.toFixed?.(2) ?? "NA"}`}
                  className="h-7 border border-white/70"
                  style={{ backgroundColor: color(v) }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
