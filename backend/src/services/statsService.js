/**
 * Dashboard analytics from usage_events + api_request_events.
 * All queries scoped by user_id. UTC timestamps.
 */
const db = require('../db');
const { AppError } = require('../utils/errors');

const RANGES = {
  '1h': { hours: 1, bucketMinutes: 5 },
  '24h': { hours: 24, bucketMinutes: 60 },
  '7d': { hours: 24 * 7, bucketMinutes: 360 }, // 6h buckets
};

function parseRange(range) {
  const r = RANGES[range];
  if (!r) {
    throw new AppError('INVALID_RANGE', 'range must be one of: 1h, 24h, 7d.', {
      status: 400,
      fix: 'Use ?range=1h, ?range=24h, or ?range=7d.',
    });
  }
  return r;
}

/**
 * Build zero-filled UTC buckets from start to now.
 */
function buildBuckets(hours, bucketMinutes) {
  const now = Date.now();
  const start = now - hours * 3600 * 1000;
  const bucketMs = bucketMinutes * 60 * 1000;
  // Align to bucket boundary
  const alignedStart = Math.floor(start / bucketMs) * bucketMs;
  const buckets = [];
  for (let t = alignedStart; t <= now; t += bucketMs) {
    buckets.push(new Date(t).toISOString());
  }
  return { buckets, startIso: new Date(alignedStart).toISOString(), bucketMinutes };
}

async function getStats(userId, rangeParam = '24h') {
  const { hours, bucketMinutes } = parseRange(rangeParam);
  const { buckets, startIso } = buildBuckets(hours, bucketMinutes);

  // Summary from usage_events (hit/miss) and api_request_events (total admitted)
  const summarySql = `
    WITH cache AS (
      SELECT
        COUNT(*) FILTER (WHERE outcome = 'hit')::int AS hits,
        COUNT(*) FILTER (WHERE outcome = 'miss')::int AS misses,
        COALESCE(AVG(latency_ms) FILTER (WHERE outcome = 'hit'), 0)::float AS avg_hit,
        COALESCE(AVG(latency_ms) FILTER (WHERE outcome = 'miss'), 0)::float AS avg_miss,
        COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p50,
        COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::float AS p95
      FROM usage_events
      WHERE user_id = $1 AND created_at >= $2::timestamptz
    ),
    api AS (
      SELECT COUNT(*)::int AS total_requests
      FROM api_request_events
      WHERE user_id = $1 AND created_at >= $2::timestamptz AND admitted = true
    )
    SELECT * FROM cache, api
  `;
  const { rows: summaryRows } = await db.query(summarySql, [userId, startIso]);
  const s = summaryRows[0] || {};
  const hits = s.hits || 0;
  const misses = s.misses || 0;
  const denom = hits + misses;
  const hitRate = denom === 0 ? 0 : Math.round((hits / denom) * 10000) / 100;

  // Time series: hit/miss counts and avg latencies per bucket
  const seriesSql = `
    SELECT
      to_timestamp(floor(extract(epoch from created_at) / ($3 * 60)) * ($3 * 60)) AT TIME ZONE 'UTC' AS bucket,
      COUNT(*) FILTER (WHERE outcome = 'hit')::int AS hits,
      COUNT(*) FILTER (WHERE outcome = 'miss')::int AS misses,
      COALESCE(AVG(latency_ms) FILTER (WHERE outcome = 'hit'), 0)::float AS hit_latency,
      COALESCE(AVG(latency_ms) FILTER (WHERE outcome = 'miss'), 0)::float AS miss_latency
    FROM usage_events
    WHERE user_id = $1 AND created_at >= $2::timestamptz
    GROUP BY 1
    ORDER BY 1
  `;
  const { rows: seriesRows } = await db.query(seriesSql, [
    userId,
    startIso,
    bucketMinutes,
  ]);

  const byBucket = new Map();
  for (const row of seriesRows) {
    const key = new Date(row.bucket).toISOString();
    byBucket.set(key, {
      timestamp: key,
      hits: row.hits,
      misses: row.misses,
      hitLatencyMs: Math.round(row.hit_latency * 100) / 100,
      missLatencyMs: Math.round(row.miss_latency * 100) / 100,
    });
  }

  const series = buckets.map((ts) => {
    const existing = byBucket.get(ts);
    if (existing) return existing;
    return {
      timestamp: ts,
      hits: 0,
      misses: 0,
      hitLatencyMs: 0,
      missLatencyMs: 0,
    };
  });

  return {
    success: true,
    range: rangeParam,
    summary: {
      totalRequests: s.total_requests || 0,
      hits,
      misses,
      hitRate,
      averageHitLatencyMs: Math.round((s.avg_hit || 0) * 100) / 100,
      averageMissLatencyMs: Math.round((s.avg_miss || 0) * 100) / 100,
      p50LatencyMs: Math.round((s.p50 || 0) * 100) / 100,
      p95LatencyMs: Math.round((s.p95 || 0) * 100) / 100,
    },
    series,
  };
}

module.exports = { getStats, RANGES };
