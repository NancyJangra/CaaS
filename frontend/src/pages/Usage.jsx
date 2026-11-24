import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsage } from '../api/client';
import Button from '../components/ui/Button';
import {
  Badge,
  PageHeader,
  ProgressBar,
  Notice,
  ErrorState,
  Skeleton,
  LoadingRegion,
} from '../components/ui/primitives';
import { LiveStatus } from '../components/ui/feedback';
import { IconRefresh } from '../components/ui/Icons';

function clampPct(used, limit) {
  if (limit == null || limit <= 0) return 0;
  if (used == null || Number.isNaN(used)) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 1000) / 10));
}

function levelFromPct(pct) {
  if (pct >= 90) return 'critical';
  if (pct >= 70) return 'warn';
  return 'ok';
}

function formatResetMinute(unixSec) {
  if (unixSec == null || unixSec === '') return 'Unavailable';
  const n = typeof unixSec === 'number' ? unixSec : Number(unixSec);
  if (!Number.isFinite(n)) return 'Unavailable';
  // Heuristic: values > 1e12 are ms; backend sends seconds
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return 'Unavailable';
  return d.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatResetMonthly(iso) {
  if (!iso) return 'Unavailable';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unavailable';
  return (
    d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }) + ' (UTC calendar month)'
  );
}

const LEVEL_META = {
  ok: { badge: 'OK', tone: 'neutral', status: 'Within normal range.' },
  warn: {
    badge: 'Warning',
    tone: 'warning',
    status: 'Warning: more than 70% of this quota is used.',
  },
  critical: {
    badge: 'Critical',
    tone: 'danger',
    status: 'Critical: you are near or at this limit.',
  },
};

const ROW_ACCENT = { cobalt: 'border-l-cobalt', orchid: 'border-l-orchid', grass: 'border-l-grass' };

function QuotaCard({ accent = 'cobalt', title, used, limit, remaining, pct, level, resetLabel, resetCaption, hint }) {
  const meta = LEVEL_META[level] || LEVEL_META.ok;
  const headingId = `${title.replace(/\W+/g, '-').toLowerCase()}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={`grid grid-cols-1 gap-x-8 gap-y-3 border-l-4 px-5 py-5 ${ROW_ACCENT[accent]} lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 id={headingId} className="text-[16px] font-bold text-fg">
            {title}
          </h2>
          <Badge tone={meta.tone}>{meta.badge}</Badge>
        </div>
        {hint && <p className="mt-1 max-w-[46ch] text-[13px] text-fg-muted">{hint}</p>}
      </div>

      <div className="min-w-0">
        <p className="text-[28px] font-bold leading-none text-fg">
          {used != null ? used : '—'}
          <span className="text-[15px] font-medium text-fg-muted">
            {' '}
            / {limit != null ? limit : '—'}
          </span>
        </p>
        <ProgressBar className="mt-3" pct={pct} level={level} label={`${title} usage ${pct}%`} markers={[70, 90]} />
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[13px] text-fg">
            {remaining != null ? remaining : '—'} remaining, {pct}% used
          </p>
          <p
            className={`text-[13px] ${level === 'critical' ? 'text-danger-fg' : level === 'warn' ? 'text-warning-fg' : 'text-fg-muted'}`}
            role="status"
          >
            {meta.status}
          </p>
        </div>
      </div>

      <dl className="min-w-0 text-[13px]">
        <dt className="text-fg-muted">{resetCaption}</dt>
        <dd className="mt-0.5 text-fg">{resetLabel}</dd>
      </dl>
    </section>
  );
}

