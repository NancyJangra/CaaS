import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader } from '../ui/primitives';
import { IconTarget } from '../ui/Icons';
import { useChartTheme, ChartLegend, ChartDataTable } from './chartTheme';

const fmt = (n) => new Intl.NumberFormat().format(n ?? 0);

/**
 * Hits vs misses for the selected range: a donut of the real summary counts,
 * the two totals, a plain-language note computed from those counts, and the
 * per-bucket breakdown as a data table.
 */
export default function HitsMissesChart({ series = [], hits = 0, misses = 0, hitRate = 0 }) {
  const theme = useChartTheme();
  const total = hits + misses;
  const rows = series.map((p) => ({
    timestamp: p.timestamp,
    hits: p.hits ?? 0,
    misses: p.misses ?? 0,
  }));
  const pie = [
    { name: 'Hits', value: hits, color: theme.hit },
    { name: 'Misses', value: misses, color: theme.miss },
  ];

  return (
    <Card aria-labelledby="hits-chart-title" className="flex h-full flex-col">
      <CardHeader titleId="hits-chart-title" title="Hits and misses" description="How cache reads resolved in this range." />
      <div className="mt-3">
        <ChartLegend
          items={[
            { label: 'Hits', color: theme.hit },
            { label: 'Misses', color: theme.miss },
          ]}
        />
      </div>

      {total === 0 ? (
        <div className="mt-4 flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-fg-muted">
          <IconTarget className="h-5 w-5 text-fg-subtle" />
          No cache reads in this range.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div
            className="relative mx-auto h-48 w-48"
            role="img"
            aria-label={`Donut chart: ${fmt(hits)} hits and ${fmt(misses)} misses, a ${hitRate}% hit rate.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pie}
                  dataKey="value"
                  innerRadius="72%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={total > 0 && hits > 0 && misses > 0 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {pie.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
              <p className="text-[28px] font-bold leading-none text-fg">
                {hitRate}
                <span className="text-[20px]">%</span>
              </p>
              <p className="mt-1 text-xs text-fg-muted">Hit rate</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
            <div className="rounded-xl bg-surface-2 px-4 py-3">
              <dt className="flex items-center gap-2 text-[13px] text-fg-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: theme.hit }} aria-hidden />
                Hits
              </dt>
              <dd className="mt-0.5 text-xl font-bold text-fg">{fmt(hits)}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 px-4 py-3">
              <dt className="flex items-center gap-2 text-[13px] text-fg-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: theme.miss }} aria-hidden />
                Misses
              </dt>
              <dd className="mt-0.5 text-xl font-bold text-fg">{fmt(misses)}</dd>
            </div>
          </dl>
        </div>
      )}

      {total > 0 && (
        <p className="mt-4 rounded-xl bg-cobalt-soft px-3.5 py-2.5 text-[13px] text-fg">
          {fmt(hits)} of {fmt(total)} reads in this range were served from the cache.
        </p>
      )}

      <ChartDataTable
        caption="Data table"
        columns={[
          { key: 'timestamp', label: 'Time (UTC)', mono: true },
          { key: 'hits', label: 'Hits' },
          { key: 'misses', label: 'Misses' },
        ]}
        rows={rows}
      />
    </Card>
  );
}
