-- A Bulls App — provider budget observability.
-- Expand-only. No provider credentials or secret values are stored.

CREATE TABLE IF NOT EXISTS intelligence_provider_budget_monthly (
  provider TEXT NOT NULL,
  month_key TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  credits_reserved INTEGER NOT NULL DEFAULT 0,
  monthly_limit INTEGER NOT NULL,
  breaker_ratio REAL NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(provider, month_key)
);

CREATE TABLE IF NOT EXISTS intelligence_provider_budget_alerts (
  alert_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  month_key TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_credits INTEGER NOT NULL DEFAULT 0,
  credits_reserved INTEGER NOT NULL DEFAULT 0,
  hard_limit INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_provider_budget_alerts_recent
  ON intelligence_provider_budget_alerts(provider, created_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_provider_budget_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  month_key TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  provider_remaining INTEGER,
  provider_cost INTEGER,
  provider_limit INTEGER,
  provider_plan TEXT,
  quota_source TEXT NOT NULL,
  status_code INTEGER,
  payload_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_provider_budget_snapshots_recent
  ON intelligence_provider_budget_snapshots(provider, observed_at DESC);

PRAGMA optimize;
