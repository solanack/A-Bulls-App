-- A Bulls App — Universe runtime, durable evidence links, selector leases, and research state.
-- Additive only. Apply after 0015_ecosystem_universes_pattern_lab.sql.

CREATE TABLE IF NOT EXISTS intelligence_universe_event_links (
  universe_id TEXT NOT NULL,
  event_row_id INTEGER NOT NULL,
  signature TEXT NOT NULL,
  wallet TEXT NOT NULL DEFAULT '',
  mint TEXT NOT NULL DEFAULT '',
  block_time INTEGER NOT NULL DEFAULT 0,
  membership_snapshot_id TEXT,
  linked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (universe_id, event_row_id)
);
CREATE INDEX IF NOT EXISTS idx_universe_event_links_window
  ON intelligence_universe_event_links(universe_id, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_universe_event_links_signature
  ON intelligence_universe_event_links(signature, universe_id);
CREATE INDEX IF NOT EXISTS idx_universe_event_links_wallet
  ON intelligence_universe_event_links(universe_id, wallet, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_universe_event_links_mint
  ON intelligence_universe_event_links(universe_id, mint, block_time DESC);

CREATE TABLE IF NOT EXISTS intelligence_universe_source_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  source TEXT NOT NULL,
  selector_version TEXT NOT NULL DEFAULT 'v1',
  observed_at INTEGER NOT NULL,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'ok',
  source_etag TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  error_code TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_universe_source_snapshots_recent
  ON intelligence_universe_source_snapshots(universe_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_universe_selector_candidates (
  universe_id TEXT NOT NULL,
  entity_kind TEXT NOT NULL DEFAULT 'token',
  entity_id TEXT NOT NULL,
  source_rank INTEGER,
  consecutive_cycles INTEGER NOT NULL DEFAULT 0,
  last_cycle INTEGER NOT NULL DEFAULT 0,
  last_snapshot_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (universe_id, entity_kind, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_universe_selector_candidates_rank
  ON intelligence_universe_selector_candidates(universe_id, last_cycle DESC, source_rank);

CREATE TABLE IF NOT EXISTS intelligence_scheduler_leases (
  lease_key TEXT PRIMARY KEY,
  lease_until INTEGER NOT NULL DEFAULT 0,
  last_started_at INTEGER,
  last_completed_at INTEGER,
  last_state TEXT NOT NULL DEFAULT 'idle',
  last_error TEXT,
  run_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS intelligence_token_identity_cache (
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'solana',
  address TEXT,
  symbol TEXT,
  name TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  resolved_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (source, source_id, chain)
);
CREATE INDEX IF NOT EXISTS idx_token_identity_address
  ON intelligence_token_identity_cache(chain, address);

CREATE TABLE IF NOT EXISTS intelligence_webhook_reconcile_state (
  provider TEXT NOT NULL,
  webhook_id TEXT NOT NULL,
  universe_id TEXT NOT NULL,
  desired_hash TEXT,
  applied_hash TEXT,
  state TEXT NOT NULL DEFAULT 'unknown',
  account_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER,
  last_success_at INTEGER,
  last_error TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (provider, webhook_id, universe_id)
);

CREATE TABLE IF NOT EXISTS intelligence_provider_usage_daily (
  provider TEXT NOT NULL,
  usage_day TEXT NOT NULL,
  operation TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  estimated_credits INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (provider, usage_day, operation)
);

CREATE TABLE IF NOT EXISTS intelligence_pattern_runs (
  run_id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  feature_version TEXT NOT NULL DEFAULT 'v2',
  event_count INTEGER NOT NULL DEFAULT 0,
  wallet_count INTEGER NOT NULL DEFAULT 0,
  hypothesis_count INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'complete',
  methodology TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_pattern_runs_universe
  ON intelligence_pattern_runs(universe_id, window_end DESC);


