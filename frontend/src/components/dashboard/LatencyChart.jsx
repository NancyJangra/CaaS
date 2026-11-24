import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader } from '../ui/primitives';
import { IconClock } from '../ui/Icons';
import {
  useChartTheme,
  formatTick,
  ChartTooltip,
  ChartLegend,
  ChartDataTable,
} from './chartTheme';

const NAMES = { hitLatencyMs: 'Hit latency', missLatencyMs: 'Miss latency' };
const fmtMs = (v) => `${Number(v).toFixed(2)} ms`;

export default function LatencyChart({ series = [], range = '24h' }) {
  const theme = useChartTheme();
  const data = series.map((p) => ({
    timestamp: p.timestamp,
    hitLatencyMs: p.hitLatencyMs ?? 0,
    missLatencyMs: p.missLatencyMs ?? 0,
  }));

  const hasActivity = data.some(
    (d) => (d.hitLatencyMs || 0) > 0 || (d.missLatencyMs || 0) > 0
  );

  return (
    <Card aria-labelledby="latency-chart-title" className="flex h-full flex-col">
      <CardHeader
        titleId="latency-chart-title"
        title="Cache performance"
        description="Average hit and miss latency per time bucket, in milliseconds."
      />
      <div className="mt-3">
        <ChartLegend
              items={[
                { label: 'Hit latency', color: theme.hit },
                { label: 'Miss latency', color: theme.miss, dashed: true },
              ]}
            />
      </div>
      <div
        className="mt-4 h-72 w-full"
        role="img"
        aria-label="Area chart of average hit and miss latency in milliseconds over time. A data table follows."
      >
        {!hasActivity ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-fg-muted">
            <IconClock className="h-5 w-5 text-fg-subtle" />
            No latency samples in this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="lat-hit-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.hit} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={theme.hit} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.grid} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v) => formatTick(v, range)}
                minTickGap={36}
                tick={{ fontSize: 11, fill: theme.axis }}
                tickLine={false}
                axisLine={{ stroke: theme.grid }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: theme.axis }}
                tickFormatter={(v) => `${+Number(v).toFixed(2)}`}
                width={44}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: theme.cursor, strokeWidth: 1 }}
                content={<ChartTooltip formatValue={fmtMs} names={NAMES} />}
              />
              <Area
                type="monotone"
                dataKey="hitLatencyMs"
                name="hitLatencyMs"
                stroke={theme.hit}
                strokeWidth={2}
                fill="url(#lat-hit-fill)"
                dot={false}
                activeDot={{ r: 5, stroke: theme.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="missLatencyMs"
                name="missLatencyMs"
                stroke={theme.miss}
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="transparent"
                dot={false}
                activeDot={{ r: 5, stroke: theme.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <ChartDataTable
        caption="Data table"
        columns={[
          { key: 'timestamp', label: 'Time (UTC)', mono: true },
          { key: 'hitLatencyMs', label: 'Hit ms' },
          { key: 'missLatencyMs', label: 'Miss ms' },
        ]}
        rows={data}
      />
    </Card>
  );
}
