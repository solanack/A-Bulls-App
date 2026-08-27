# A BULLS APP — Z500 / PUMP.FUN INDEXER CONTINUATION
## Continuation checkpoint — August 26/27, 2026

You are continuing an active deployment/debugging session for my project, A Bulls App.

IMPORTANT: I am not technical and I am doing everything from an Android phone using Termux + Ubuntu/proot. Give me ONE command/block at a time when troubleshooting. Wait for my screenshot/output before proceeding unless I explicitly ask for all remaining instructions. Do not make me repeat work already completed below.

## Current production infrastructure

- App: A Bulls App
- Primary Worker: `black-bull-run-sol`
- Worker URL: `https://black-bull-run-sol.ckdsigns1.workers.dev`
- Platform: Cloudflare Workers
- Deployment: Termux → proot Ubuntu → Wrangler
- Wrangler: 4.126.0
- Node: v22.23.2
- Working directory: `/root/workers-z500/workers`
- Z500 package root: `/root/workers-z500`

## What we just deployed

The new Z500 / Pump.fun Top-10 indexing Worker successfully deployed.

Current Version ID at deployment: `3accba8d-aaeb-4ae5-ae44-8c8757d557ee`

Cron: `* * * * *` — scheduled handler runs every minute.

## Build fixes already completed

Required files were restored into the Z500 package:

- `/root/scripts/reconstruct-worker-8.2.0.mjs` → `/root/workers-z500/scripts/reconstruct-worker-8.2.0.mjs`
- `/root/js/trickster-story-manifest.mjs` → `/root/workers-z500/js/trickster-story-manifest.mjs`

After restoration, Wrangler dry-run succeeded. Do not repeat these repairs unless the files are actually missing.

## Worker build architecture

`wrangler.production.toml` uses a custom build. The reconstruction script verifies Worker 8.2.0 provenance and generates `workers/worker-baseline-retained.mjs`. The next-generation entry is `workers/worker-vnext-entry.mjs`.

The entrypoint's scheduled handler calls both `cleanupLeaderboard(env)` and `handleIntelligenceScheduled(env)`.

`handleIntelligenceScheduled()` calls `runIntelligenceMeshScheduler(env, { limit })`, then conditionally performs Universe cleanup, Trickster cleanup, and — when `PUMP_INDEX_ENABLED=true` — `maintainPumpIndex(env)`.

Therefore the every-minute cron is NOT empty.

## Important environment configuration

- `PUMP_INDEX_ENABLED = "true"`
- `PUMP_INDEX_SOURCE = "ansem-z500"`
- `PUMP_STREAM_ENABLED = "false"`
- `PUMP_ACTIVE_TOKEN_LIMIT = "10"`
- `PUMP_MONTHLY_CREDIT_BUDGET = "1000000"`
- `PUMP_BUDGET_WARNING_PERCENT = "60"`
- `PUMP_BUDGET_HARD_STOP_PERCENT = "80"`
- `PUMP_RANK_REFRESH_MINUTES = "15"`
- `PUMP_RAW_RETENTION_HOURS = "72"`
- `PUMP_CANDLE_RETENTION_DAYS = "365"`
- `PUMP_INGEST_CREDIT_MODE = "webhook"`
- `PUMP_HELIUS_WEBHOOK_ID` is configured
- `INTELLIGENCE_MESH_ENABLED = "true"`
- `MARKET_BACKFILL_QUEUE_ENABLED = "true"`
- `INTELLIGENCE_SCHEDULER_BATCH_SIZE = "3"`
- `INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED = "false"`
- `INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED = "false"`
- `INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED = "false"`
- `UNIVERSE_ENABLED = "true"`
- `TRICKSTER_SHARE_ENABLED = "false"`
- `PLAYABLE_DATA_ENABLED = "true"`
- `BULL_INDEXER_ENABLED = "true"`
- `BULL_NFT_INDEXER_ENABLED = "false"`
- `BULL_ARCHIVAL_ENABLED = "false"`

