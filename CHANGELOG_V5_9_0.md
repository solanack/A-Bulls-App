# Worker 5.9.0 / Pages 7.9.0 verification changelog

Standing constraints preserved: no wallet signature or crypto payment path; Ranked hitbox/scoring unchanged; Bullion remains closed-loop; rewards are cosmetic-only.

## Changes

- Added D1 `launch_events` and `launch_event_claims` tables through migration `0003_live_launch_events.sql`.
- Opens a 12-minute event only from a high-confidence holder-overlap signal already accepted by the production detection pipeline.
- Added public active-event lookup and authenticated, idempotent cosmetic completion routes.
- Added an iconographic hub badge that is absent when no event is active.
- Added a launch-tinted, single-boss bonus round tied to the detected mint; its score is never submitted to Ranked.
- Added Boss Rush to the existing mode picker and leaderboard system with game key `bull-invaders-boss-rush`.
- Added 19-boss cycling, `×1.06` per-boss escalation, short between-boss transitions, and existing-system power replenishment.
- Fixed scheduled ingest to await every asynchronous token evaluation before the Worker execution ends.

## Mandatory verification

1. **PASS — automated integration:** a simulated real PumpPortal new-token message followed by Helius holder-overlap confirmation creates an event during the same scheduled ingest. Its exact 12-minute window is asserted. **Production observation remains a deploy-time check** because a real qualifying launch cannot be manufactured for QA.
2. **PASS:** the public response and client badge are active only inside the D1 window; expiry produces `{ active: false }`, hides the badge, and late reward claims return HTTP 410.
3. **PASS:** the event reward is an event-specific cosmetic, claims are idempotent, and the response is explicitly `leaderboardEligible: false`. No live-event leaderboard submission path exists.
4. **PASS:** 40-boss sequencing cycles the complete 19-character roster, difficulty rises after every defeat, and a signed Boss Rush result appears only under `bull-invaders-boss-rush`.
5. **PASS:** Boss Rush calls the existing boss/combat/render path. All five tier hitboxes compare pixel-identical and projectile/rocket counts pass the existing formation rules.

## Commands run

```sh
node worker/tests/stabilization.test.mjs
node worker/tests/live-events-boss-rush.test.mjs
node tests/pages-v7.9.test.mjs
```
