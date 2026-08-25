# Bull Data Mesh

Bull Data Mesh removes paid Helius history as a hard dependency. Helius remains a useful adapter, but Bull Intelligence owns normalized public-chain history and provenance.

## Trust boundary

- Public Solana addresses only.
- No wallet connection, signature request, private key, seed phrase, transaction submission, custody, or trading execution.
- Observed transaction relationships are not evidence of common ownership or identity.
- Fast/unfinalized observations must be labeled separately from confirmed/finalized records.
- Simulations remain simulations; descriptive anomaly scores are not predictions.

## Five logical services

1. **Bull Stream** — multi-source live intake. Preferred future source multiplexer: Richat/Yellowstone. Providers are interchangeable.
2. **Bull Historian** — progressive standard-RPC history now; future Substreams SVM and Old Faithful adapters.
3. **Bull Truth Engine** — source provenance, coverage, gap detection, repair and verification.
4. **Bull Lake** — D1 for edge summaries/job state today; Postgres/ClickHouse/R2 when event volume justifies separate infrastructure.
5. **Bull Brain** — existing Bull DNA, LIFE, Radar, Weather, Museum, Time Machine, Ghost Portfolio, Rivalries and Constellation.

## Phase 1: works on the current Cloudflare + free Helius setup

`workers/bull-data-mesh.mjs` uses standard Solana JSON-RPC:

1. `getSignaturesForAddress`
2. bounded `getTransaction` calls
3. normalize wallet SOL/SPL balance changes
4. persist via the existing source-agnostic Intelligence indexer
5. store source provenance and progressive coverage
6. continue later from `cursor_before`

The first request does not attempt a wallet's entire history. Every pass is bounded to protect Worker CPU/runtime and RPC quotas.

Source preference:

1. `BULL_RPC_URL` / `SOLANA_RPC_URL` if configured
2. existing Worker-only `HELIUS_API_KEY`, using standard Helius RPC
3. public Solana RPC fallback

Paid Helius `getTransactionsForAddress` is therefore an optional future acceleration adapter, not a feature gate.

## D1 migration

Apply `workers/migrations/0009_bull_data_mesh.sql` after 0007/0008. It adds only new tables/indexes:

- `bull_index_coverage`
- `bull_index_jobs`
- `bull_event_provenance`
- `bull_source_health`
- `bull_slot_gaps`
- `bull_price_candles`
- `bull_trade_routes`

No existing table is dropped or rewritten.

## Feature flag

`BULL_MESH_ENABLED=true` enables progressive history endpoints. Leave it absent/false until migration 0009 and a compatible Worker build are deployed.

Existing `BULL_INDEXER_ENABLED=true` remains required.

## API additions

- `GET /api/intelligence/mesh-status`
- `POST /api/intelligence/index-coverage` with `{ "wallet": "..." }`
- `POST /api/intelligence/backfill/queue` with `{ "wallet": "...", "pageSize": 25 }`
- `POST /api/intelligence/backfill/pass` with `{ "wallet": "...", "before": "optional-signature", "pageSize": 25, "jobId": null }`

The app should display partial history explicitly, for example:

- `INDEXING`
- `1,438 transactions observed`
- `Coverage: Mar 2022 → present`
- `History is partial` until `complete_to_genesis=1`

Do not convert partial coverage into an invented percentage unless a defensible total denominator exists.

## Phase 2 adapters

### Richat / Yellowstone

Use as Bull Stream. Richat can combine multiple Dragon's Mouth-compatible feeds, deduplicate and expose one downstream stream. The Bull Stream adapter should emit the same normalized event contract consumed by `intelligence-indexer.mjs`.

### Substreams SVM

Use for decoded transfers, balances, DEX routes, NFTs, staking and on-chain candle construction. Map swap hops to `bull_trade_routes` and derived OHLC to `bull_price_candles`.

### Old Faithful

Use as deep historical repair/backfill, not the only production source while its format remains under active development. Store archive/CID evidence in `bull_event_provenance.archive_ref` when available.

## Phase 3 storage split

D1 remains the edge-facing cache/control plane. Move heavy event/time-series workloads when needed:

- Postgres: wallet state, relationships, job/coverage queries
- ClickHouse: swaps, routes, time series, cohort analytics, OHLC, Radar aggregates
- R2: cold/raw immutable payloads

The Worker should query materialized summaries rather than scan a raw event lake.

## Reliability model

Every source observation should record provenance. The Truth Engine can later compare independent sources and mark verified observations. Gap state belongs in `bull_slot_gaps`; never silently claim complete history when a range is missing.

Recommended UI states:

- `LIVE OBSERVATION` — low-latency feed, may not be finalized
- `CONFIRMED` — confirmed RPC record
- `VERIFIED` — reconciled from independent/history source
- `PARTIAL HISTORY` — indexed range is incomplete
- `COMPLETE HISTORY` — only when the selected history source confirms the address has no earlier signatures

## Historical prices and Market Sequence

Substreams-derived swaps can produce price candles from actual on-chain executions. Each candle should retain swap count, unique-wallet count, source set and confidence. Bull Vision can then present a chronological **Market Sequence** around a movement without claiming unsupported economic causation.

## Deployment order

1. Keep production Worker 8.1.1 unchanged while developing/testing this branch.
2. Apply migration 0009 to a backup/test D1 first.
3. Package a Worker build that includes `bull-data-mesh.mjs` and the updated Intelligence extension.
4. Verify legacy endpoints before enabling the mesh.
5. Add normal Worker variable `BULL_MESH_ENABLED=true`.
6. Verify `/api/intelligence/mesh-status`.
7. Test one public wallet with a small `backfill/pass` page.
8. Only then wire automatic UI-driven progressive indexing and scheduled continuation.

The mesh does not require `BULL_ARCHIVAL_ENABLED`; that flag remains reserved for a genuinely configured archival source.
