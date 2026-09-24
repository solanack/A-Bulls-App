-- A Bulls App — demand-driven fetches for the dated Replay social strip.
-- One row per mint + day_0. Opening That day (or Replay) queues it once; the Worker or a
-- host runner (Agent-Reach) fetches and writes social_posts_retained. Page reads stay D1-only.

CREATE TABLE IF NOT EXISTS social_fetch_requests (
  request_key TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  chain_key TEXT,
  symbol TEXT,
  name TEXT,
  room TEXT,
  day0 TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  provider TEXT,
  result_count INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  requested_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_social_fetch_state ON social_fetch_requests(state, updated_at);

-- An X account is linked to a public wallet only by a sourced record here. Nothing infers it.
CREATE TABLE IF NOT EXISTS social_account_links (
  platform TEXT NOT NULL DEFAULT 'x',
  handle TEXT NOT NULL COLLATE NOCASE,
  wallet TEXT NOT NULL,
  source TEXT NOT NULL,
  retained_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (platform, handle, wallet)
);
