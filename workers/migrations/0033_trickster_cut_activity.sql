-- A Bulls App — anonymous Trickster Cut activity for Index discovery.
-- Additive only. No account, wallet, IP, device, or user identifiers are stored.

CREATE TABLE IF NOT EXISTS trickster_cut_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cut_id TEXT NOT NULL,
  event_kind TEXT NOT NULL CHECK (event_kind IN ('view','share')),
  occurred_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (cut_id) REFERENCES trickster_share_manifests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trickster_cut_activity_time
  ON trickster_cut_activity(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_trickster_cut_activity_cut_kind_time
  ON trickster_cut_activity(cut_id,event_kind,occurred_at DESC);
