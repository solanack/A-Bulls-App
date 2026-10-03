-- One-off, idempotent cleanup of superseded open matched rounds.
-- An older FIFO writer kept the open row after the closed round changed id.
-- A live open remainder written in the same batch shares updated_at with its
-- closed slice, so the strict updated_at comparison leaves that remainder in place.
-- Safe to re-run. This does not invent cost basis and does not delete closed rows.

DELETE FROM matched_trade_rounds
WHERE status = 'open'
  AND entry_signature IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM matched_trade_rounds AS closed
    WHERE closed.wallet = matched_trade_rounds.wallet
      AND closed.mint = matched_trade_rounds.mint
      AND closed.status = 'closed'
      AND closed.entry_signature = matched_trade_rounds.entry_signature
      AND closed.updated_at > matched_trade_rounds.updated_at
  );
