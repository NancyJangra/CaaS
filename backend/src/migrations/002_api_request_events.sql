-- Phase 4: API request analytics (all methods), separate from hit/miss usage_events

CREATE TABLE IF NOT EXISTS api_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('GET', 'PUT', 'DELETE', 'POST', 'PATCH')),
  cache_key VARCHAR(512),
  status_code INTEGER,
  latency_ms NUMERIC(10, 3),
  admitted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_request_events_user_id ON api_request_events (user_id);
CREATE INDEX IF NOT EXISTS idx_api_request_events_created_at ON api_request_events (created_at);
CREATE INDEX IF NOT EXISTS idx_api_request_events_user_created ON api_request_events (user_id, created_at);
