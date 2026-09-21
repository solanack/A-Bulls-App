# A Bulls App production release review — 2026-09-21

## Verified production baseline

The current production baseline covered by this review is:

- GitHub `main`: `7688665cfe6a6c12d56d162c384a060a049e7193`
- Main release gate: GitHub Actions run `35660603868` — passed
- Deploy Cloudflare: GitHub Actions run `35660603738` — passed
- Both Workers published successfully.
- Post-deploy public application/resolver checks passed.
- Multichain evidence spine passed.
- Multichain D1 population capture passed.
- Sparse Replay diagnostic passed.
- Replay history source-health capture passed.

This supersedes the old operational statement in `REVIEW_2026-09-08.md` that GitHub Actions could not deploy for lack of Cloudflare credentials. That statement remains historically correct for that older review; it is not current production state.

## Product invariants preserved

The September production work did not change the locked safety model:

- no wallet connection or ownership proof;
- no transaction signing;
- no swaps, execution, copy trading, token launch, liquidity actions, or custody;
- no fabricated candles, prices, exits, wallet identity, cost basis, holdings, PnL, or performance claims;
- no Bull Invaders or LIFE reintroduction;
- the native Three/WebGL Field remains the renderer;
- missing evidence remains unavailable rather than zero;
- provider-reported values remain distinct from observed facts;
- Grey factual narration and Trickster interpretation remain separate roles.

## Data Reliability phases

### Phase 1 — production secret audit

Provider-secret coverage is now part of the normal release gate rather than a manual grep-only exercise.

The secret audit uses exact environment identifiers, alias/fallback groups, and feature-gated requirements. It reports configured/missing state without exposing secret values. False prefix matches such as feature flags that merely contain `TOKEN` in their names no longer become fake missing-secret failures.

A production release fails loudly when an enabled provider path lacks a required secret instead of silently degrading after deployment.

### Phase 2 — provider budget visibility

Provider-budget accounting and diagnostics are active. Budget reservation/block decisions are retained or logged rather than disappearing into a generic empty result. Internal diagnostics expose current reservation/call state versus the configured hard limit without leaking provider credentials.

Configured plan limits are treated as configuration/account facts, not inferred from public pricing pages. The code does not claim a provider quota it cannot verify from production configuration or provider-reported usage.

### Phase 3 — provider fetch resilience

The shared provider fetch layer now supports bounded provider-specific timeout/retry behavior, including retry/backoff for retryable 429 and 5xx responses.

Empty/degraded results keep calm user-facing disclosure but carry distinct machine-readable causes for:

- genuinely no retained evidence;
- provider failure/timeout;
- provider budget exhaustion.

These causes no longer collapse into one indistinguishable empty state in diagnostics.

### Phase 4 — production deployment truth

GitHub Actions has working Cloudflare release credentials and the guarded deployment path is active.

The production workflow now validates the exact tested artifact, pending migrations, a retained Replay fixture, and pre-mutation evidence before publishing. After publication it verifies public routes, the multichain evidence spine, D1 population, sparse Replay behavior, and history source health.

A historical `solana-public-rpc` HTTP 403 source-health row may remain in retained diagnostics, but production is not configured to depend on that unauthenticated public RPC as its archival history path. Valid Solana history requests are guarded before provider calls, and Helius history paths are the active provider path when configured.

## Multichain Fomo parity

The wallet/token research path is no longer Solana-only.

The current Fomo coverage target set is:

- Solana
- Base
- BNB Chain / BSC
- Ethereum
- Monad
- Robinhood Chain

Production verification shows retained assets, market snapshots, and chain events across all six targets.

Chain identity is preserved through:

`chain + token/contract + wallet + timestamp`

The token-system backend no longer returns an automatic empty sky merely because an asset is EVM-based. Chain-qualified retained events are used to construct wallet STARS and recent trade COMETS.

For EVM chains:

- SOL-valued fields stay unavailable rather than being invented;
- USD value is shown only where retained price data supports it;
- provider-reported rows remain provider-reported;
- wallet/token context carries `chainKey` into Replay/Evidence/Trickster research state.

Permanent production smoke now rejects unsupported chain keys, lost chain identity, and invented EVM SOL valuation.

## ASK wallet → STAR research

The ASK/query flow can now transition a resolved public wallet into its research system.

The queried wallet becomes the central STAR. Up to ten token PLANETS are built from retained wallet/token observations, ranked by indexed trade/event activity. Solana and retained EVM wallet evidence use the same evidence-first model.

If the public address has no retained wallet/token evidence, the STAR still opens but the surrounding sky remains honestly empty. The system does not invent holdings merely to make the universe look populated.

