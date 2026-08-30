-- A Bulls App — immutable public Trickster verification manifests.
-- Additive only. Stores validated public-chain story manifests for read-only share pages.

CREATE TABLE IF NOT EXISTS trickster_share_manifests (
  id TEXT PRIMARY KEY,
  manifest_json TEXT NOT NULL,
  disclosures_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trickster_share_manifests_expiry
  ON trickster_share_manifests(expires_at);

