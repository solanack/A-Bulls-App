# A Bulls App v8.6.1 — Intelligence Release

Release branch: `release/v8.6.1-intelligence`

Target runtime:
- Pages: `8.6.1`
- Worker: `8.1.1`

## Release state

The Bull Intelligence feature branch has been merged into the v8.6 release line. The dedicated v8.6.1 release gate passes syntax, unit/contract tests, migration safety, read-only guardrails, and Ranked-isolation checks.

## Safe production order

1. Back up the live D1 database.
2. Apply `workers/migrations/0007_bull_intelligence.sql`.
3. `0008_bull_nft_intelligence.sql` may also be applied because it is additive, but `BULL_NFT_INDEXER_ENABLED` must remain off until a normalized NFT ingest source is intentionally configured.
4. Deploy Worker 8.1.1 with all intelligence flags initially off.
5. Verify health and existing wallet/leaderboard/analytics endpoints.
6. Set `BULL_INDEXER_ENABLED=true` only after migration 0007 is confirmed.
7. Keep `BULL_ARCHIVAL_ENABLED` off on the current free data tier.
8. Seed observed indexing by analyzing public wallets through the existing wallet analytics path.
9. Verify Intelligence capabilities, wallet summary, Radar and Weather responses.
10. Deploy Pages 8.6.1.

## Truth and safety contract

- Public addresses only; no signing, custody or transaction execution.
- Partial indexed history is never presented as complete lifetime history.
- Wallet relationship edges never prove common ownership or real-world identity.
- Historical P&L/counterfactuals remain unavailable when defensible price history is missing.
- Solana Weather is descriptive and cosmetic. Campaign may react visually; Ranked scoring, hitboxes, collisions, spawn rates, weapons, movement, timers and replay state do not change.

## Deferred activation

- `BULL_ARCHIVAL_ENABLED`: leave off until a real archival source is configured.
- `BULL_NFT_INDEXER_ENABLED`: leave off until migration 0008 plus a normalized NFT event ingest source are ready.
