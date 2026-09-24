-- A Bulls App — retained public posts for the dated Replay social strip.
-- Rows are written only by a licensed/official ingest. Page reads are D1-only.
-- A post is context for a date, never the claimed reason for a print.

CREATE TABLE IF NOT EXISTS social_posts_retained (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'x',
  source_kind TEXT NOT NULL,
  handle TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'public',
  author_role_source TEXT,
  linked_wallet TEXT,
  linked_wallet_source TEXT,
  posted_at INTEGER NOT NULL,
  full_text TEXT NOT NULL,
  url TEXT,
  mint TEXT,
  chain_key TEXT,
  symbol_lc TEXT,
  retained_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_social_posts_mint_time ON social_posts_retained(mint, posted_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_symbol_time ON social_posts_retained(symbol_lc, posted_at);
