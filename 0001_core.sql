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

CREATE TABLE IF NOT EXISTS daily_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_key TEXT NOT NULL,
  account_key TEXT NOT NULL DEFAULT '',
  alias TEXT NOT NULL,
  score INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  bosses_defeated INTEGER NOT NULL DEFAULT 0,
  boss_id TEXT NOT NULL,
  modifier TEXT NOT NULL,
  replay_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
DELETE FROM daily_scores
WHERE id NOT IN (SELECT MIN(id) FROM daily_scores GROUP BY day_key, account_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_one_account_day ON daily_scores(day_key, account_key);
CREATE INDEX IF NOT EXISTS idx_daily_day_score ON daily_scores(day_key, score DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS player_streaks (
  account_key TEXT PRIMARY KEY,
  streak_count INTEGER NOT NULL DEFAULT 0,
  streak_last_completed_date TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS boss_medals (
  account_key TEXT NOT NULL,
  boss_id TEXT NOT NULL,
  no_damage INTEGER NOT NULL DEFAULT 0,
  under_time INTEGER NOT NULL DEFAULT 0,
  no_continue INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_key, boss_id)
);
CREATE TABLE IF NOT EXISTS crews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crew_members (
  crew_id TEXT NOT NULL,
  account_key TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (crew_id, account_key)
);
CREATE TABLE IF NOT EXISTS community_goals (
  week_key TEXT PRIMARY KEY,
  metric TEXT NOT NULL DEFAULT 'bosses_defeated',
  progress INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER NOT NULL DEFAULT 10000,
  unlocked INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cosmetic_unlocks (
  account_key TEXT NOT NULL,
  cosmetic_id TEXT NOT NULL,
  source TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  PRIMARY KEY (account_key, cosmetic_id)
);
CREATE TABLE IF NOT EXISTS leaderboard_seasons_archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  alias TEXT NOT NULL,
  score INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  kills INTEGER NOT NULL,
  bosses_defeated INTEGER NOT NULL,
  replay_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  archived_at TEXT NOT NULL
);
