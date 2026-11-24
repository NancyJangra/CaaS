import { useIsDark } from '../../hooks/useTheme';

/*
 * Chart palette (from the reference design): hits in blue, misses in purple.
 * Blue and purple sit close for some colour-vision deficiencies, so misses are
 * always dashed, every chart has a legend, and a data table is available.
 *   light: hit #3461F0 (5.1:1), miss #8B5CF6 (4.2:1) on #FFFFFF
 *   dark:  hit #6B8CFF (5.4:1), miss #C4B0FF (8.4:1) on #141B3F
 */
export function useChartTheme() {
  const dark = useIsDark();
  return dark
    ? {
        hit: '#6B8CFF',
        miss: '#C4B0FF',
        grid: '#262F60',
        axis: '#AAB4D6',
        cursor: '#343E74',
        surface: '#141B3F',
      }
    : {
        hit: '#3461F0',
        miss: '#8B5CF6',
        grid: '#EDF0F9',
        axis: '#5B6585',
        cursor: '#CFD6EC',
        surface: '#FFFFFF',
      };
}

export function formatTick(iso, range) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (range === '7d') {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });
  }
  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatFull(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Token-styled tooltip for Recharts (HTML, so theme vars apply). */
export function ChartTooltip({ active, payload, label, formatValue, names }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-[170px] rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-raised">
      <p className="mb-1.5 font-medium text-fg">{formatFull(label)}</p>
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
              {names[p.dataKey] || p.dataKey}
            </span>
            <span className="font-medium tabular-nums text-fg">{formatValue(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend rendered as HTML (text tokens + swatch), above the plot. */
export function ChartLegend({ items }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.dashed ? (
            <svg width="16" height="4" aria-hidden>
              <line x1="0" y1="2" x2="16" y2="2" stroke={i.color} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
          ) : (
            <span className="h-2 w-2 rounded-full" style={{ background: i.color }} aria-hidden />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Accessible data-table alternative for a chart. */
export function ChartDataTable({ caption, columns, rows }) {
  return (
    <details className="group mt-4 border-t border-line pt-3 text-xs">
      <summary className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-[13px] text-fg-muted underline-offset-2 hover:text-fg hover:underline">
        <span className="group-open:hidden">Show</span>
        <span className="hidden group-open:inline">Hide</span>
        <span>{caption.charAt(0).toLowerCase() + caption.slice(1)}</span>
      </summary>
      <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-line">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-1.5 font-medium text-fg-muted">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.timestamp} className="border-t border-line">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-1.5 text-fg ${c.mono ? 'font-mono' : 'tabular-nums'}`}>
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
