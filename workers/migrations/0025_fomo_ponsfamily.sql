-- A Bulls App — Fomo Galaxy + PonsFamily trending membership.
-- Provider credentials remain Worker secrets and are never stored here.

CREATE TABLE IF NOT EXISTS fomo_traders (
  handle TEXT PRIMARY KEY COLLATE NOCASE,
  current_rank INTEGER NOT NULL CHECK (current_rank BETWEEN 1 AND 50),
  display_name TEXT,
  reported_pnl_usd REAL,
  reported_volume_usd REAL,
  reported_trade_count INTEGER,
  follower_count INTEGER,
  solana_wallet TEXT,
  evm_wallet TEXT,
  top_tokens_json TEXT NOT NULL DEFAULT '[]',
  profile_picture_url TEXT,
  cover_photo_url TEXT,
  thumbhash TEXT,
  captured_at INTEGER NOT NULL,
  profile_checked_at INTEGER,
  source TEXT NOT NULL DEFAULT 'fomoapi.io',
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fomo_traders_rank ON fomo_traders(current_rank);
CREATE INDEX IF NOT EXISTS idx_fomo_traders_solana ON fomo_traders(solana_wallet);

CREATE TABLE IF NOT EXISTS fomo_sync_state (
  id INTEGER PRIMARY KEY CHECK (id=1),
  last_fetch_at INTEGER,
  last_success_at INTEGER,
  last_error TEXT,
  updated_at INTEGER NOT NULL
);

ALTER TABLE pons_rank_candidates RENAME TO pons_rank_candidates_v1;
CREATE TABLE pons_rank_candidates (
  token TEXT PRIMARY KEY,
  symbol TEXT,
  name TEXT,
  market_cap_usd REAL NOT NULL,
  fdv_usd REAL,
  circulating_supply REAL,
  total_supply REAL,
  price_usd REAL,
  volume_h24_usd REAL NOT NULL DEFAULT 0,
  holder_count INTEGER NOT NULL DEFAULT 0,
  market_observed_at INTEGER NOT NULL,
  volume_observed_at INTEGER,
  holder_observed_at INTEGER,
  market_source TEXT NOT NULL,
  market_confidence TEXT NOT NULL DEFAULT 'provider-reported',
  qualifying_cycles INTEGER NOT NULL DEFAULT 0,
  disqualifying_cycles INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0,1)),
  current_rank INTEGER CHECK (current_rank IS NULL OR current_rank BETWEEN 1 AND 50),
  first_qualified_at INTEGER,
  last_qualified_at INTEGER,
  last_exited_at INTEGER,
  updated_at INTEGER NOT NULL
);
INSERT INTO pons_rank_candidates(token,symbol,name,market_cap_usd,fdv_usd,circulating_supply,total_supply,price_usd,market_observed_at,market_source,market_confidence,qualifying_cycles,disqualifying_cycles,active,current_rank,first_qualified_at,last_qualified_at,last_exited_at,updated_at)
SELECT token,symbol,name,market_cap_usd,fdv_usd,circulating_supply,total_supply,price_usd,market_observed_at,market_source,market_confidence,0,0,0,NULL,NULL,NULL,last_exited_at,updated_at FROM pons_rank_candidates_v1;
DROP TABLE pons_rank_candidates_v1;
CREATE INDEX idx_pons_rank_active ON pons_rank_candidates(active,current_rank);
CREATE INDEX idx_pons_rank_volume ON pons_rank_candidates(volume_h24_usd DESC);
CREATE INDEX idx_pons_rank_qualifiers ON pons_rank_candidates(holder_count,market_cap_usd,market_observed_at);

ALTER TABLE pons_rank_snapshots RENAME TO pons_rank_snapshots_v1;
CREATE TABLE pons_rank_snapshots (
  snapshot_id TEXT NOT NULL,
  token TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 50),
  market_cap_usd REAL NOT NULL,
  volume_h24_usd REAL NOT NULL DEFAULT 0,
  holder_count INTEGER NOT NULL DEFAULT 0,
  price_usd REAL,
  observed_at INTEGER NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (snapshot_id,token)
);
DROP TABLE pons_rank_snapshots_v1;
CREATE INDEX idx_pons_rank_snapshot_time ON pons_rank_snapshots(observed_at DESC,rank);

UPDATE intelligence_universes
SET label='PonsFamily',
    description='Trending verified PONS-origin tokens ranked by fresh reported 24-hour volume after market-cap and holder-count qualification.',
    selector_version='ponsfamily-volume-holders-v1',
    refresh_seconds=900
WHERE universe_id='pons';

PRAGMA optimize;
