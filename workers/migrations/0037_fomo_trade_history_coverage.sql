-- A Bulls App — Fomo trade-history coverage.
-- Continuation metadata is provider coverage state only; retained closed trades
-- remain durable regardless of later provider pagination windows.

ALTER TABLE fomo_enrichment_state ADD COLUMN trade_history_cursor TEXT;
ALTER TABLE fomo_enrichment_state ADD COLUMN trade_history_complete INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fomo_enrichment_state ADD COLUMN trade_history_pages INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fomo_enrichment_state ADD COLUMN trade_history_oldest_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_fomo_enrichment_trade_history
  ON fomo_enrichment_state(trade_history_complete, trade_history_oldest_at, updated_at);

PRAGMA optimize;
