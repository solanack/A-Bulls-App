# Cleanup audit — 2026-09-17

Baseline: GitHub main `5a2567158f68fd4fe86d0b266d95d31682cb5d70`.
Roadmap: P0.1 release safety and P0.2 reliable Fomo research connectivity.

## Retired pivots

Case-insensitive searches of tracked source, imports, routes, and tests for
`bull-invaders`, `bull-boss-roster`, `psyop`, shooter/arcade terms, and `LIFE`
found no live retired-game implementation to delete or archive.
The LIFE reference in `workers/worker-vnext-entry.test.mjs` is a negative
regression test requiring the retired API to return 404; retain it.

Expanded inspection of Ansem/Z500 references found historical identifiers,
retained evidence readers, tested identity adapters, and disabled ingestion
code still imported by the research system. These are not unreferenced game
code. Their removal would need a separate dependency/evidence migration.
Production Z500 flags remain false. No galaxy was re-enabled.

`check-worker-migrations.mjs` and `migration-plan.mjs` were inspected.
All applied D1 migration files remain byte-for-byte unchanged. In particular,
the legacy 0025 exception is not permission to rewrite migration history.
No destructive cleanup migration is needed for this pass.
