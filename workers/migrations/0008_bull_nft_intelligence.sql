-- A Bulls App v8.6 — staged NFT intelligence schema.
-- Stores public-chain NFT observations only. No ownership identity inference.

CREATE TABLE IF NOT EXISTS bull_nft_wallet_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  signature TEXT NOT NULL,
  slot INTEGER,
  block_time INTEGER,
  wallet TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  collection TEXT,
  event_class TEXT NOT NULL,
  marketplace TEXT,
  counterparty TEXT,
  sol_value REAL,
  usd_value REAL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  metadata_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bull_nft_wallet_events_unique
  ON bull_nft_wallet_events(signature, wallet, asset_id, event_class);
CREATE INDEX IF NOT EXISTS idx_bull_nft_wallet_events_wallet_time
  ON bull_nft_wallet_events(wallet, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_bull_nft_wallet_events_collection_time
  ON bull_nft_wallet_events(collection, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_bull_nft_wallet_events_asset_time
  ON bull_nft_wallet_events(asset_id, block_time DESC);

CREATE TABLE IF NOT EXISTS bull_nft_wallet_collection_windows (
  wallet TEXT NOT NULL,
  collection TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  acquired_count INTEGER NOT NULL DEFAULT 0,
  disposed_count INTEGER NOT NULL DEFAULT 0,
  transfer_in_count INTEGER NOT NULL DEFAULT 0,
  transfer_out_count INTEGER NOT NULL DEFAULT 0,
  unique_assets INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER,
  last_seen INTEGER,
  observed_sol_in REAL NOT NULL DEFAULT 0,
  observed_sol_out REAL NOT NULL DEFAULT 0,
  payload_json TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(wallet, collection, window_start)
);
CREATE INDEX IF NOT EXISTS idx_bull_nft_wallet_collection_end
  ON bull_nft_wallet_collection_windows(wallet, window_end DESC);

CREATE TABLE IF NOT EXISTS bull_nft_collection_cohorts (
  collection TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  bucket_seconds INTEGER NOT NULL,
  active_wallets INTEGER NOT NULL DEFAULT 0,
  acquiring_wallets INTEGER NOT NULL DEFAULT 0,
  disposing_wallets INTEGER NOT NULL DEFAULT 0,
  transfer_wallets INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(collection, bucket_start, bucket_seconds)
);
CREATE INDEX IF NOT EXISTS idx_bull_nft_collection_cohorts_time
  ON bull_nft_collection_cohorts(bucket_start DESC);

-- Future NFT Museum views must distinguish observed facts from missing history.
-- Historical valuation fields stay nullable so incomplete pricing cannot be presented as exact P&L.

