-- A Bulls App — chain-qualified evidence spine v1.
-- Expand-only migration. Existing Solana tables remain authoritative for legacy
-- reads while v2 tables add chain identity for multichain market/evidence data.

CREATE TABLE IF NOT EXISTS intelligence_chain_assets_v2 (
  asset_id TEXT PRIMARY KEY,
  chain_key TEXT NOT NULL,
  asset_address TEXT NOT NULL,
  symbol TEXT,
  name TEXT,
  source_set_json TEXT NOT NULL DEFAULT '[]',
  first_observed_at INTEGER,
  last_observed_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(chain_key, asset_address)
);
CREATE INDEX IF NOT EXISTS idx_chain_assets_v2_chain_seen ON intelligence_chain_assets_v2(chain_key, last_observed_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_market_snapshots_v2 (
  chain_key TEXT NOT NULL,
  asset_address TEXT NOT NULL,
  price_usd REAL,
  market_cap_usd REAL,
  fdv_usd REAL,
  liquidity_usd REAL,
  volume_m5_usd REAL,
  volume_h1_usd REAL,
  volume_h6_usd REAL,
  volume_h24_usd REAL,
  pair_address TEXT,
  dex_id TEXT,
  pair_created_at INTEGER,
  source TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  observed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(chain_key, asset_address)
);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_v2_seen ON intelligence_market_snapshots_v2(chain_key, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_v2_volume ON intelligence_market_snapshots_v2(chain_key, volume_h24_usd DESC);

CREATE TABLE IF NOT EXISTS intelligence_price_candles_v2 (
  chain_key TEXT NOT NULL,
  asset_address TEXT NOT NULL,
  quote_asset_address TEXT NOT NULL,
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
  PRIMARY KEY(chain_key, asset_address, quote_asset_address, bucket_start, bucket_seconds)
);
CREATE INDEX IF NOT EXISTS idx_price_candles_v2_lookup ON intelligence_price_candles_v2(chain_key, asset_address, quote_asset_address, bucket_seconds, bucket_start DESC);

CREATE TABLE IF NOT EXISTS intelligence_chain_events_v2 (
  event_id TEXT PRIMARY KEY,
  chain_key TEXT NOT NULL,
  tx_id TEXT,
  wallet_address TEXT,
  asset_address TEXT NOT NULL,
  quote_asset_address TEXT,
  block_height INTEGER,
  block_time INTEGER,
  event_class TEXT NOT NULL,
  side TEXT,
  amount REAL,
  price_usd REAL,
  source TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  observed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_chain_events_v2_asset_time ON intelligence_chain_events_v2(chain_key, asset_address, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_chain_events_v2_wallet_time ON intelligence_chain_events_v2(chain_key, wallet_address, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_chain_events_v2_tx ON intelligence_chain_events_v2(chain_key, tx_id);
CREATE INDEX IF NOT EXISTS idx_chain_events_v2_kind ON intelligence_chain_events_v2(source_kind, updated_at DESC);

PRAGMA optimize;
