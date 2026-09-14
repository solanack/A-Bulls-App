-- A Bulls App — resumable Pons launch discovery backfill.
-- Keeps filtered historical launch discovery separate from the forward RPC cursor.

CREATE TABLE IF NOT EXISTS pons_discovery_state (
  factory TEXT PRIMARY KEY,
  factory_version TEXT NOT NULL,
  start_block INTEGER NOT NULL,
  next_to_block INTEGER,
  complete INTEGER NOT NULL DEFAULT 0 CHECK (complete IN (0,1)),
  discovered_launches INTEGER NOT NULL DEFAULT 0,
  last_success_at INTEGER,
  last_error TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_pons_discovery_complete
  ON pons_discovery_state(complete, updated_at);
