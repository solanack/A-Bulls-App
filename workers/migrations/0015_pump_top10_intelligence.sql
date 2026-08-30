-- A Bulls App · bounded Pump top-10 intelligence index.
-- Forward-only. Raw payloads are never persisted.

CREATE TABLE IF NOT EXISTS pump_tokens (
  mint TEXT PRIMARY KEY,
  symbol TEXT,
  name TEXT,
  image_url TEXT,
  pair_address TEXT,
  metadata_source TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pump_seen_events (
  event_id TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  block_time INTEGER NOT NULL,
  inserted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pump_seen_expiry ON pump_seen_events(inserted_at);

CREATE TABLE IF NOT EXISTS pump_volume_buckets (
  mint TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  volume_sol REAL NOT NULL DEFAULT 0,
  buy_count INTEGER NOT NULL DEFAULT 0,
  sell_count INTEGER NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (mint, bucket_start)
);
CREATE INDEX IF NOT EXISTS idx_pump_volume_time ON pump_volume_buckets(bucket_start, volume_sol DESC);

CREATE TABLE IF NOT EXISTS pump_active_tokens (
  mint TEXT PRIMARY KEY,
  rank_24h INTEGER,
  rank_1h INTEGER,
  qualifying_cycles INTEGER NOT NULL DEFAULT 0,
  active_since INTEGER NOT NULL,
  last_evaluated INTEGER NOT NULL,
  entry_reason TEXT NOT NULL DEFAULT 'verified-volume'
);
CREATE INDEX IF NOT EXISTS idx_pump_active_rank ON pump_active_tokens(rank_24h, mint);

CREATE TABLE IF NOT EXISTS pump_rank_candidates (
  mint TEXT PRIMARY KEY,
  qualifying_cycles INTEGER NOT NULL DEFAULT 0,
  last_rank_24h INTEGER,
  last_volume_sol REAL NOT NULL DEFAULT 0,
  last_seen_cycle INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pump_ranking_snapshots (
  snapshot_at INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  mint TEXT NOT NULL,
  volume_sol REAL NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (snapshot_at, window_seconds, rank)
);
CREATE INDEX IF NOT EXISTS idx_pump_rank_mint_time ON pump_ranking_snapshots(mint, snapshot_at DESC);

CREATE TABLE IF NOT EXISTS pump_trades (
  event_id TEXT PRIMARY KEY,
  signature TEXT NOT NULL,
  event_index INTEGER NOT NULL DEFAULT 0,
  mint TEXT NOT NULL,
  wallet TEXT,
  side TEXT NOT NULL CHECK (side IN ('buy','sell','trade')),
  token_amount REAL,
  sol_amount REAL,
  price_sol REAL,
  slot INTEGER,
  block_time INTEGER NOT NULL,
  program_id TEXT,
  source TEXT NOT NULL,
  commitment TEXT NOT NULL DEFAULT 'confirmed',
  inserted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pump_trades_mint_time ON pump_trades(mint, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_pump_trades_wallet_time ON pump_trades(wallet, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_pump_trades_signature ON pump_trades(signature);

CREATE TABLE IF NOT EXISTS pump_candles (
  mint TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  bucket_seconds INTEGER NOT NULL DEFAULT 60,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  open_time INTEGER,
  close_time INTEGER,
  volume_token REAL NOT NULL DEFAULT 0,
  volume_sol REAL NOT NULL DEFAULT 0,
  buy_count INTEGER NOT NULL DEFAULT 0,
  sell_count INTEGER NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,
  source_set_json TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (mint, bucket_start, bucket_seconds)
);
CREATE INDEX IF NOT EXISTS idx_pump_candles_time ON pump_candles(mint, bucket_seconds, bucket_start);

CREATE TABLE IF NOT EXISTS pump_credit_usage (
  usage_day TEXT PRIMARY KEY,
  streamed_bytes INTEGER NOT NULL DEFAULT 0,
  webhook_events INTEGER NOT NULL DEFAULT 0,
  stream_credits INTEGER NOT NULL DEFAULT 0,
  rpc_credits INTEGER NOT NULL DEFAULT 0,
  estimated_total_credits INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pump_ingest_health (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state TEXT NOT NULL DEFAULT 'idle',
  last_message_at INTEGER,
  last_success_at INTEGER,
  last_error_at INTEGER,
  last_error_code TEXT,
  received_events INTEGER NOT NULL DEFAULT 0,
  accepted_events INTEGER NOT NULL DEFAULT 0,
  duplicate_events INTEGER NOT NULL DEFAULT 0,
  rejected_events INTEGER NOT NULL DEFAULT 0,
  reconnect_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO pump_ingest_health (id, state, updated_at) VALUES (1, 'idle', unixepoch());