Ambiguous EVM `0x...` identifiers are not blindly labeled wallets: wallet descent requires resolver or retained-wallet evidence rather than address-shape guessing.

## Afterbell Galaxy

Afterbell is a sibling research galaxy context in the same A Bulls universe. It is not treated as a launch-origin/provenance claim.

The existing `/afterbell/` deep link remains available, while the Field can descend into tokenized-equity/xStock PLANETS.

### xStock Top 50 after-close trader STARS

Opening an xStock PLANET now uses a dedicated Afterbell trader system rather than generic holder logic.

The system returns up to 50 wallet STARS ranked primarily by **unique retained transactions** in the most recent weekday Wall Street after-close window:

- start: 4:00 PM America/New_York;
- scheduled end: 9:30 AM on the next weekday market session;
- while the window is live, the end is the current time;
- weekend handling is explicit;
- exchange-holiday exceptions are not inferred without retained calendar evidence.

Ranking by transactions is important because a high-activity wallet can round-trip to zero net inventory and still be a top after-close trader; holder-only ranking would incorrectly discard it.

Realized PnL is returned only where a bounded FIFO acquisition basis and sale price are complete in retained evidence. Unmatched sells, missing price, or incomplete basis leave PnL unavailable.

Selecting an Afterbell trader STAR opens that wallet's normal STAR/PLANET research system and preserves the selected xStock context.

Permanent live smoke requires contiguous ranks, positive transaction counts, valid provenance, and honest PnL availability.

## Trickster Cut rebuild

The old share path only produced a static SVG receipt card. The current Trickster pipeline keeps that SVG as a fallback but adds an actual browser video recorder.

### Video capture

`src/lib/trickster-cut-recorder.ts` renders frozen receipt-bound scenes to canvas and records the capture stream with browser media APIs.

The recorder uses the frozen manifest as source of truth. It does not generate substitute candles, exits, prices, or receipts.

The export path supports an actual video Blob when the browser provides a supported encoder/container and falls back to the verified SVG receipt card when capture is unavailable.

### Narration and audio

Grey and Trickster remain separate roles:

- Grey: factual/evidence-bound line;
- Trickster: interpretation/story line.

The existing voice integration is reused rather than creating a parallel evidence system. Browser audio is mixed into the export path where capability permits.

### Visual language

The cinematic model includes receipt-bound scene timing, captions, exact receipt emphasis, VERIFY labeling/watermarking, and the existing frozen-manifest verification path.

### Auto Cut

Auto Cut uses the already-computed event magnitude to select a bounded highest-magnitude receipt window. It does not synthesize a "best trade" claim; it is a presentation choice over already retained receipts.

### QA status

Pure selection/format/model behavior is covered by repository tests and the entire feature passed the normal release gate before production.

Actual browser codec behavior, exported file playback, narration mix, watermark legibility, and mobile media support remain physical/browser QA gates. CI does not pretend to certify those capabilities.

## Trickster discovery loop

Frozen Cuts are now first-class searchable Index objects and a 7-day Trending Cuts view is available.

Trending order uses retained anonymous activity only:

1. share actions;
2. view opens;
3. most recent activity.

The activity table stores the Cut id, event kind and timestamp. It does not store a wallet, account, device, IP, identity, skill score, or synthetic popularity score.

If no retained Cut activity exists in the window, the view stays empty and says so.

## Release safety net

The production smoke suite now permanently checks the product paths that were previously only covered by code/tests:

- Afterbell Top-50 trader response shape and ranking;
- chain-qualified wallet-system coverage;
- all current Fomo chain keys;
- token-system chain identity;
- no invented EVM SOL valuation;
- frozen Cut route and VERIFY behavior;
- retained Replay evidence/OHLC;
- multichain evidence spine;
- D1 population and source-health diagnostics.

## Remaining manual acceptance

The following are intentionally **not** claimed from hosted CI:

- physical Seeker/Android WebGL rendering and lifecycle;
- touch/pinch/orientation recovery;
- actual Trickster MP4/WebM codec support on the target browser;
- playback of exported narration/music mix;
- VERIFY watermark readability in a reposted clip;
- device GPU memory, battery and thermal behavior.

Those remain manual device/browser acceptance gates. Their manual status is documented rather than being converted into fake automated completion.

## Release conclusion

The data-reliability phases, multichain Fomo wallet/token research, ASK wallet STAR flow, Afterbell Top-50 trader system, receipt-bound Trickster video pipeline, and Trending Cuts discovery loop are implemented and release-gated.

The verified production baseline for this review is `7688665cfe6a6c12d56d162c384a060a049e7193`.
