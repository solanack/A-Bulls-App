# A BULLS APP — GROK BUILD HANDOFF

Repos: `solanack/A-Bulls-App` (canonical product + Worker) and `solanack/trickshot` (Bull Vision)  
Live: https://abullsapp.com  
Constraint date: 2026-08-26

This file is the implementation spec for Grok Build. Read both repositories, the live site, `wrangler.toml`, `SOURCE_OF_TRUTH.md`, `workers/README.md`, `CHANGELOG_V5_8_0.md`, `integrations/bull-vision/README.md`, and `trickshot/BULL_VISION_V1.md` before changing code. Prefer repairing existing paths over rewriting the app.

## Mission

Turn A Bulls App into Solana’s public memory layer: a read-only product that turns a public wallet, mint, transaction, NFT, or program into a story, a comparison, a short clip, and a reason to return tomorrow.

One sentence the product must serve:

> Paste any public Solana address or mint and get the story, the comparison, the clip, and a reason to come back tomorrow.

Four permanent layers:

1. **Memory** — working indexes and permalinks for wallets, mints, programs, signatures.
2. **Interpretation** — Bull Vision autopsy / what-if / wallet-vs-wallet / LIFE signals / trade movie.
3. **Folklore** — Bull Invaders, daily missions, live launch events generated from real indexed events.
4. **Distribution** — share cards and public pages. No wallet connect.

Do not become a trading terminal. Do not add swaps, signatures, launchpad routing, copy-trade, a token, or commerce.

## Standing non-negotiables

- Read-only. No wallet connect, no signature request, no transaction construction, no movement of SOL or tokens, no Stripe/Play billing.
- `HELIUS_API_KEY` stays server-side only. Never put it in Pages, `config.js`, or browser code.
- Public RPC in `config.js` is fallback only.
- Keep Bullion closed-loop and ranked replay-hash validation.
- Behavior labels come only from observed public chain activity. No identity claims, no medical/psychological claims, no price prediction, no financial advice.
- Hide unfinished surfaces rather than shipping four half-tabs. Replace the visible `PARTIAL` badge with a short product line plus one primary action once the first session works.
- Do not invent CoinGecko / ansem.io command-center placeholders. Path B is authoritative: PumpPortal `subscribeNewToken` + Helius DAS `$ANSEM` holder set + DexScreener pair stats + D1 `ansem_launches`.

## Current system you must repair, not replace

A-Bulls-App:

- Pages front end at repo root / deployed Pages (confirm `SOURCE_OF_TRUTH` vs flattened live tree; use the deployed live source if docs lag).
- Cloudflare Worker: `black-bull-run-sol-api` (`workers/worker.js` and root `worker.js` — determine which is actually deployed).
- Secrets: `HELIUS_API_KEY`, `GOOGLE_CLIENT_ID`, `AUTH_SESSION_SECRET`.
- Bindings that must exist and be used: `LEADERBOARD_DB` (D1), `ANALYTICS_CACHE` (KV, required for indexing), `RATE_LIMITER` if available.
- Cron exists (root wrangler `*/2`, workers wrangler `*/15`). Reconcile to one production cadence that can finish work without abandoning promises.
- Frontend `CONFIG.apiBase` currently points at `https://black-bull-run-sol.ckdsigns1.workers.dev`.
- Live Explore search: wallet, transaction, token, NFT, program.
- Analytics UI currently shows “Loading cached data…” and empty metrics. That is a P0. Indexing and cache hydration are broken or unbound.
- `$ANSEM` mint: `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump`
- Launch overlap rule already specified: 18% unique recipient overlap (min 8 recipients) OR 2.5% of distributed supply to known `$ANSEM` holders. Calibration mint: Catecoin `$CATE` `Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump`.
- Live launch events: 12-minute unranked window only from high-confidence stored launches with `holder-overlap` or `holder-supply-airdrop`.

trickshot:

- Heavy reconstruction service for Bull Vision.
- Routes: `/api/bull-vision`, `/what-if`, `/compare`, `/life-signals`, `/bull-vision/replay`
- CORS already intended for `abullsapp.com` and `www.abullsapp.com`.
- A Bulls App must call trickshot rather than duplicating the archive/candle/PnL engine inside the Worker.

## P0 — Make all indexing work

Goal: every index the product already claims must produce fresh or explicitly stale data, and the UI must show it.

Inventory and turn on every indexer that already exists in Worker / Pages / trickshot, including at least:

