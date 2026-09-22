-- A Bulls App — Robinhood reference market context.
-- These tables never replace transaction execution or OHLC evidence. They store
-- explicitly labeled reference data for Robinhood Stock Tokens and the separate
-- Robinhood Chain Lighter domain.

CREATE TABLE IF NOT EXISTS intelligence_robinhood_reference_assets (
  token_address TEXT PRIMARY KEY,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  current_multiplier REAL,
  asset_id TEXT,
  source TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  observed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS intelligence_robinhood_reference_snapshots (
  token_address TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  underlying_bid_usd REAL,
  underlying_ask_usd REAL,
  token_reference_mid_usd REAL,
  lighter_market_id INTEGER,
  lighter_mark_price REAL,
  lighter_index_price REAL,
  lighter_last_price REAL,
  lighter_daily_quote_volume REAL,
  source_set_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT NOT NULL DEFAULT '{}',
  observed_at INTEGER NOT NULL,
  PRIMARY KEY (token_address, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_robinhood_reference_symbol
  ON intelligence_robinhood_reference_assets(token_symbol, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_robinhood_reference_time
  ON intelligence_robinhood_reference_snapshots(token_address, bucket_start ASC);

PRAGMA optimize;
