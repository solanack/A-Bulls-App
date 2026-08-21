# A Bulls App Worker 5.9.0

This Worker matches Pages 7.9.0. It extends the existing PumpPortal + Helius `$ANSEM` overlap detector with short-lived launch events and adds an isolated Boss Rush leaderboard. It does not connect a wallet, request a signature, create a transaction, move crypto, or alter Bullion's closed-loop model.

## Live Launch Events

- The existing `subscribeNewToken` ingest and `evaluateOverlap` logic remain authoritative.
- Only a high-confidence stored launch containing `holder-overlap` or `holder-supply-airdrop` can open an event. Raw PumpPortal creations and seed rows cannot trigger one.
- The event window lasts 12 minutes and references the triggering `ansem_launches` row by mint instead of duplicating launch analytics.
- `GET /api/events/active` returns either the active event or `{ "active": false }` as a normal state.
- `POST /api/events/complete` grants one event-specific cosmetic finish through an idempotent D1 claim. Live Event play is always unranked.
- The scheduled ingest now awaits all overlap-detection work before its execution context finishes, so event/table writes cannot be abandoned by a detached promise.

## Boss Rush

- Uses the existing 19-boss original roster, combat, hitboxes, ship tiers, projectile rules, and renderer.
- Bosses run back-to-back and difficulty multiplies by `1.06` after every defeat.
- The score is the boss streak. It is submitted through the existing challenge/hash validation under `bull-invaders-boss-rush`.
- Boss Rush rows cannot appear in the regular `bull-invaders` leaderboard.

## Mobile-friendly deployment

1. Keep your existing Worker project, bindings, variables, and secrets.
2. Open the D1 database in Cloudflare and run `migrations/0003_live_launch_events.sql`, or run:

   ```sh
   npx wrangler d1 migrations apply black-bull-run-leaderboard --remote
   ```

3. Deploy this folder's `worker.js`.
4. Confirm `/api/health` reports `5.9.0` and `services.liveLaunchEvents` is `true`.
5. Open `/api/events/active`. Seeing `{ "ok": true, "data": { "active": false } }` is correct when no confirmed launch is active.
6. Deploy the Pages 7.9.0 ZIP only after the Worker check passes.

Do not create a second D1 database. The event tables belong in the same database already bound as `LEADERBOARD_DB`.
