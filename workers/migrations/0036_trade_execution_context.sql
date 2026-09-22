-- A Bulls App — observed trade execution context.
-- Exact venue/pool metadata is stored only when a transaction has been
-- independently reconciled or verified. Provider-reported trade claims remain
-- in their original evidence rows.

CREATE TABLE IF NOT EXISTS intelligence_trade_execution_v2 (
  chain_key TEXT NOT NULL,
  tx_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  asset_address TEXT NOT NULL,
  quote_asset_address TEXT,
  side TEXT,
  pool_address TEXT,
  dex_id TEXT,
  block_height INTEGER,
  block_time INTEGER,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  observed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (chain_key, tx_id, wallet_address, asset_address)
);

CREATE INDEX IF NOT EXISTS idx_trade_execution_wallet_asset_time
  ON intelligence_trade_execution_v2(chain_key, wallet_address, asset_address, block_time DESC);

CREATE INDEX IF NOT EXISTS idx_trade_execution_asset_pool
  ON intelligence_trade_execution_v2(chain_key, asset_address, pool_address, block_time DESC);

PRAGMA optimize;
