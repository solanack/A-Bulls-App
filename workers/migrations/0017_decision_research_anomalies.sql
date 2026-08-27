-- A Bulls App — Decision Research + Anomaly Evidence
-- Additive only. These tables store derived research over canonical indexed evidence.

CREATE TABLE IF NOT EXISTS intelligence_decision_contexts (
  universe_id TEXT NOT NULL,
  event_row_id INTEGER NOT NULL,
  wallet TEXT NOT NULL,
  mint TEXT NOT NULL,
  block_time INTEGER NOT NULL,
  side TEXT NOT NULL DEFAULT 'trade',
  context_version TEXT NOT NULL DEFAULT 'v1',
  context_json TEXT NOT NULL DEFAULT '{}',
  evidence_count INTEGER NOT NULL DEFAULT 0,
  computed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (universe_id, event_row_id, context_version)
);
CREATE INDEX IF NOT EXISTS idx_decision_context_wallet
  ON intelligence_decision_contexts(universe_id, wallet, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_decision_context_mint
  ON intelligence_decision_contexts(universe_id, mint, block_time DESC);

CREATE TABLE IF NOT EXISTS intelligence_decision_profiles (
  universe_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  profile_version TEXT NOT NULL DEFAULT 'v1',
  trade_count INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  hypothesis_count INTEGER NOT NULL DEFAULT 0,
  profile_json TEXT NOT NULL DEFAULT '{}',
  computed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (universe_id, wallet, window_start, window_end, profile_version)
);
CREATE INDEX IF NOT EXISTS idx_decision_profiles_recent
  ON intelligence_decision_profiles(universe_id, window_end DESC, trade_count DESC);
CREATE INDEX IF NOT EXISTS idx_decision_profiles_wallet
  ON intelligence_decision_profiles(wallet, window_end DESC);

CREATE TABLE IF NOT EXISTS intelligence_anomaly_findings (
  finding_id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  finding_kind TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'candidate',
  score REAL NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  statement TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  counterevidence_json TEXT NOT NULL DEFAULT '{}',
  alternative_explanations_json TEXT NOT NULL DEFAULT '[]',
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  finding_version TEXT NOT NULL DEFAULT 'v1',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_anomaly_findings_universe
  ON intelligence_anomaly_findings(universe_id, state, score DESC, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_findings_subject
  ON intelligence_anomaly_findings(subject_kind, subject_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_behavior_clusters (
  cluster_id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  cluster_kind TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 0,
  members_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '{}',
  alternative_explanations_json TEXT NOT NULL DEFAULT '[]',
  cluster_version TEXT NOT NULL DEFAULT 'v1',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_behavior_clusters_universe
  ON intelligence_behavior_clusters(universe_id, window_end DESC, confidence DESC);