1. `$ANSEM` holder scan (Helius DAS `getTokenAccounts`, GPA fallback). Cache 60s fresh / 6h stale. Expose `holderScanComplete` and exact integer when complete.
2. PumpPortal `subscribeNewToken` ingest + `evaluateOverlap` + D1 `ansem_launches` writes. Reconnects must increment a counter and must not throw into public launchpad routes.
3. Live launch events table + `GET /api/events/active` + `POST /api/events/complete`.
4. Unified analytics snapshot: price, 24h volume, 24h tx count, liquidity depth, top-10 holder concentration, total holders. DexScreener is the market source. Helius is the holder/tx source.
5. Public wallet analysis / transaction history used by Explore search and the Intelligence wallet card.
6. Locked rent / unclaimed SOL estimate used by the incinerator pointer (read-only; do not build a claim flow).
7. Leaderboard, daily scores, streaks, crews, Boss Rush isolation (already specified; do not merge modes).
8. Explore particle / search index so wallet, tx, token, NFT, and program lookups resolve to a real object page instead of an empty starfield.
9. Bull Vision request path from A Bulls App → trickshot, with cache so repeat autopsies do not hammer Helius.

Implementation rules for indexing:

- Create/bind `ANALYTICS_CACHE` KV if the code expects it. A missing binding is not an acceptable silent failure. Health must report `cache: bound | missing`.
- Scheduled ingest must await all overlap detection and snapshot writes before the execution context ends. No detached promises.
- Each indexer has states: `fresh`, `stale`, `degraded`, `empty`, `skipped_budget`. The UI must distinguish these. “Loading cached data…” forever is a bug.
- If DexScreener or PumpPortal fail, return stale cache with `degraded: true`. Do not blank the `$ANSEM` / wallet / game tabs.
- Add `GET /api/health` that reports worker version, cron freshness, last successful snapshot timestamps per indexer, Helius budget used, cache binding, D1 binding, and `pumpPortal.reconnects`.
- Add `GET /api/index/status` for the same per-indexer detail so the UI and operators can see what is actually running.
- First-visit Explore must not require a perfect full-chain index. Hydrate the searched object on demand, then write through to cache.
- Permalinks to implement if missing: `/w/<wallet>`, `/m/<mint>`, `/tx/<signature>`, `/p/<program>`. Each renders a readable object card.

## P0 — Helius budget governor at 90%

The Helius key is a finite monthly credit pool plus RPS limits. If credits hit 100%, all indexing and lookups 429 and the product dies. Cap software usage at 90% of the configured monthly credit budget so 10% remains for emergency on-demand lookups and operator debugging.

Implement a single server-side Helius gateway used by the Worker and, if trickshot shares the same key, by trickshot too. If trickshot has a separate key, give it the same governor.

Required env/vars (Worker + trickshot):

- `HELIUS_API_KEY` (secret, already)
- `HELIUS_MONTHLY_CREDIT_LIMIT` (integer, required for the governor; do not hardcode a plan if unknown — read from env)
- `HELIUS_BUDGET_FRACTION=0.90`
- `HELIUS_BILLING_ANCHOR_UTC` (optional, default: first day of current UTC month 00:00)
- `HELIUS_PLAN_RPC_RPS` and `HELIUS_PLAN_DAS_RPS` (optional; if unset, infer conservatively and document the assumption)

Governor behavior:

1. Soft cap = `floor(HELIUS_MONTHLY_CREDIT_LIMIT * 0.90)`.
2. Persist used credits in `ANALYTICS_CACHE` / D1 with atomic increments. Count actual Helius credits, not merely HTTP calls. Use Helius credit weights where documented; if a method weight is unknown, assign a conservative default and log it.
3. Every Helius call goes through one function, e.g. `heliusRequest({ method, credits, class: "rpc" | "das" | "enhanced", priority })`.
4. Priority classes:
   - `critical_interactive`: user-facing search/lookup for an object not in cache
   - `snapshot`: cron analytics / holder scan / overlap
   - `enrichment`: traders list, constellation expansion, cinematic extras
   - `backfill`: historical reconstruction
5. When used >= 80% of monthly limit: pause backfill and enrichment. Continue snapshot at reduced cadence and `critical_interactive`.
6. When used >= 90% of monthly limit: block snapshot, enrichment, and backfill. Allow only `critical_interactive` cache-miss lookups, and only until 95%. Serve stale cache for everything else.
7. When used >= 95%: block all Helius calls. Serve stale cache or a clear degraded payload. Never busy-loop retries against a 429 max-usage error.
8. RPS limiter: stay under 90% of plan RPS for RPC and DAS separately. Queue and coalesce. Batch with `getAssetBatch` / `getMultipleAccounts` where cheaper.
9. On HTTP 429: exponential backoff, honor `Retry-After`, trip a short circuit breaker, and mark the indexer degraded. Do not retry-amplify cron work.
10. Deduplicate in-flight identical requests. Cache holder sets, DAS assets, tx parses, and wallet pages.
11. Prefer PumpPortal + DexScreener + existing D1/KV for market and launch facts so Helius is reserved for holder/DAS/tx work it uniquely provides.
12. Expose in `/api/health` and `/api/index/status`:
    - `monthlyLimit`
    - `softCap90`
    - `usedCredits`
    - `usedPct`
    - `remainingToSoftCap`
    - `remainingToHardStop`
    - `mode`: `normal` | `conserve` | `freeze_index` | `hard_stop`
    - calls last hour by class
