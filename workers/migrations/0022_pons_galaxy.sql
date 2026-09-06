-- A Bulls App — verified PONS launch-origin galaxy on Robinhood Chain.
-- Additive and read-only. Apply after 0021_socialfi_foundation.sql.

CREATE TABLE IF NOT EXISTS pons_launches (
  token TEXT PRIMARY KEY,
  factory TEXT NOT NULL,
  factory_version TEXT NOT NULL,
  curve TEXT,
  deployer TEXT NOT NULL,
  dex_factory TEXT,
  pair_token TEXT NOT NULL,
  pool TEXT,
  launch_config_id TEXT,
  graduation_threshold TEXT,
  position_id TEXT,
  restrictions_end_block TEXT,
  initial_buy_amount TEXT,
  transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  block_hash TEXT NOT NULL,
  block_time INTEGER,
  finality TEXT NOT NULL DEFAULT 'soft-confirmed',
  launch_state TEXT NOT NULL DEFAULT 'launched',
  market_json TEXT NOT NULL DEFAULT '{}',
  observed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_pons_launches_block
  ON pons_launches(block_number DESC, log_index DESC);
CREATE INDEX IF NOT EXISTS idx_pons_launches_factory
  ON pons_launches(factory, block_number DESC);

CREATE TABLE IF NOT EXISTS pons_index_state (
  factory TEXT PRIMARY KEY,
  factory_version TEXT NOT NULL,
  last_scanned_block INTEGER NOT NULL DEFAULT 0,
  last_scanned_hash TEXT,
  last_success_at INTEGER,
  last_error TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO intelligence_universes
  (universe_id,label,ecosystem_kind,source,description,active,selector_version,refresh_seconds)
VALUES
  ('pons','PONS','launchpad','verified-pons-factory-events','PONS launch-origin galaxy on Robinhood Chain. Membership requires a verified V1 or V2 factory event.',1,'factory-events-v1',900);
