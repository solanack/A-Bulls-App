-- Preserved FIFO lots for pump trades that age out of pump_trades.
-- Applied evidence ids make the fold idempotent. No provider backfill.

CREATE TABLE IF NOT EXISTS matched_position_lots (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  mint TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  entry_signature TEXT,
  opened_at INTEGER,
  token_remaining REAL NOT NULL,
  cost_sol REAL,
  lot_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matched_position_lots_wallet_mint
  ON matched_position_lots(wallet, mint, lot_order);

CREATE TABLE IF NOT EXISTS matched_basis_applied (
  source TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  mint TEXT NOT NULL,
  applied_at INTEGER NOT NULL,
  PRIMARY KEY (source, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_matched_basis_applied_wallet_mint
  ON matched_basis_applied(wallet, mint);
