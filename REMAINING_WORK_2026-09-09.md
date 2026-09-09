# A Bulls App — Remaining Work / Production Activation

**Updated:** 2026-09-09  
**Branch:** `main`  
**Baseline before this document:** `fbe688073764a05d29dcee0582814a651bffdbdc`  
**Release gate:** GREEN — release baseline, TypeScript, full repository tests, production frontend build, and Intelligence Worker bundle all passed.

This is the handoff list for work that is genuinely still incomplete after the consolidated Master Plan implementation pass. It intentionally separates repository/product work from external activation and physical-device acceptance. Do not treat an external prerequisite as a reason to redesign a working subsystem.

## Completed / protected baseline

- Stable Seeker-oriented WebGL Field remains the renderer. Do not replace it with Canvas 2D, a generic graph renderer, or a whole-app WebGPU/R3F rewrite.
- Galaxy Zero / Fomo / pump.fun / PonsFamily product direction and read-only execution boundary remain locked.
- Token PLANET → retained holder STAR system exists with D1/cache-first behavior and honest empty coverage.
- Fomo trader STAR systems expose bounded provider-reported positions and retained trade context with source separation.
- Deterministic wallet × mint matched rounds exist; unmatched sells do not receive invented basis.
- Research Thread context is persistent/shareable and carries selected round, window, receipts, Replay state, Ghost/Cut references.
- Replay supports retained candles when available, entry/exit markers, play/pause/seek/step/speed, and Evidence jumps. Missing OHLC remains missing; no price path is invented.
- Trickster is chart-first and receipt-bound, validates a bounded manifest, separates observed claims from interpretation, and exposes VERIFY state.
- Index is first-class and searchable with Study Trader / Study Token / matched-round descent, provenance/coverage, Ghosts, sequences and fingerprint research.
- My Sky supports local-first token PLANETS, wallet STARS, Research Threads and Cut references. Non-market references do not contaminate market-sky admission.
- Ghost is historical similarity, not prediction, and keeps deterministic criteria/receipts/Replay context.
- Behavioral fingerprints are deterministic observed dimensions, not a trader score.
- Relationship constellations and sequences are evidence graph primitives; shared exposure is not represented as common ownership or coordination.
- Full-chain stream bridge exists behind a feature flag with bounded event/wallet limits, gap detection and observed-vs-verified slot separation.
- Latest release gate is green.

## Remaining repository/product work

### 1. Production-grade Cut video export

The current Trickster manifest/VERIFY path is the truth contract, but final deterministic MP4 export still needs the planned capable-device media pipeline.

- Add lazy/capability-gated Mediabunny + WebCodecs/Canvas export.
- Preserve the existing chart/Field rather than introducing a second renderer.
- Export target: shareable vertical 1080×1920 where supported, with deterministic fallback.
- Burn/attach evidence footer, captions, Cut ID and VERIFY URL/QR without changing the frozen evidence manifest.
- Index the resulting video hash/storage URL against the existing Cut object.
- Add mobile memory/thermal failure handling and explicit “export unavailable” state rather than degrading evidence.

### 2. Upstream continuous Solana ingestion activation

The Worker-side full-chain bridge is present but intentionally disabled until a real upstream exists.

- Provision Carbon and/or Yellowstone gRPC upstream ingestion service.
- Normalize live and backfill events through the same parser contract.
- Feed the existing authenticated `/api/internal/intelligence/full-chain-stream` bridge.
- Configure `INTELLIGENCE_MESH_INGEST_TOKEN` on both ends; never commit it.
- Enable `FULL_CHAIN_STREAM_ENABLED` only after staging validation.
- Validate gap detection, missing-slot repair, independent verification/finality and restart recovery.
- Expose last observed slot, last verified slot, known missing ranges and recovery state to Grey/Replay/Evidence/Index where applicable.

### 3. Signed-in durable My Sky sync + meaningful-change notifications

Local-first My Sky works without an account. Cross-device durability and alerts still require finishing the account-bound path.

- Extend the durable social watchlist subject contract to Research Threads and Cuts as well as wallet/token subjects.
- Use the existing account/auth boundary; do not weaken auth or pass frontend session cookies insecurely to the Intelligence Worker.
- Prefer a same-origin/service-binding authenticated path for durable writes.
- Add meaningful-change evaluation for new watched STAR activity, significant retained PLANET activity, round exit completion, material evidence change, and evidence-backed references.
- Alerts are observational only and must deep-link to the exact Field/Index/Research Thread context.
- Do not create a generic engagement notification feed.

### 4. Bind My Star — mobile-only MWA address authorization

This remains the one approved wallet-adapter exception.

