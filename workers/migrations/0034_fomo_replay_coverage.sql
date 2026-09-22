-- A Bulls App — Fomo Replay coverage enrichment version.
-- Expand-only. Forces one bounded refresh of current traders so retained balance
-- active-trade anchors and broadened provider price/timestamp fields can be stored.

ALTER TABLE fomo_enrichment_state
  ADD COLUMN replay_anchor_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_fomo_enrichment_replay_version
  ON fomo_enrichment_state(replay_anchor_version, last_positions_at, last_trades_at);

PRAGMA optimize;