## Helius credit situation — critical

Avoid unnecessary Helius requests. Earlier Worker Pump endpoint attempts returned `error code: 1027`. Do not repeatedly curl production endpoints while the Helius allowance/quota is exhausted. Diagnose scheduled code locally first.

The Helius plan is approximately $49/month. The indexer must be bounded and credit-safe.

## Intended Pump.fun architecture

1. Identify/rank approximately the top 10 actively traded Pump.fun tokens.
2. Maintain a bounded active set of 10.
3. Index detailed raw trades only while a token belongs to the active set.
4. Raw trade retention: 72 hours.
5. Candle/aggregate retention: 365 days.
6. Prefer Helius webhook ingestion rather than constant polling.
7. Rank refresh: approximately every 15 minutes.
8. Monthly budget: 1,000,000 credits.
9. Warning threshold: 60%.
10. Hard-stop threshold: 80%.
11. Expensive ingestion should stop at the hard-stop rather than unexpectedly consume more credits.
12. Historical wallet intelligence is broader and must not turn Pump Top-10 into an unbounded full-chain indexer.

## Why we stopped

`PUMP_STREAM_ENABLED=false` does NOT disable all Pump indexing activity. Because `PUMP_INDEX_ENABLED=true`, the every-minute scheduled handler still calls `maintainPumpIndex(env)`. The Intelligence Mesh scheduler also runs from every scheduled invocation.

We stopped before changing anything because the actual scheduled functions need inspection.

## NEXT STEP — START HERE

Do NOT deploy anything yet. Do NOT curl production Pump endpoints yet. Do NOT change Cloudflare settings yet.

First inspect the two scheduled functions locally:

```bash
cd /root/workers-z500/workers && \
echo "=== PUMP MAINTENANCE ===" && \
grep -n -B 10 -A 120 -E "export async function maintainPumpIndex|async function maintainPumpIndex" intelligence-pump-top10.mjs && \
echo "=== MESH SCHEDULER ===" && \
grep -n -B 10 -A 180 -E "export async function runIntelligenceMeshScheduler" intelligence-mesh-scheduler.mjs
```

Have me run that command and send the screenshot/output. Analyze the actual implementation before recommending changes.

## Questions to determine

Determine whether `maintainPumpIndex()` makes Helius/API/network calls every cron, whether it honors the 15-minute rank interval, what the Mesh scheduler does each minute, whether it can make Helius calls, whether queued history jobs can consume Helius despite external/history flags being false, whether market backfill adds API usage, whether the one-minute cron is unnecessarily aggressive, whether separate scheduling is preferable, whether the budget guard blocks requests before spending, whether webhook ingestion is truly primary, whether `PUMP_STREAM_ENABLED=false` is correct in webhook mode, and whether the implementation can index materially more than the top 10 tokens.

## Do not break existing systems

Do not casually replace/rewrite the Worker. The retained 8.2.0 baseline preserves production functionality including authentication/system routes, Bull Invaders, leaderboard, Intelligence, wallet analysis, NFT functionality, Universe, Trickster, Replay, market replay/backfill, wallet token indexing, event market context, Intelligence Mesh, and related infrastructure. Pump changes must be surgical.

## Database/indexing observation

Pump endpoints use D1 tables including `pump_trades`, `pump_candles`, `pump_tokens`, and `pump_active_tokens`. Pump wallet history queries `pump_trades` and currently represents Pump Top-10 observations only. A wallet may legitimately show no Pump data if it did not trade a bounded active token during retained coverage. This is not intended to become an unlimited historical Pump wallet database.

## Working style

Everything is being done from a phone. Give one exact command at a time, interpret the returned output, explain changes before making them, preserve existing functionality, dry-run before deployment, and minimize production verification requests.

Optimize for: safety + Helius credit efficiency + Top-10 data quality + reliability + phone-friendly deployment.

## First response when resuming

Do not give a recap. Start by giving the local inspection command from the NEXT STEP section and ask me to send its output.
