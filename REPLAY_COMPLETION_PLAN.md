# A Bulls App — Replay Studio + Multichain Data Plane Completion Plan

Date: 2026-09-22
Branch: finish/replay-studio-and-data-plane-20260922
Production: https://abullsapp.com
Repository: solanack/A-Bulls-App

## Mission

Finish the remaining Replay/data/creator work as one production program, not a series of cosmetic patches.

The finished system must:
- reconstruct public trader activity from chain evidence whenever possible;
- distinguish OBSERVED FACT, PROVIDER-REPORTED, DERIVED, USER CLAIM, and UNAVAILABLE;
- pre-index current Fomo trader/token Replay data so the user normally opens a ready Replay;
- support Solana, Base, BSC, Ethereum, Monad, and Robinhood through explicit chain capabilities;
- resolve the actual trade transaction and venue/pool when evidence permits;
- display professional interactive candles/volume with cinematic overlays;
- provide synchronized SFX/music/narration;
- export deterministic social-ready Cuts with a verification path;
- remain read-only: no signing, swaps, custody, copy-trading, or execution.

## Current truth on main

Already present:
- Helius getTransactionsForAddress bounded-window history adapter in intelligence-history-engine.mjs.
- standard Solana RPC fallback.
- Fomo top-50 enrichment and durable closed-trade retention.
- Fomo trade request depth up to 100 with fallback to 25.
- provider tx/entry-tx/exit-tx references retained when supplied.
- separate provider-reported entry and exit lifecycle events.
- bounded EVM receipt verification when a valid transaction hash already exists.
- chain-qualified market/candle storage and CoinGecko/GeckoTerminal hydration.
- scheduled Fomo candle prewarming.
- Replay Studio Research/Cinema presentation.
- cinematic BUY/SELL effects and sound packs.
- optional soundtrack handling for Cuts.

Still incomplete:
- provider-history pagination to exhaustion / historical completeness.
- independent transaction reconciliation when Fomo does not supply a transaction id.
- exact swap/DEX/pool identification from the resolved transaction.
- exact-pool-first historical market reconstruction.
- explicit chain adapter capability contract.
- live streaming data plane (LaserStream / EVM wallet streams) and durable gap repair.
- production-grade Robinhood archive provider + Lighter market adapter.
- professional interactive chart engine (current Replay remains custom SVG).
- unified RESEARCH / CINEMA / EDIT / EXPORT workflow.
- deterministic Canvas + audio-buffer encoder pipeline (current recorder still uses MediaRecorder/captureStream).
- saved Replay styles/templates and Galaxy Dive template.
- end-to-end production coverage gates for every current Fomo trader/token pair.

## Locked execution order

### Phase 0 — Coverage contract and release gates

Build an auditable matrix for every current Fomo trader/token pair:
- chain;
- wallet;
- provider trade lifecycle;
- entry timestamp;
- exit timestamp;
- tx reference;
- independently verified tx;
- decoded swap;
- venue;
- pool;
- historical candles;
- Replay render mode;
- Cut export readiness.

Add hard release diagnostics:
- no duplicate current leaderboard ranks;
- no invalid chain/address pair;
- no provider trade silently omitted from Replay;
- no closed trade represented only by exit;
- no price path fabricated;
- top-winner/loss ranking uses the complete retained current cohort;
- production audit artifact records coverage by chain and failure reason.

Acceptance:
- one machine-readable production artifact shows every current pair and its exact missing capability.

### Phase 1 — ChainAdapter contract

Create a common read-only adapter interface:
- normalizeAddress
- findWalletTokenActivity
- fetchTransaction
- fetchReceipt
- decodeTrade
- resolveVenue
- resolvePool
- fetchHistoricalMarket
- streamCapability
- archiveCapability

Adapters:
- Solana
- Ethereum
- Base
- BSC
- Monad
- Robinhood

Acceptance:
- Replay/reconciliation logic no longer branches directly on provider-specific details.
- adapter status explicitly reports configured / degraded / unavailable.

### Phase 2 — Historical trade discovery

Fomo:
- implement pagination/cursor discovery when provider response exposes a continuation mechanism;
- retain every newly discovered closed trade permanently;
- record provider-history coverage metadata;
- never delete previously retained closed history merely because it falls outside the latest provider page.

Solana:
- use the existing Helius getTransactionsForAddress window adapter with tokenAccounts support for reconciliation windows;
- keep standard RPC as fail-closed repair fallback.

EVM:
- add bounded wallet/token log/receipt search through the chain adapter;
- optionally use GoldRush discovery when GOLDRUSH_API_KEY is configured, but always preserve on-chain verification as the evidence boundary.

Acceptance:
- a provider page limit is no longer presented as complete trader history.
- retained-history coverage is measurable.

### Phase 3 — Transaction reconciliation

When Fomo supplies no transaction reference:
1. take chain + public wallet + token + provider timestamp;
2. search a bounded time/block window;
3. decode candidate swaps/transfers;
4. require wallet + token + direction + time consistency;
5. score candidates deterministically;
6. attach a transaction only above the documented confidence threshold;
7. otherwise remain PROVIDER-REPORTED / UNAVAILABLE instead of guessing.

For closed trades resolve entry and exit independently.

Acceptance:
- matched tx hashes/signatures become OBSERVED FACT.
- unmatched provider events remain clearly provider-reported.
- no identity or coordination inference.

### Phase 4 — Exact venue/pool + market reconstruction

For a reconciled swap:
- decode venue/router/program;
- derive the actual pool when possible;
- store venue/pool on the Research Thread and evidence;
- historical OHLC priority:
  1. exact pool observed in trade,
  2. source-labeled historical pool with strongest liquidity/coverage,
  3. token-level historical OHLC,
  4. provider-reported discrete price points,
  5. event-only time tape.