13. Add `HELIUS_BUDGET_OVERRIDE_UNTIL` (optional RFC3339) only for a documented emergency; default off.
14. Never log the API key. Never send the key to Pages.

Assume the operator will set `HELIUS_MONTHLY_CREDIT_LIMIT` to their real plan credits (Free 1e6, Developer 1e7, Business 1e8, Professional 2e8, or their exact dashboard number). If the var is missing, refuse to run unbounded Helius scans. Run only cached + DexScreener + PumpPortal and report `budget_unconfigured`.

## P1 — First-session product loop

Once indexes return data, implement one mobile-first path:

1. Landing still uses the starfield, but the search bar is the product.
2. Prefill or offer one example public wallet and one example mint so the first visit is never empty.
3. On submit, resolve the object and open an object card:
   - identity / shortened address
   - last-updated stamp
   - core stats from the now-working index
   - one-paragraph observed story (facts only)
   - actions: Analyze (Bull Vision autopsy if mint+wallet available), Play (start or deep-link Bull Invaders with a mission seeded from this object), Share (existing share-card path)
4. Intelligence tab shows the same card + autopsy/what-if/compare when trickshot is configured via `CONFIG.bullVisionBase`. If trickshot is down, show degraded, do not spin forever.
5. Games tab remains Bull Invaders. Wire daily mission / live event to `GET /api/events/active` when an event exists. Do not add a second game.
6. Create tab becomes publish-only: share card, optional trade-movie hook. Hide dead customization that blocks the first session.
7. Mobile layout for Explore search, object card, and Invaders. The PWA already exists; make the first session usable on a phone.

## P1 — Health, cache, cron reconciliation

- Pick one production cron interval that can complete holder scan + snapshot under the Helius RPS cap. Document it. 2-minute and 15-minute files currently disagree; that is a defect.
- Snapshot writes must be idempotent.
- Pages refresh cadence should follow Worker `updatedAt`, not a fake timer.
- If `ANALYTICS_CACHE` or `LEADERBOARD_DB` bindings are commented out in `wrangler.toml`, add a deploy checklist and fail health checks loudly until they are bound. Do not pretend indexing works without them.

## Implementation order

1. Inventory live Worker vs repo Worker vs Pages. Write a short SOURCE_OF_TRUTH delta in the PR.
2. Helius gateway + 90% governor + health/status endpoints.
3. Bind/use KV + D1; repair cron so snapshots persist.
4. Repair each indexer until `/api/index/status` shows `fresh` or `stale`, not `empty`, for analytics, holders, launches, wallet lookup, and search resolution.
5. Object card + permalinks + first-session flow.
6. Bull Vision integration against trickshot with cache and budget awareness.
7. Live event → Invaders mission.
8. Tests: extend `workers/tests` and any Pages stabilization tests. Include governor tests (80/90/95%), indexer degraded states, and overlap threshold fixtures.

## Acceptance tests

- Visiting abullsapp.com and searching a known wallet or the `$ANSEM` mint returns an object card with timestamps and numbers, not dashes.
- Analytics no longer stays on “Loading cached data…” when the Worker is healthy.
- `/api/health` and `/api/index/status` report bindings, last success per indexer, and Helius `usedPct`.
- With `HELIUS_MONTHLY_CREDIT_LIMIT` set, simulated usage at 90% stops cron Helius work and keeps serving cache.
- Simulated usage at 95% stops all Helius calls.
- Missing `HELIUS_MONTHLY_CREDIT_LIMIT` does not allow unbounded holder scans.
- No browser bundle contains `helius` or the API key.
- No new wallet-connect or transaction code.
- Ranked Bull Invaders scoring and replay-hash behavior unchanged.
- trickshot CORS still allows `abullsapp.com`.
- PumpPortal failure does not 500 the launchpad or Explore routes.

## Deliverable

One focused PR (or two: Worker+Pages, then trickshot gateway if the key is shared) with:

- working indexes
- Helius 90% governor
- first-session object card
- health/status
- deploy notes for wrangler vars: `HELIUS_MONTHLY_CREDIT_LIMIT`, `HELIUS_BUDGET_FRACTION=0.90`, cron, KV, D1

Do not expand scope into tokens, NFT mints, new games, or commerce. Make the memory layer real and keep 10% of Helius in reserve.

## Operator setup before deploy

Set `HELIUS_MONTHLY_CREDIT_LIMIT` to the exact monthly credit number from the Helius dashboard. The governor cannot infer the plan safely if that value is missing.
