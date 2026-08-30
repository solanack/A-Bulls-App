-- A Bulls App — Universe + Trickster additive schema
-- Not applied automatically. No destructive statements.

CREATE TABLE IF NOT EXISTS intelligence_live_observations (
  event_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'unknown',
  observed_at INTEGER NOT NULL,
  slot INTEGER,
  commitment TEXT NOT NULL DEFAULT 'observed',
  magnitude_band REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  inserted_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_intelligence_live_observations_window
  ON intelligence_live_observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_live_observations_category_window
  ON intelligence_live_observations(category, observed_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_story_manifests (
  story_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  story_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  manifest_json TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  renderer_version TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_intelligence_story_subject
  ON intelligence_story_manifests(subject_kind, subject_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_story_exports (
  export_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  format TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  storage_key TEXT,
  content_hash TEXT,
  duration_ms INTEGER,
  error_code TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY(story_id) REFERENCES intelligence_story_manifests(story_id)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_story_exports_story
  ON intelligence_story_exports(story_id, created_at DESC);

