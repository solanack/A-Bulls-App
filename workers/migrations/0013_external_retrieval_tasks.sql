-- A Bulls App — external Intelligence Mesh retrieval task queue.
-- Additive only. Coordinates approved read-only bridge workers outside Cloudflare.

CREATE TABLE IF NOT EXISTS intelligence_retrieval_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  index_job_id INTEGER,
  wallet TEXT NOT NULL,
  source TEXT,
  source_kind TEXT NOT NULL,
  requested_from INTEGER,
  requested_to INTEGER,
  state TEXT NOT NULL DEFAULT 'queued',
  lease_until INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at INTEGER,
  searched_from INTEGER,
  searched_to INTEGER,
  range_verified INTEGER NOT NULL DEFAULT 0,
  observed_rows INTEGER,
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_tasks_ready
  ON intelligence_retrieval_tasks(state, next_attempt_at, lease_until, updated_at);
CREATE INDEX IF NOT EXISTS idx_intelligence_retrieval_tasks_wallet
  ON intelligence_retrieval_tasks(wallet, requested_from, requested_to, updated_at DESC);


