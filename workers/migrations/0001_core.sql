CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  alias TEXT NOT NULL,
  score INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  bosses_defeated INTEGER NOT NULL DEFAULT 0,
  replay_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_score ON leaderboard_scores(game, score DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS run_submissions (
  challenge_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  replay_hash TEXT NOT NULL UNIQUE,
  game TEXT NOT NULL,
  mode TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_run_submissions_account_created ON run_submissions(account_id, created_at DESC);