export default function Usage() {
  const [tabVisible, setTabVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const query = useQuery({
    queryKey: ['usage'],
    queryFn: getUsage,
    refetchInterval: tabVisible ? 9000 : false,
    refetchIntervalInBackground: false,
    staleTime: 4000,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const plan = data?.plan;
  const usage = data?.usage;
  const reset = data?.reset;

  const isInitialLoading = query.isLoading && !data;
  const isError = query.isError && !data;
  const isStaleError = query.isError && !!data;
  const lastUpdated = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt).toLocaleTimeString()
    : null;

  const minutePct = clampPct(usage?.minuteUsed, usage?.minuteLimit);
  const monthlyPct = clampPct(usage?.monthlyUsed, usage?.monthlyLimit);
  const itemsPct = clampPct(usage?.cachedItems, usage?.maxItems);

  const minuteLevel = levelFromPct(minutePct);
  const monthlyLevel = levelFromPct(monthlyPct);
  const itemsLevel = levelFromPct(itemsPct);

  return (
    <div>
      <PageHeader
        title="Usage & Limits"
        subtitle="Counted by the same Redis counters the rate limiter uses, so these numbers are what the API enforces."
        meta={
          <>
            {plan?.name && (
              <span className="text-[13px] text-fg-muted">
                Plan: <span className="font-medium capitalize text-fg">{plan.name}</span>
              </span>
            )}
            <LiveStatus
              isStaleError={isStaleError}
              isFetching={query.isFetching}
              tabVisible={tabVisible}
              intervalLabel="~9s"
              lastUpdated={lastUpdated}
            />
          </>
        }
        actions={
          <Button icon={IconRefresh} onClick={() => query.refetch()} loading={query.isFetching && !!data}>
            Refresh
          </Button>
        }
      />

      {isInitialLoading && (
        <LoadingRegion label="Loading usage…" className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </LoadingRegion>
      )}

      {isError && (
        <ErrorState
          title="Could not load usage data."
          message={query.error?.message || 'Network error'}
          onRetry={() => query.refetch()}
        />
      )}

      {isStaleError && (
        <Notice tone="warning" role="status" className="mb-4">
          Latest refresh failed. Showing the last successful snapshot.
        </Notice>
      )}

      {data && (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <QuotaCard
            title="Requests per minute"
            accent="cobalt"
            used={usage?.minuteUsed}
            limit={usage?.minuteLimit}
            remaining={
              usage?.minuteRemaining != null
                ? Math.max(0, usage.minuteRemaining)
                : null
            }
            pct={minutePct}
            level={minuteLevel}
            resetCaption="Window resets"
            resetLabel={formatResetMinute(reset?.minute)}
            hint="A sliding 60-second window. Rejected requests don't count."
          />
          <QuotaCard
            title="Monthly requests"
            accent="orchid"
            used={usage?.monthlyUsed}
            limit={usage?.monthlyLimit}
            remaining={
              usage?.monthlyRemaining != null
                ? Math.max(0, usage.monthlyRemaining)
                : null
            }
            pct={monthlyPct}
            level={monthlyLevel}
            resetCaption="Resets"
            resetLabel={formatResetMonthly(reset?.monthly)}
            hint="Admitted GET, PUT and DELETE calls on the public cache API this month."
          />
          <QuotaCard
            title="Cached item capacity"
            accent="grass"
            used={usage?.cachedItems}
            limit={usage?.maxItems}
            remaining={
              usage?.cachedItems != null && usage?.maxItems != null
                ? Math.max(0, usage.maxItems - usage.cachedItems)
                : null
            }
            pct={itemsPct}
            level={itemsLevel}
            resetCaption="Resets"
            resetLabel="Never. Capacity returns as keys expire or are deleted."
            hint="Live Redis entries for your account. At the limit, new keys get a 429; updating an existing key still works."
          />
        </div>
      )}

      {data && plan && (
        <section aria-labelledby="plan-limits-heading" className="mt-6">
          <h2 id="plan-limits-heading" className="text-[15px] font-semibold text-fg">
            Plan limits
          </h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-fg-muted">
            Each quota is judged on its own: under 70% is normal, 70 to 89% is a warning, 90% and above is critical.
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-2 text-[13px]">
            {[
              { label: 'Requests per minute', value: plan.requestsPerMinute },
              { label: 'Requests per month', value: plan.requestsPerMonth },
              { label: 'Cached items', value: plan.maxItems },
            ].map((l) => (
              <div key={l.label} className="flex items-baseline gap-2">
                <dt className="text-fg-muted">{l.label}</dt>
                <dd className="font-medium text-fg">
                  {l.value != null ? new Intl.NumberFormat().format(l.value) : '—'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
