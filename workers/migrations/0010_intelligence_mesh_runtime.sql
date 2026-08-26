-- A Bulls App — Intelligence Mesh runtime schema
-- Additive only. Neutral naming for new infrastructure.

CREATE TABLE IF NOT EXISTS intelligence_index_coverage (
  wallet TEXT PRIMARY KEY,
  newest_signature TEXT,
  oldest_signature TEXT,
  newest_slot INTEGER,
  oldest_slot INTEGER,
  newest_block_time INTEGER,
  oldest_block_time INTEGER,
  indexed_events INTEGER NOT NULL DEFAULT 0,
  indexed_transactions INTEGER NOT NULL DEFAULT 0,
  complete_to_genesis INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'partial',
  source_set_json TEXT NOT NULL DEFAULT '[]',
  last_error TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS intelligence_index_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'wallet-backfill',
  state TEXT NOT NULL DEFAULT 'queued',
  cursor_before TEXT,
  page_size INTEGER NOT NULL DEFAULT 25,
  pages_completed INTEGER NOT NULL DEFAULT 0,
  signatures_seen INTEGER NOT NULL DEFAULT 0,
  transactions_ingested INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  last_error TEXT,
  next_attempt_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_intelligence_index_jobs_state_next ON intelligence_index_jobs(state, next_attempt_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_intelligence_index_jobs_wallet ON intelligence_index_jobs(wallet, updated_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_event_provenance (
  signature TEXT NOT NULL,
  wallet TEXT NOT NULL,
  source TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'rpc',
  observed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  slot INTEGER,
  commitment TEXT,
  archive_ref TEXT,
  payload_hash TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(signature, wallet, source)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_provenance_wallet_slot ON intelligence_event_provenance(wallet, slot DESC);

CREATE TABLE IF NOT EXISTS intelligence_source_health (
  source TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'unknown',
  last_ok_at INTEGER,
  last_error_at INTEGER,
  latency_ms REAL,
  gap_count INTEGER NOT NULL DEFAULT 0,
  details_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS intelligence_slot_gaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  start_slot INTEGER NOT NULL,
  end_slot INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'open',
  detected_at INTEGER NOT NULL DEFAULT (unixepoch()),
  repaired_at INTEGER,
  verification_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_intelligence_slot_gaps_state ON intelligence_slot_gaps(state, start_slot, end_slot);

CREATE TABLE IF NOT EXISTS intelligence_price_candles (
  mint TEXT NOT NULL,
  quote_mint TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  bucket_seconds INTEGER NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume_base REAL NOT NULL DEFAULT 0,
  volume_quote REAL NOT NULL DEFAULT 0,
  swap_count INTEGER NOT NULL DEFAULT 0,
  wallet_count INTEGER NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 0,
  source_set_json TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(mint, quote_mint, bucket_start, bucket_seconds)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_price_candles_lookup ON intelligence_price_candles(mint, quote_mint, bucket_seconds, bucket_start DESC);

CREATE TABLE IF NOT EXISTS intelligence_trade_routes (
  signature TEXT NOT NULL,
  wallet TEXT NOT NULL,
  hop_index INTEGER NOT NULL,
  program_id TEXT,
  venue TEXT,
  pool TEXT,
  input_mint TEXT,
  output_mint TEXT,
  input_amount REAL,
  output_amount REAL,
  fee_amount REAL,
  fee_mint TEXT,
  slot INTEGER,
  block_time INTEGER,
  source TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  PRIMARY KEY(signature, wallet, hop_index)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_trade_routes_wallet_time ON intelligence_trade_routes(wallet, block_time DESC);

CREATE TABLE IF NOT EXISTS intelligence_market_sequence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_type TEXT NOT NULL,
  scope_value TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  sequence_type TEXT NOT NULL,
  headline TEXT,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  confidence REAL NOT NULL DEFAULT 0,
  source_set_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_intelligence_market_sequence_scope_time ON intelligence_market_sequence(scope_type, scope_value, observed_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_demand_patterns (
  pattern_key TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_value TEXT,
  request_count INTEGER NOT NULL DEFAULT 0,
  avg_cost_ms REAL NOT NULL DEFAULT 0,
  last_requested_at INTEGER,
  priority_score REAL NOT NULL DEFAULT 0,
  materialization_state TEXT NOT NULL DEFAULT 'none',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_intelligence_demand_priority ON intelligence_demand_patterns(priority_score DESC, updated_at DESC);
