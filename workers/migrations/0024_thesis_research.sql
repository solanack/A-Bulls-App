-- A Bulls App — first-slice cited thesis records and 24h cached resolutions.
-- Additive only. User expression is stored separately from observed market evidence.

CREATE TABLE IF NOT EXISTS theses (
  id TEXT PRIMARY KEY,
  author_account_id TEXT,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('star','planet')),
  target_id TEXT NOT NULL COLLATE BINARY,
  galaxy_id TEXT NOT NULL,
  claim TEXT NOT NULL CHECK (length(claim) BETWEEN 1 AND 180),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  replay_window_id TEXT,
  from_ts INTEGER NOT NULL CHECK (from_ts >= 1000000000000),
  to_ts INTEGER NOT NULL CHECK (to_ts >= from_ts),
  status TEXT NOT NULL CHECK (status IN ('draft','open','resolved')),
  created_at INTEGER NOT NULL CHECK (created_at >= 1000000000000),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 1000000000000)
);
CREATE INDEX IF NOT EXISTS idx_theses_target_status_time
  ON theses(target_kind,target_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_theses_resolution_due
  ON theses(status,created_at);

CREATE TABLE IF NOT EXISTS thesis_citations (
  id TEXT PRIMARY KEY,
  thesis_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('tx','candle','holder_snapshot','replay_event')),
  ref TEXT NOT NULL,
  observed_ts INTEGER NOT NULL CHECK (observed_ts >= 1000000000000),
  label TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  UNIQUE (thesis_id,kind,ref,observed_ts)
);
CREATE INDEX IF NOT EXISTS idx_thesis_citations_thesis
  ON thesis_citations(thesis_id,observed_ts);

CREATE TABLE IF NOT EXISTS thesis_resolutions (
  id TEXT PRIMARY KEY,
  thesis_id TEXT NOT NULL,
  window TEXT NOT NULL CHECK (window = '24h'),
  at_publish_market_cap REAL,
  at_resolve_market_cap REAL,
  at_publish_liquidity REAL,
  at_resolve_liquidity REAL,
  at_publish_top_holder_pct REAL,
  at_resolve_top_holder_pct REAL,
  evidence_quality TEXT NOT NULL CHECK (evidence_quality IN ('observed','partial','unavailable')),
  resolved_at INTEGER CHECK (resolved_at IS NULL OR resolved_at >= 1000000000000),
  FOREIGN KEY (thesis_id) REFERENCES theses(id) ON DELETE CASCADE,
  UNIQUE (thesis_id,window)
);
CREATE INDEX IF NOT EXISTS idx_thesis_resolutions_thesis
  ON thesis_resolutions(thesis_id);

PRAGMA optimize;
