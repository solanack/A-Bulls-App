-- Bull Intelligence D1 schema blueprint
-- Not yet applied to production. Designed for staged Worker integration.

CREATE TABLE IF NOT EXISTS bull_wallet_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signature TEXT NOT NULL,
  slot INTEGER,
  block_time INTEGER,
  wallet TEXT NOT NULL,
  counterparty TEXT,
  program_id TEXT,
  mint TEXT,
  collection TEXT,
  event_class TEXT NOT NULL,
  sol_delta REAL,
  token_delta REAL,
  fee_lamports INTEGER,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  decoder_version TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bull_wallet_events_unique
  ON bull_wallet_events(signature, wallet, event_class, COALESCE(mint, ''));
CREATE INDEX IF NOT EXISTS idx_bull_wallet_events_wallet_time
  ON bull_wallet_events(wallet, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_bull_wallet_events_mint_time
  ON bull_wallet_events(mint, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_bull_wallet_events_counterparty
  ON bull_wallet_events(counterparty, block_time DESC);

CREATE TABLE IF NOT EXISTS bull_wallet_windows (
  wallet TEXT NOT NULL,
  window_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  tx_count INTEGER NOT NULL DEFAULT 0,
  active_days INTEGER NOT NULL DEFAULT 0,
  swaps INTEGER NOT NULL DEFAULT 0,
  unique_mints INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  sol_in REAL NOT NULL DEFAULT 0,
  sol_out REAL NOT NULL DEFAULT 0,
  fees_sol REAL NOT NULL DEFAULT 0,
  top_holding_percent REAL,
  payload_json TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(wallet, window_key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_bull_wallet_windows_end
  ON bull_wallet_windows(window_end DESC);

CREATE TABLE IF NOT EXISTS bull_wallet_relationships (
  wallet_a TEXT NOT NULL,
  wallet_b TEXT NOT NULL,
  first_seen INTEGER,
  last_seen INTEGER,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  sol_volume REAL NOT NULL DEFAULT 0,
  token_event_count INTEGER NOT NULL DEFAULT 0,
  relationship_types TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(wallet_a, wallet_b)
);
CREATE INDEX IF NOT EXISTS idx_bull_relationships_a
  ON bull_wallet_relationships(wallet_a, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_bull_relationships_b
  ON bull_wallet_relationships(wallet_b, last_seen DESC);

CREATE TABLE IF NOT EXISTS bull_token_cohorts (
  mint TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  bucket_seconds INTEGER NOT NULL,
  unique_wallets INTEGER NOT NULL DEFAULT 0,
  inbound_wallets INTEGER NOT NULL DEFAULT 0,
  outbound_wallets INTEGER NOT NULL DEFAULT 0,
  long_duration_wallets INTEGER NOT NULL DEFAULT 0,
  new_wallets INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(mint, bucket_start, bucket_seconds)
);
CREATE INDEX IF NOT EXISTS idx_bull_token_cohorts_bucket
  ON bull_token_cohorts(bucket_start DESC);

CREATE TABLE IF NOT EXISTS bull_radar_anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anomaly_key TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_value TEXT,
  observed_at INTEGER NOT NULL,
  severity REAL NOT NULL,
  baseline_value REAL,
  observed_value REAL,
  sample_size INTEGER,
  evidence_json TEXT NOT NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bull_radar_unique
  ON bull_radar_anomalies(anomaly_key, scope_type, COALESCE(scope_value, ''), observed_at);
CREATE INDEX IF NOT EXISTS idx_bull_radar_recent
  ON bull_radar_anomalies(observed_at DESC);

CREATE TABLE IF NOT EXISTS bull_chain_weather (
  bucket_start INTEGER PRIMARY KEY,
  bucket_seconds INTEGER NOT NULL,
  regime TEXT NOT NULL,
  activity_score REAL NOT NULL,
  volatility_score REAL,
  concentration_score REAL,
  rotation_score REAL,
  convergence_score REAL,
  nft_activity_score REAL,
  evidence_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS bull_intelligence_cache (
  cache_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  source TEXT NOT NULL,
  coverage TEXT NOT NULL,
  generated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bull_intelligence_cache_expiry
  ON bull_intelligence_cache(expires_at);
