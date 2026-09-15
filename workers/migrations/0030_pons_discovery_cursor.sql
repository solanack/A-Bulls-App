-- A Bulls App — durable cursor for no-key Blockscout v2 Pons discovery.
-- Separate from the forward RPC cursor and from migration 0028's range progress.

CREATE TABLE IF NOT EXISTS pons_discovery_cursor (
  factory TEXT PRIMARY KEY,
  cursor_json TEXT,
  source TEXT NOT NULL DEFAULT 'blockscout-instance-v2',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