Robinhood:
- support production RPC via ROBINHOOD_RPC_URL;
- add public Robinhood RPC only as disclosed fallback;
- add optional Lighter adapter for Robinhood Chain Lighter domain markets;
- preserve stock-token underlying reference as a separate, explicitly labeled reference series only.

Acceptance:
- no selected market is silently substituted for the actual trade venue when exact evidence exists.

### Phase 5 — Pre-indexing and live freshness

Solana:
- keep Helius archival backfill;
- add a capability-gated LaserStream/Enhanced-WebSocket ingestion adapter for current watched/current-Fomo wallets;
- use archive backfill for gaps.

EVM:
- add capability-gated wallet stream adapter (GoldRush or provider WebSocket) for current watched/current-Fomo wallets;
- receipts/logs remain evidence source.

Scheduler:
- queue current Fomo pairs by missing capability, not fixed rank;
- advance until current cohort has Replay-ready evidence or a documented unavailable reason;
- budget/circuit-breaker aware.

Acceptance:
- current Fomo trades usually open without waiting for indexing.
- stale-but-disclosed data is preferred to blank provider calls.

### Phase 6 — Professional Replay chart engine

Replace the custom financial-chart foundation with Lightweight Charts 5.x:
- candlesticks;
- volume pane;
- responsive mobile scales;
- pan/zoom;
- visible range controls;
- event markers;
- exact entry/exit markers;
- optional reference series;
- chart primitives for A Bulls cinematic overlays.

Keep A Bulls Canvas/WebGL effects as a presentation layer:
- shockwave;
- impact ring;
- particle burst;
- position ribbon;
- volume pulse;
- receipt lock;
- result reveal.

Acceptance:
- chart interaction remains smooth on target mobile devices.
- effects never alter underlying chart values.

### Phase 7 — Unified Replay Studio UX

One immersive workspace:
- RESEARCH: evidence, receipts, provenance, coverage.
- CINEMA: large clean playback.
- EDIT: scene order, captions, effect intensity, sound pack, narration, soundtrack, pacing.
- EXPORT: aspect ratio, duration, captions, evidence footer, verify URL/QR, render.

Templates:
- Proof Mode
- Galaxy Dive
- Whale Print
- Scale-In Story
- Round Trip
- PnL Reveal
- Minimal Tape

Saved local-first creator styles.

Acceptance:
- user can go from a selected trade to an editable Cut without leaving the Replay context.

### Phase 8 — Synchronized audio

Use a single deterministic timeline:
- BUY/SELL SFX scheduled against Replay time;
- music transport;
- Grey/Trickster narration;
- automatic narration ducking;
- optional haptics;
- accessibility / reduced-motion and mute behavior.

Implement Tone.js only if it improves deterministic scheduling without hurting mobile bundle/performance; otherwise keep a documented Web Audio scheduler with equivalent clock-based guarantees.

Acceptance:
- audio event timing follows the same timeline used by video/effects.

### Phase 9 — Deterministic Cut export

Replace MediaRecorder as the primary export path:
- Canvas-based deterministic frames;
- OfflineAudioContext final mix;
- Mediabunny CanvasSource + AudioBufferSource;
- AVC/H.264 + AAC MP4 where capability permits;
- WebCodecs/capability gate;
- safe fallback to current MediaRecorder only when deterministic encoder capability is unavailable.

Cut Manifest retains:
- chain;
- wallet;
- mint;
- entry/exit tx;
- from/to;
- market/candle source;
- evidence IDs;
- Replay ref;
- narration;
- presentation settings;
- soundtrack metadata;
- created_at;
- video hash;
- verification URL;
- Research Thread ref.

Acceptance:
- identical manifest + evidence produces the same scene timing.
- exported 9:16 Cut is social-ready and reopens verification context.

### Phase 10 — Production validation

Before merge:
- npm test;
- typecheck;
- production frontend build;
- Worker dry-run;
- migrations dry-run;
- mobile/reduced-motion tests;
- deterministic timeline tests;
- adapter unit tests;
- reconciliation fixtures;
- exact-pool market fixtures;
- export capability tests.

After merge:
- apply migrations;
- publish Intelligence Worker;
- publish frontend Worker;
- run live app/resolver checks;
- run multichain evidence checks;
- run full Fomo Replay coverage audit;
- inspect sparse Replay diagnostics;
- verify current top winners/losses;
- verify at least one Replay for each represented chain;
- verify a social Cut export path.

## Definition of done

This program is done only when:
1. all current Fomo trader/token pairs have either a usable Replay or an explicit, evidence-backed unavailable reason;
2. known public trade data is not dropped because of chain/provider-specific assumptions;
3. Replay uses real chain-qualified transaction/market evidence whenever obtainable;
4. the chart is interactive and creator-grade;
5. audio/video timing is synchronized;
6. social export includes verification provenance;
7. repository tests and release gates are green;
8. production is deployed to abullsapp.com;
9. the live production audit confirms the release rather than relying only on CI.

## External credentials

No secret values belong in this file or git.

The implementation must reach the safe boundary even when optional providers are unconfigured. Optional production upgrades may use:
- GOLDRUSH_API_KEY
- ROBINHOOD_RPC_URL (recommended archive-capable provider)
- Robinhood Lighter public API (read-only)
- existing HELIUS_API_KEY
- existing COINGECKO_API_KEY
- existing FOMOAPI_API_KEY

If a required production credential is missing, finish the code/tests first and surface exactly one operator action at the end.
