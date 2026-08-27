-- A Bulls App — Ecosystem Universes + Pattern Lab
-- Additive only. No destructive statements. Apply after 0011_universe_trickster.sql.

CREATE TABLE IF NOT EXISTS intelligence_universes (
  universe_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  ecosystem_kind TEXT NOT NULL DEFAULT 'launchpad',
  source TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  selector_version TEXT NOT NULL DEFAULT 'v1',
  refresh_seconds INTEGER NOT NULL DEFAULT 900,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS intelligence_universe_membership (
  universe_id TEXT NOT NULL,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  rank INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  qualifying_cycles INTEGER NOT NULL DEFAULT 1,
  first_entered_at INTEGER NOT NULL,
  last_entered_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  last_exited_at INTEGER,
  entry_count INTEGER NOT NULL DEFAULT 1,
  source_snapshot_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (universe_id, entity_kind, entity_id),
  FOREIGN KEY (universe_id) REFERENCES intelligence_universes(universe_id)
);
CREATE INDEX IF NOT EXISTS idx_universe_membership_active_rank ON intelligence_universe_membership(universe_id, active, rank, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_universe_membership_entity ON intelligence_universe_membership(entity_kind, entity_id, active);

CREATE TABLE IF NOT EXISTS intelligence_universe_membership_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  universe_id TEXT NOT NULL,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  rank INTEGER,
  observed_at INTEGER NOT NULL,
  source_snapshot_id TEXT,
  reason TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_universe_membership_events_window ON intelligence_universe_membership_events(universe_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_universe_membership_events_entity ON intelligence_universe_membership_events(entity_kind, entity_id, observed_at DESC);

-- Short-lived render links for the live particle surface.
CREATE TABLE IF NOT EXISTS intelligence_universe_observation_links (
  universe_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  PRIMARY KEY (universe_id, event_id, entity_kind, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_universe_observation_links_window ON intelligence_universe_observation_links(universe_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_universe_observation_links_entity ON intelligence_universe_observation_links(universe_id, entity_kind, entity_id, observed_at DESC);

-- Durable research link. A chain event is stored once in bull_wallet_events and can
-- participate in multiple universes without duplicating the event itself.
CREATE TABLE IF NOT EXISTS intelligence_universe_event_links (
  universe_id TEXT NOT NULL,
  event_row_id INTEGER NOT NULL,
  signature TEXT NOT NULL,
  wallet TEXT NOT NULL,
  mint TEXT NOT NULL DEFAULT '',
  block_time INTEGER NOT NULL,
  membership_snapshot_id TEXT,
  linked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (universe_id, event_row_id)
);
CREATE INDEX IF NOT EXISTS idx_universe_event_links_window ON intelligence_universe_event_links(universe_id, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_universe_event_links_wallet ON intelligence_universe_event_links(universe_id, wallet, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_universe_event_links_mint ON intelligence_universe_event_links(universe_id, mint, block_time DESC);

CREATE TABLE IF NOT EXISTS intelligence_wallet_behavior_features (
  universe_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  buy_count INTEGER NOT NULL DEFAULT 0,
  sell_count INTEGER NOT NULL DEFAULT 0,
  transfer_count INTEGER NOT NULL DEFAULT 0,
  active_minutes INTEGER NOT NULL DEFAULT 0,
  median_spacing_seconds REAL,
  spacing_cv REAL,
  repeated_size_ratio REAL NOT NULL DEFAULT 0,
  round_size_ratio REAL NOT NULL DEFAULT 0,
  burst_ratio REAL NOT NULL DEFAULT 0,
  time_of_day_concentration REAL NOT NULL DEFAULT 0,
  cross_token_reuse_ratio REAL NOT NULL DEFAULT 0,
  feature_version TEXT NOT NULL DEFAULT 'v1',
  evidence_count INTEGER NOT NULL DEFAULT 0,
  computed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (universe_id, wallet, window_start, window_end, feature_version)
);
CREATE INDEX IF NOT EXISTS idx_wallet_behavior_features_universe ON intelligence_wallet_behavior_features(universe_id, window_end DESC, transaction_count DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_behavior_features_wallet ON intelligence_wallet_behavior_features(wallet, window_end DESC);

CREATE TABLE IF NOT EXISTS intelligence_pattern_hypotheses (
  hypothesis_id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  hypothesis_kind TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'candidate',
  confidence REAL NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  feature_version TEXT NOT NULL DEFAULT 'v1',
  statement TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  falsifiers_json TEXT NOT NULL DEFAULT '[]',
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_pattern_hypotheses_universe ON intelligence_pattern_hypotheses(universe_id, state, confidence DESC, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_hypotheses_subject ON intelligence_pattern_hypotheses(subject_kind, subject_id, last_seen_at DESC);

INSERT OR IGNORE INTO intelligence_universes
  (universe_id,label,ecosystem_kind,source,description,active,selector_version,refresh_seconds)
VALUES
  ('solana','All Indexed Solana','chain','intelligence-mesh','All bounded, indexed Solana evidence available to the particle field.',1,'v1',60),
  ('z500-top10','Z500 Top 10','curated-dynamic','ansem-z500','Dynamic top-10 universe. Membership rotates while historical observations remain queryable.',1,'v1',900),
  ('jupiter-launchpad','Jupiter Launchpad','launchpad','jupiter','Jupiter launchpad ecosystem universe. Adapter may be enabled independently.',1,'v1',900),
  ('pump-fun','Pump.fun','launchpad','pump-fun','Pump.fun ecosystem universe. Can be bounded by an active selector.',1,'v1',900),
  ('raydium-launchlab','Raydium LaunchLab','launchpad','raydium-launchlab','Raydium LaunchLab ecosystem universe.',1,'v1',900);
