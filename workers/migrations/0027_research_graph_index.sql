-- A Bulls App — canonical research graph / Index foundation.
-- Additive only. All timestamps are milliseconds. Missing evidence remains NULL.

CREATE TABLE IF NOT EXISTS research_threads (
  id TEXT PRIMARY KEY,
  author_account_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public')),
  galaxy_id TEXT,
  launch_origin TEXT,
  mint TEXT,
  wallet TEXT,
  matched_round_id TEXT,
  from_ts INTEGER,
  to_ts INTEGER,
  entry_signature TEXT,
  exit_signature TEXT,
  replay_ref TEXT,
  evidence_ids_json TEXT NOT NULL DEFAULT '[]',
  compare_refs_json TEXT NOT NULL DEFAULT '[]',
  sequence_refs_json TEXT NOT NULL DEFAULT '[]',
  ghost_refs_json TEXT NOT NULL DEFAULT '[]',
  thesis_refs_json TEXT NOT NULL DEFAULT '[]',
  cut_refs_json TEXT NOT NULL DEFAULT '[]',
  coverage TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_threads_mint_time ON research_threads(mint, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_threads_wallet_time ON research_threads(wallet, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_threads_public_time ON research_threads(visibility, updated_at DESC);

CREATE TABLE IF NOT EXISTS matched_trade_rounds (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  mint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('closed','open','unmatched')),
  entry_signature TEXT,
  exit_signature TEXT,
  entry_ts INTEGER,
  exit_ts INTEGER,
  buy_sol REAL,
  sell_sol REAL,
  matched_realized_sol REAL,
  observed_inventory REAL,
  method TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL DEFAULT '[]',
  coverage TEXT NOT NULL DEFAULT 'partial',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_matched_round_identity ON matched_trade_rounds(wallet,mint,entry_signature,exit_signature);
CREATE INDEX IF NOT EXISTS idx_matched_round_wallet_mint ON matched_trade_rounds(wallet,mint,entry_ts DESC);
CREATE INDEX IF NOT EXISTS idx_matched_round_mint ON matched_trade_rounds(mint,entry_ts DESC);

CREATE TABLE IF NOT EXISTS research_index_objects (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('planet','star','trade','matched_round','research_thread','replay','evidence','cut','thesis','resolution','ghost','sequence','comparison')),
  mint TEXT,
  wallet TEXT,
  galaxy_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  source_kind TEXT NOT NULL,
  source_ref TEXT,
  observed_ts INTEGER,
  coverage TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private','unlisted','public')),
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_index_kind_time ON research_index_objects(kind,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_index_mint_time ON research_index_objects(mint,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_index_wallet_time ON research_index_objects(wallet,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_index_public_time ON research_index_objects(visibility,updated_at DESC);

CREATE TABLE IF NOT EXISTS research_graph_edges (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  observed_ts INTEGER,
  evidence_id TEXT,
  source_kind TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_research_edge_identity ON research_graph_edges(from_id,to_id,relation,evidence_id);
CREATE INDEX IF NOT EXISTS idx_research_edges_from ON research_graph_edges(from_id,relation);
CREATE INDEX IF NOT EXISTS idx_research_edges_to ON research_graph_edges(to_id,relation);

CREATE TABLE IF NOT EXISTS index_coverage_checkpoints (
  source TEXT PRIMARY KEY,
  last_observed_slot INTEGER,
  last_verified_slot INTEGER,
  gap_from_slot INTEGER,
  gap_to_slot INTEGER,
  status TEXT NOT NULL DEFAULT 'unknown',
  detail TEXT,
  updated_at INTEGER NOT NULL
);
