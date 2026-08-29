PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS universe_snapshots (
  galaxy_id TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  generated_at INTEGER NOT NULL,
  coverage TEXT NOT NULL CHECK (coverage IN ('fresh', 'stale', 'degraded', 'empty')),
  source_version TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  PRIMARY KEY (galaxy_id, window_start, window_end)
);

CREATE INDEX IF NOT EXISTS universe_snapshots_latest
  ON universe_snapshots (galaxy_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS universe_query_cache (
  cache_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  coverage TEXT NOT NULL CHECK (coverage IN ('fresh', 'stale', 'degraded', 'empty')),
  observed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS universe_query_cache_expiry
  ON universe_query_cache (expires_at);

CREATE TABLE IF NOT EXISTS provider_usage (
  provider TEXT NOT NULL,
  month_key TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  units_spent INTEGER NOT NULL DEFAULT 0,
  monthly_limit INTEGER NOT NULL,
  breaker_ratio REAL NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, month_key)
);

CREATE TABLE IF NOT EXISTS market_candles (
  galaxy_id TEXT NOT NULL,
  mint TEXT NOT NULL,
  interval TEXT NOT NULL,
  opened_at INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL,
  source TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  PRIMARY KEY (mint, interval, opened_at)
);

CREATE INDEX IF NOT EXISTS market_candles_window
  ON market_candles (galaxy_id, mint, interval, opened_at);

CREATE TABLE IF NOT EXISTS ingestion_receipts (
  receipt_id TEXT PRIMARY KEY,
  galaxy_id TEXT NOT NULL,
  source TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL,
  events_written INTEGER NOT NULL DEFAULT 0,
  provider_units INTEGER NOT NULL DEFAULT 0,
  disclosure TEXT
);
