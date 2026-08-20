CREATE TABLE IF NOT EXISTS launch_events (
  event_id TEXT PRIMARY KEY,
  launch_mint TEXT NOT NULL UNIQUE,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_launch_events_window
  ON launch_events(ends_at DESC, starts_at DESC);

CREATE TABLE IF NOT EXISTS launch_event_claims (
  event_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (event_id, account_id)
);
