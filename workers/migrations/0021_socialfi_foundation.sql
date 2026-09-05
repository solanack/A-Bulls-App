-- A Bulls App SocialFi foundation.
-- Social content may be written only by authenticated A Bulls App accounts.
-- Public wallet addresses remain observed subjects and never imply ownership.

CREATE TABLE IF NOT EXISTS social_profiles (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  account_kind TEXT NOT NULL DEFAULT 'member' CHECK(account_kind IN ('member','creator','project','moderator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','limited','suspended','deleted')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS social_observed_wallets (
  profile_id TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  public_address TEXT NOT NULL,
  label TEXT,
  relationship TEXT NOT NULL DEFAULT 'watching' CHECK(relationship IN ('watching','disclosed','verified-control')),
  verification_state TEXT NOT NULL DEFAULT 'unverified' CHECK(verification_state IN ('unverified','pending','verified','revoked')),
  verification_receipt TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(profile_id,chain_id,public_address),
  FOREIGN KEY(profile_id) REFERENCES social_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  parent_id TEXT,
  kind TEXT NOT NULL DEFAULT 'post' CHECK(kind IN ('post','observation','alert','creator-note')),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 420),
  galaxy_id TEXT,
  token_id TEXT,
  evidence_id TEXT,
  coverage TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','limited','removed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY(author_id) REFERENCES social_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY(parent_id) REFERENCES social_posts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_social_posts_feed ON social_posts(status,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_token ON social_posts(token_id,created_at DESC);

CREATE TABLE IF NOT EXISTS social_follows (
  follower_id TEXT NOT NULL,
  followed_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','muted','blocked','removed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(follower_id,followed_id),
  CHECK(follower_id<>followed_id),
  FOREIGN KEY(follower_id) REFERENCES social_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY(followed_id) REFERENCES social_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_reactions (
  profile_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK(reaction IN ('signal','bullish','caution','evidence')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','removed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(profile_id,post_id,reaction),
  FOREIGN KEY(profile_id) REFERENCES social_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_watchlists (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','unlisted','public')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY(owner_id) REFERENCES social_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_watchlist_items (
  watchlist_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL CHECK(subject_kind IN ('wallet','token','galaxy','creator')),
  chain_id TEXT,
  subject_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(watchlist_id,subject_kind,subject_id),
  FOREIGN KEY(watchlist_id) REFERENCES social_watchlists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_reputation_snapshots (
  profile_id TEXT NOT NULL,
  window_key TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  evidence_accuracy REAL,
  useful_signals INTEGER NOT NULL DEFAULT 0,
  harmful_signals INTEGER NOT NULL DEFAULT 0,
  methodology_version TEXT NOT NULL,
  computed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(profile_id,window_key),
  FOREIGN KEY(profile_id) REFERENCES social_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL CHECK(subject_kind IN ('profile','post','link')),
  subject_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER,
  FOREIGN KEY(reporter_id) REFERENCES social_profiles(id) ON DELETE CASCADE
);

