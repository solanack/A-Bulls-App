-- A Bulls App — preserve provider transaction references when supplied.
-- Expand-only. Transaction hashes/signatures remain provider-reported until
-- independently resolved through chain RPC / Solana evidence.

ALTER TABLE fomo_trader_trades ADD COLUMN tx_id TEXT;
ALTER TABLE fomo_trader_trades ADD COLUMN entry_tx_id TEXT;
ALTER TABLE fomo_trader_trades ADD COLUMN exit_tx_id TEXT;

CREATE INDEX IF NOT EXISTS idx_fomo_trades_tx_id ON fomo_trader_trades(tx_id);
CREATE INDEX IF NOT EXISTS idx_fomo_trades_entry_tx_id ON fomo_trader_trades(entry_tx_id);
CREATE INDEX IF NOT EXISTS idx_fomo_trades_exit_tx_id ON fomo_trader_trades(exit_tx_id);

PRAGMA optimize;
