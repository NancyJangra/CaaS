import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getStats, getItems } from '../api/client';
import KpiCard from '../components/dashboard/KpiCard';
import LatencyChart from '../components/dashboard/LatencyChart';
import HitsMissesChart from '../components/dashboard/HitsMissesChart';
import { formatTick } from '../components/dashboard/chartTheme';
import { formatBytes } from '../components/items/format';
import { Card, CardHeader, Notice, ErrorState, Skeleton, LoadingRegion } from '../components/ui/primitives';
import { LiveStatus } from '../components/ui/feedback';
import {
  IconActivity,
  IconTarget,
  IconZap,
  IconDatabase,
  IconCalendar,
  IconSparkle,
  IconClock,
} from '../components/ui/Icons';

const RANGES = [
  { id: '1h', label: '1 hour' },
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '7 days' },
];

function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat().format(n);
}

function formatMs(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${Number(n).toFixed(2)} ms`;
}

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "ada.lovelace42@x.com" → "Ada" */
function firstName(email) {
  if (!email) return '';
  const local = email.split('@')[0].split(/[._\-+]/)[0].replace(/\d+/g, '');
  if (!local) return '';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading analytics…" className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-5">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Skeleton className="h-[360px] rounded-2xl xl:col-span-3" />
        <Skeleton className="h-[360px] rounded-2xl xl:col-span-2" />
      </div>
    </LoadingRegion>
  );
}

/** Real-data insight: the busiest bucket, plus reads per bucket as mini bars. */
function QuickInsights({ series, range }) {
  const reads = series.map((p) => ({ t: p.timestamp, n: (p.hits ?? 0) + (p.misses ?? 0) }));
  const recent = reads.slice(-14);
  const max = Math.max(1, ...recent.map((r) => r.n));
  const busiest = reads.reduce((best, r) => (r.n > (best?.n ?? 0) ? r : best), null);
  return (
    <Card aria-labelledby="insights-title" className="h-full">
      <CardHeader titleId="insights-title" title="Quick insights" />
      {busiest ? (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[22px] font-bold text-fg">
              <IconSparkle className="h-5 w-5 text-cobalt-fg" />
              {formatNumber(busiest.n)} reads
            </p>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              Busiest time bucket, starting {formatTick(busiest.t, range)}
            </p>
          </div>
          <div
            className="flex h-14 items-end gap-1.5"
            role="img"
            aria-label={`Cache reads in the last ${recent.length} time buckets`}
          >
            {recent.map((r) => (
              <span
                key={r.t}
                className="w-3 rounded-t-[4px] bg-cobalt"
                style={{ height: `${Math.max(6, (r.n / max) * 100)}%`, opacity: r.n ? 0.35 + 0.65 * (r.n / max) : 0.15 }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-fg-muted">Insights appear once your cache has some reads in this range.</p>
      )}
    </Card>
  );
}

/** Real data: the most recently stored keys from the items API. */
function RecentActivity({ visible }) {
  const q = useQuery({
    queryKey: ['items', { recent: true }],
    queryFn: () => getItems({ page: 1, limit: 4, sort: 'createdAt', order: 'desc' }),
    refetchInterval: visible ? 15000 : false,
    staleTime: 5000,
    retry: 0,
  });
  const items = q.data?.items || [];
  const dots = ['bg-cobalt', 'bg-orchid', 'bg-grass', 'bg-sunflower'];
  return (
    <Card aria-labelledby="activity-title" className="h-full">
      <CardHeader
        titleId="activity-title"
        title="Recent activity"
        actions={
          <Link to="/app/items" className="text-[13px] font-semibold text-brand-fg hover:underline">
            View all keys
          </Link>
        }
      />
      {q.isLoading && <p className="mt-3 text-[13px] text-fg-muted">Loading recent keys…</p>}
      {q.isError && <p className="mt-3 text-[13px] text-fg-muted">Couldn&apos;t load recent keys right now.</p>}
      {!q.isLoading && !q.isError && items.length === 0 && (
        <p className="mt-3 text-[13px] text-fg-muted">No keys stored yet. New PUTs will show up here.</p>
      )}
      {items.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {items.map((it, i) => (
            <li key={it.key} className="flex items-center gap-3 text-[13px]">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dots[i % dots.length]}`} aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-fg-muted">Stored </span>
                <span className="font-mono font-medium text-fg" title={it.key}>
                  {it.key}
                </span>
                <span className="text-fg-muted"> · {formatBytes(it.size)}</span>
              </span>
              <span className="shrink-0 text-xs text-fg-muted">{timeAgo(it.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState('24h');
  const [tabVisible, setTabVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const query = useQuery({
    queryKey: ['stats', range],
    queryFn: () => getStats(range),
    refetchInterval: tabVisible ? 8000 : false,
    refetchIntervalInBackground: false,
    staleTime: 4000,
    retry: 1,
    // Keep previous data while refetching / on error
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const summary = data?.summary;
  const series = useMemo(() => data?.series || [], [data]);
  const isInitialLoading = query.isLoading && !data;
  const isError = query.isError && !data;
  const isStaleError = query.isError && !!data;
  const lastUpdated = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt).toLocaleTimeString()
    : null;

  const emptyActivity =
    data &&
    (summary?.totalRequests ?? 0) === 0 &&
    (summary?.hits ?? 0) === 0 &&
    (summary?.misses ?? 0) === 0;

  // Sparklines from the real per-bucket series (only buckets that have reads).
  const sparks = useMemo(() => {
    const withReads = series.filter((p) => (p.hits ?? 0) + (p.misses ?? 0) > 0);
    return {
      hitRate: withReads.map((p) => ((p.hits ?? 0) / ((p.hits ?? 0) + (p.misses ?? 0))) * 100),
      latency: series.filter((p) => (p.hitLatencyMs ?? 0) > 0).map((p) => p.hitLatencyMs),
      reads: series.slice(-12).map((p) => (p.hits ?? 0) + (p.misses ?? 0)),
    };
  }, [series]);

  const name = firstName(user?.email);

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight text-fg sm:text-[28px]">
            {greeting()}
            {name ? `, ${name}` : ''}!{' '}
            <span role="img" aria-label="waving hand">
              👋
            </span>
          </h1>
          <p className="mt-1 text-[14px] text-fg-muted">
            Here&apos;s how your cache is performing
            {user?.email ? (
              <>
                {' '}for <span className="font-semibold text-fg">{user.email}</span>
              </>
            ) : null}
            .
          </p>
          <div className="mt-2.5">
            <LiveStatus
              isStaleError={isStaleError}
              isFetching={query.isFetching}
              tabVisible={tabVisible}
              intervalLabel="~8s"
              lastUpdated={lastUpdated}
            />
          </div>
        </div>
        <div
          className="inline-flex items-center gap-1 self-start rounded-xl border border-line bg-surface p-1 shadow-card lg:self-auto"
          role="group"
          aria-label="Time range"
        >
          <IconCalendar className="ml-2 mr-1 h-4 w-4 text-fg-muted" />
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              aria-pressed={range === r.id}
              className={`h-8 rounded-lg px-3 text-[13px] font-semibold transition-colors ${
                range === r.id ? 'bg-brand-solid text-white shadow-sm' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {isInitialLoading && <DashboardSkeleton />}

      {isError && (
        <ErrorState
          title="Could not load dashboard stats."
          message={query.error?.message || 'Network error'}
          onRetry={() => query.refetch()}
        />
      )}

      {isStaleError && (
        <Notice tone="warning" role="status" className="mb-4">
          Latest refresh failed. Showing the last successful snapshot
          {lastUpdated ? ` from ${lastUpdated}` : ''}.
        </Notice>
      )}

      {data && (
        <>
          {emptyActivity && (
            <Notice tone="info" className="mb-4">
              No admitted API requests or cache reads in this range yet. Make a few{' '}
              <code className="text-[13px] font-semibold">/v1/cache</code> calls with your API key and they will
              show up here within a few seconds.
            </Notice>
          )}

          <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total requests"
              color="cobalt"
              icon={IconActivity}
              value={formatNumber(summary?.totalRequests)}
              subtitle="Admitted public API calls"
              hint="GET, PUT and DELETE that passed the rate limiter."
            />
            <KpiCard
              title="Cache hit rate"
              color="orchid"
              icon={IconTarget}
              value={`${summary?.hitRate ?? 0}%`}
              spark={sparks.hitRate}
              sparkLabel="Hit rate per time bucket"
              subtitle="of reads found the key in Redis"
              hint="Hits divided by all reads."
            />
            <KpiCard
              title="Average response time"
              color="grass"
              icon={IconZap}
              value={formatMs(summary?.averageHitLatencyMs)}
              spark={sparks.latency}
              sparkLabel="Average hit latency per time bucket"
              subtitle="Average for cache hits"
              hint={`Misses ${formatMs(summary?.averageMissLatencyMs)}, p50 ${formatMs(summary?.p50LatencyMs)}, p95 ${formatMs(summary?.p95LatencyMs)}`}
            />
            <KpiCard
              title="Cache reads"
              color="sunflower"
              icon={IconDatabase}
              value={formatNumber((summary?.hits ?? 0) + (summary?.misses ?? 0))}
              spark={sparks.reads}
              sparkLabel="Cache reads per time bucket"
              subtitle={`${formatNumber(summary?.hits)} hits, ${formatNumber(summary?.misses)} misses`}
              hint="GET calls in the selected range."
            />
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-5">
            <div className="min-w-0 xl:col-span-3">
              <LatencyChart series={series} range={range} />
            </div>
            <div className="min-w-0 xl:col-span-2">
              <HitsMissesChart
                series={series}
                hits={summary?.hits ?? 0}
                misses={summary?.misses ?? 0}
                hitRate={summary?.hitRate ?? 0}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <QuickInsights series={series} range={range} />
            <RecentActivity visible={tabVisible} />
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-muted">
            <IconClock className="h-3.5 w-3.5" />
            Range: last {RANGES.find((r) => r.id === range)?.label}. Figures come from usage events recorded by the public API.
          </p>
        </>
      )}
    </div>
  );
}
