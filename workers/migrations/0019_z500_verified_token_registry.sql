-- A Bulls App — Z500 canonical token identity registry.
-- Exact Solana mint is the identity. Name/ticker are discovery hints only.
-- Additive only.

CREATE TABLE IF NOT EXISTS intelligence_z500_token_registry (
  canonical_id TEXT PRIMARY KEY,
  ansem_name TEXT NOT NULL,
  ansem_ticker TEXT NOT NULL,
  ansem_tier TEXT,
  ansem_rank INTEGER,

  verified_mint TEXT,
  verification_state TEXT NOT NULL DEFAULT 'unverified',
  verification_method TEXT,
  verification_confidence REAL NOT NULL DEFAULT 0,

  coingecko_id TEXT,
  coingecko_mint TEXT,

  candidate_mints_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  conflict_reason TEXT,

  first_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  verified_at INTEGER,
  last_verified_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  CHECK (
    verification_state IN (
      'unverified',
      'candidate',
      'verified',
      'ambiguous',
      'conflict',
      'stale'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_z500_verified_mint
  ON intelligence_z500_token_registry(verified_mint)
  WHERE verified_mint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_z500_registry_ticker
  ON intelligence_z500_token_registry(ansem_ticker);

CREATE INDEX IF NOT EXISTS idx_z500_registry_state_rank
  ON intelligence_z500_token_registry(verification_state, ansem_rank);

CREATE TABLE IF NOT EXISTS intelligence_z500_identity_evidence (
  evidence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_identifier TEXT,
  candidate_mint TEXT,
  evidence_type TEXT NOT NULL,
  evidence_strength REAL NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  observed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (canonical_id)
    REFERENCES intelligence_z500_token_registry(canonical_id)
);

CREATE INDEX IF NOT EXISTS idx_z500_evidence_token
  ON intelligence_z500_identity_evidence(canonical_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_z500_evidence_mint
  ON intelligence_z500_identity_evidence(candidate_mint, observed_at DESC);
