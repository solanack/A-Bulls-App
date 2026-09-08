-- A Bulls App — live Fomo research enrichment cache.
-- Additive only. Provider-reported data remains separate from indexed chain evidence.

CREATE TABLE IF NOT EXISTS fomo_trader_positions (
  handle TEXT NOT NULL COLLATE NOCASE,
  position_rank INTEGER NOT NULL CHECK (position_rank BETWEEN 1 AND 10),
  token_address TEXT NOT NULL,
  symbol TEXT,
  name TEXT,
  chain TEXT,
  network_id TEXT,
  amount REAL,
  price_usd REAL,
  value_usd REAL,
  change_24h REAL,
  captured_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'fomoapi.io/balances',
  PRIMARY KEY (handle, token_address, chain)
);
CREATE INDEX IF NOT EXISTS idx_fomo_positions_handle_rank ON fomo_trader_positions(handle, position_rank);
CREATE INDEX IF NOT EXISTS idx_fomo_positions_value ON fomo_trader_positions(handle, value_usd DESC);

CREATE TABLE IF NOT EXISTS fomo_trader_trades (
  handle TEXT NOT NULL COLLATE NOCASE,
  trade_id TEXT NOT NULL,
  token_address TEXT NOT NULL,
  symbol TEXT,
  chain TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  amount REAL,
  avg_entry_price REAL,
  avg_exit_price REAL,
  realized_pnl_usd REAL,
  unrealized_pnl_usd REAL,
  created_at INTEGER,
  closed_at INTEGER,
  captured_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'fomoapi.io/trades',
  PRIMARY KEY (handle, trade_id)
);
CREATE INDEX IF NOT EXISTS idx_fomo_trades_handle_time ON fomo_trader_trades(handle, closed_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fomo_trades_token ON fomo_trader_trades(token_address, captured_at DESC);

CREATE TABLE IF NOT EXISTS fomo_enrichment_state (
  handle TEXT PRIMARY KEY COLLATE NOCASE,
  last_positions_at INTEGER,
  last_trades_at INTEGER,
  last_error TEXT,
  updated_at INTEGER NOT NULL
);

PRAGMA optimize;
