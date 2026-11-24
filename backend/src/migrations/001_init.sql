-- Phase 2 schema: users, api_keys, plans, usage_events, usage_hourly
-- Idempotent: safe to re-run

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Plans (seeded)
CREATE TABLE IF NOT EXISTS plans (
  name VARCHAR(50) PRIMARY KEY,
  requests_per_minute INTEGER NOT NULL,
  requests_per_month BIGINT NOT NULL,
  max_items INTEGER NOT NULL
);

INSERT INTO plans (name, requests_per_minute, requests_per_month, max_items)
VALUES ('free', 100, 10000, 1000)
ON CONFLICT (name) DO NOTHING;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free' REFERENCES plans(name),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- API keys (store hash only)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_prefix VARCHAR(32) NOT NULL,
  key_hash VARCHAR(64) NOT NULL,
  label VARCHAR(100) NOT NULL DEFAULT 'Default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);

-- Usage events (raw)
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cache_key VARCHAR(512) NOT NULL,
  outcome VARCHAR(10) NOT NULL CHECK (outcome IN ('hit', 'miss')),
  latency_ms NUMERIC(10, 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events (created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_created ON usage_events (user_id, created_at);

-- Hourly rollup (populated in later phase)
CREATE TABLE IF NOT EXISTS usage_hourly (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hour TIMESTAMPTZ NOT NULL,
  hits BIGINT NOT NULL DEFAULT 0,
  misses BIGINT NOT NULL DEFAULT 0,
  p50_ms NUMERIC(10, 3),
  p95_ms NUMERIC(10, 3),
  PRIMARY KEY (user_id, hour)
);

CREATE INDEX IF NOT EXISTS idx_usage_hourly_hour ON usage_hourly (hour);
