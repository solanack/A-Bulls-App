-- Galaxy Zero frontend compatibility for the existing Intelligence Worker.
-- Additive only: reuses INTELLIGENCE_DB and bull_intelligence_cache.

CREATE TABLE IF NOT EXISTS intelligence_provider_budget_monthly (
  provider TEXT NOT NULL,
  month_key TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  credits_reserved INTEGER NOT NULL DEFAULT 0,
  monthly_limit INTEGER NOT NULL,
  breaker_ratio REAL NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (provider, month_key)
);

CREATE INDEX IF NOT EXISTS idx_intelligence_provider_budget_updated
  ON intelligence_provider_budget_monthly(provider, updated_at DESC);

