-- A Bulls App — stable top-25 PONS ranking by verified market capitalization.
-- Apply after 0022_pons_galaxy.sql. Market cap never falls back to FDV.

CREATE TABLE IF NOT EXISTS pons_rank_candidates (
  token TEXT PRIMARY KEY,
  symbol TEXT,
  name TEXT,
  market_cap_usd REAL NOT NULL,
  fdv_usd REAL,
  circulating_supply REAL,
  total_supply REAL,
  price_usd REAL,
  market_observed_at INTEGER NOT NULL,
  market_source TEXT NOT NULL,
  market_confidence TEXT NOT NULL DEFAULT 'provider-reported',
  qualifying_cycles INTEGER NOT NULL DEFAULT 0,
  disqualifying_cycles INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0,1)),
  current_rank INTEGER CHECK (current_rank IS NULL OR current_rank BETWEEN 1 AND 25),
  first_qualified_at INTEGER,
  last_qualified_at INTEGER,
  last_exited_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pons_rank_active
  ON pons_rank_candidates(active, current_rank);
CREATE INDEX IF NOT EXISTS idx_pons_rank_market_cap
  ON pons_rank_candidates(market_cap_usd DESC);

CREATE TABLE IF NOT EXISTS pons_origin_checks (
  token TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('verified','not_found','error')),
  source TEXT NOT NULL,
  transaction_hash TEXT,
  checked_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pons_origin_status_time
  ON pons_origin_checks(status, checked_at);

CREATE TABLE IF NOT EXISTS pons_rank_snapshots (
  snapshot_id TEXT NOT NULL,
  token TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 25),
  market_cap_usd REAL NOT NULL,
  price_usd REAL,
  observed_at INTEGER NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, token)
);
CREATE INDEX IF NOT EXISTS idx_pons_rank_snapshot_time
  ON pons_rank_snapshots(observed_at DESC, rank);

UPDATE intelligence_universes
SET description='Top PONS-minted tokens on Robinhood Chain with verified market cap of at least $500,000. Maximum 25; two-cycle entry and exit.',
    selector_version='verified-market-cap-top25-v1',
    refresh_seconds=300
WHERE universe_id='pons';

PRAGMA optimize;