- Add Solana Mobile Wallet Adapter only to the mobile/Seeker build.
- Authorization may disclose/select a public address and navigate to that STAR/history.
- No transaction signing, swaps, approvals, custody, copy trading, token creation or execution.
- Do not imply real-world identity or ownership beyond what the authorization establishes.
- Keep default web use fully functional without a wallet connection.
- Optional Seeker Star treatment must remain cosmetic and confer no financial privilege.

### 5. Optional local Evidence Pack analytics

This is useful but not required to activate production.

- Lazy-load DuckDB-Wasm only when a bounded Evidence Pack exists and the device budget permits it.
- Candidate local calculations: What-If, sequence scans, hold-window calculations and scale-in/out analysis.
- Evidence Pack data must retain source/timestamps/receipts.
- Deterministic calculations remain authoritative; no local model may invent chain facts.

### 6. Optional deeper relationship/search engines

- Graphology can replace ad-hoc analysis internals for larger wallet↔token graphs while the existing Field remains the visual renderer.
- Transformers.js may later provide capability-gated semantic evidence retrieval, never fact generation.
- Automerge/local-first collaboration belongs after account-bound Research Thread semantics are stable.
- These are enhancements, not launch blockers.

## External activation / owner or infrastructure prerequisites

### Cloudflare production deployment

The repository is release-gate green, but production cannot be certified until Cloudflare account access/billing is restored and the deploy workflow succeeds.

After billing/account authorization is restored:

1. Re-run the latest `Deploy Cloudflare` workflow from `main` if it did not automatically succeed.
2. Confirm all required D1 migrations apply in production.
3. Confirm frontend Worker/Pages and Intelligence Worker publish from the same `main` SHA.
4. Verify production variables/secrets are present without printing them: allowed origins, Intelligence ingest secret where used, FomoAPI key, ElevenLabs key, provider credentials, service bindings and D1 bindings.
5. Keep the full-chain stream feature disabled until its upstream is actually provisioned.
6. Perform live checks on `abullsapp.com` and the Intelligence Worker health/read endpoints.
7. Verify no Cloudflare Access/Zero Trust policy unintentionally blocks the public site/Worker.
8. Only after these checks may the deployed SHA be called production-live.

### Third-party/provider prerequisites

- Fomo live refresh requires a valid authorized `FOMOAPI_API_KEY`.
- Premium server Grey voice requires `ELEVENLABS_API_KEY`; browser speech remains fallback.
- Continuous Carbon/Yellowstone indexing requires the upstream service/endpoint plus its credentials and the shared ingest secret.
- Provider budget/credit breakers must remain enabled; do not increase spend simply to make an empty view look populated.

## Physical Seeker / mobile acceptance — required before store/hackathon certification

CI being green does not certify the physical renderer.

Test on the actual target phone after production deploy:

- cold load and warm reload of `abullsapp.com`;
- Galaxy Zero → Fomo → trader STAR → position PLANET → holder/trade context;
- token PLANET → holder sky → STAR selection;
- matched round → Replay → Evidence → Ghost → Trickster → VERIFY → My Sky;
- camera touch/drag/pinch and one-handed controls;
- background/resume, orientation changes and browser tab restoration;
- repeated navigation without WebGL context loss/black screen;
- no blurry canvas caused by incorrect DPR/layout sizing;
- memory/thermal behavior during a longer session;
- installable Android/PWA/TWA path as applicable;
- signed Android package must reuse the existing release keystore and correct `assetlinks.json` fingerprint.

Record device/browser/build/SHA for any failure. Fix the smallest reproducible lifecycle issue; do not reintroduce global WebGL monkey patches.

## Production verification checklist

A release is done only when all applicable items are true:

- [x] `main` release baseline passes.
- [x] TypeScript passes.
- [x] Full repository tests pass.
- [x] Production frontend build passes.
- [x] Intelligence Worker bundle passes.
- [ ] Cloudflare deployment succeeds from current `main`.
- [ ] Production D1 migrations verified.
- [ ] `abullsapp.com` live SHA/functionality verified.
- [ ] Intelligence Worker live health/read paths verified.
- [ ] Fomo/PonsFamily scheduled refresh verified with real retained rows.
- [ ] Grey production voice checked when ElevenLabs is configured.
- [ ] Physical Seeker canonical descent passes without renderer regression.
- [ ] Store/TWA package sanity checked if shipping Android build.
- [ ] Continuous full-chain ingestion enabled only after upstream staging validation.

## Non-blocking later roadmap

These remain legitimate future work but should not be confused with defects in the current core research descent: richer public Research Thread collaboration/forks/counter-theses, larger-scale graph analytics, local semantic retrieval, local-first collaboration, public API/SDK after contracts stabilize, and deeper creator research surfaces.

## Do not regress

Do not restore Bull Invaders, LIFE, wallet execution, copy trading, swaps, native token/staking mechanics, generic social-feed product direction, invented prices/cost basis/holders, “alpha”/“smart money” claims, or a renderer rewrite. Missing evidence is a valid product state.
