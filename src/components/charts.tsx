import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Chart palette — validated for CVD separation on white (dataviz validator).
 * Slot 1 has <3:1 contrast, so every chart ships a legend/tooltip and labels.
 */
export const CHART = { s1: '#C98A0A', s2: '#3F6FA8', s3: '#C2502A', grid: '#EDE4D7', axis: '#8C8174' };

const axisProps = {
  tick: { fill: CHART.axis, fontSize: 12 },
  axisLine: false,
  tickLine: false,
} as const;

interface Series {
  key: string;
  label: string;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  format,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string;
  series: Series[];
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] shadow-card">
      <p className="mb-1 font-semibold">{label}</p>
      {series.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key);
        if (!p) return null;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-ink-soft">{s.label}</span>
            <span className="tabular ml-auto pl-4 font-medium">{format(Number(p.value) || 0)}</span>
          </div>
        );
      })}
      {series.length > 1 && (
        <div className="mt-1 flex justify-between border-t border-line pt-1 text-ink-soft">
          <span>Tổng</span>
          <span className="tabular font-medium text-ink">{format(total)}</span>
        </div>
      )}
    </div>
  );
}

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-4 text-[13px] text-ink-soft">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** Columns over time; with several series they stack (they must sum to a whole). */
export function ColumnChart<T extends Record<string, string | number>>({
  data,
  x,
  series,
  format,
  axisFormat,
  height = 260,
}: {
  data: T[];
  x: keyof T & string;
  series: Series[];
  format: (v: number) => string;
  axisFormat: (v: number) => string;
  height?: number;
}) {
  const last = series.length - 1;
  return (
    <div className="space-y-3">
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={x as string} {...axisProps} dy={6} />
          <YAxis {...axisProps} width={56} tickFormatter={axisFormat} />
          <Tooltip cursor={{ fill: '#FAF4EB' }} content={<ChartTooltip series={series} format={format} />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={s.color}
              maxBarSize={24}
              // 2px surface gap between stacked segments; only the top segment gets the rounded data-end.
              stroke="#FFFFFF"
              strokeWidth={series.length > 1 ? 2 : 0}
              radius={i === last ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-series level over time: 2px line with a 10% wash. */
export function TrendChart<T extends Record<string, string | number>>({
  data,
  x,
  y,
  label,
  color = CHART.s1,
  format,
  height = 240,
}: {
  data: T[];
  x: keyof T & string;
  y: keyof T & string;
  label: string;
  color?: string;
  format: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey={x as string} {...axisProps} dy={6} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} width={40} allowDecimals={false} />
        <Tooltip cursor={{ stroke: CHART.axis, strokeWidth: 1 }} content={<ChartTooltip series={[{ key: y, label, color }]} format={format} />} />
        <Area
          type="monotone"
          dataKey={y as string}
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.1}
          activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2, fill: color }}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars for one measure across categories, value at the tip. */
export function BarList({ items, format, color = CHART.s1 }: { items: { label: string; value: number }[]; format: (v: number) => string; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[13px]" title={`${i.label}: ${format(i.value)}`}>
          <span className="truncate text-ink-soft">{i.label}</span>
          <div className="h-3 rounded-r bg-transparent">
            <div className="h-3 rounded-r" style={{ width: `${(i.value / max) * 100}%`, minWidth: i.value ? 4 : 0, background: color }} />
          </div>
          <span className="tabular w-16 text-right font-medium">{format(i.value)}</span>
        </div>
      ))}
    </div>
  );
}
