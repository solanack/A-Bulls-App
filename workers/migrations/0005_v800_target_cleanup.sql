-- v8.0 upgrade cleanup. All tables below exclusively served removed systems.
DROP TABLE IF EXISTS launch_event_claims;
DROP TABLE IF EXISTS launch_events;
DROP TABLE IF EXISTS ansem_launches;

DROP TABLE IF EXISTS bullion_entitlements;
DROP TABLE IF EXISTS bullion_transactions;
DROP TABLE IF EXISTS bullion_balance;

DROP TABLE IF EXISTS cosmetic_unlocks;
DROP TABLE IF EXISTS leaderboard_seasons_archive;
