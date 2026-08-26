# Playable Data Engine

Status: implementation foundation on `feature/universe-trickster-v1`. Disabled by default with the surrounding vNext experience. No deployment authorized.

## Product rule

If the Intelligence Mesh knows an event happened, the product should be able to make that event inspectable and, where the evidence supports it, playable on a deterministic timeline.

The platform is not a collection of disconnected analytics pages. Universe, Intelligence, Market Sequence, Chain Lens, Wallet DNA, Ghost Portfolio, Parallel Universe, Trickster and future educational tools consume the same normalized evidence and temporal contracts.

## Core loop

`INDEX -> VERIFY -> EXPLORE -> REPLAY -> COMPARE -> SIMULATE -> EXPLAIN -> CREATE -> VERIFY`

The index is the durable asset. Replay and media are views over indexed evidence, not separate sources of truth.

## Temporal replay contract

The shared replay engine provides:

- deterministic event ordering;
- bounded event counts;
- play / pause;
- time seek and scrub;
- previous / next event stepping;
- 0.25x, 0.5x, 1x, 2x, 4x, 8x and 16x playback;
- optional looping;
- forward and reverse event traversal;
- semantic visual-effect instructions derived from evidence;
- stable chain timestamps independent of render frame rate.

Rendering is downstream. Analytics, canvas, Three.js, video export and accessibility/list views must not each invent their own timeline semantics.

## Trade replay

A trade replay may combine:

- verified wallet/token events;
- normalized OHLC candles where available;
- DEX route evidence;
- source/provenance receipts;
- coverage state;
- exact or explicitly labeled approximate execution context.

Buy events use a positive/green semantic effect; sell events use a negative/red semantic effect. The current cinematic treatment is a lightning strike whose intensity scales within a bounded range from observed value. Visual intensity is presentation, never a claim of importance, skill, intent or causation.

If price-series evidence is unavailable, the replay must say so and continue as an event timeline. It must never fabricate candles or execution prices to make the visualization look complete.

## Wallet-versus-wallet comparison

Users can compare two public wallet addresses for the same token and observation window. The comparison uses a synchronized timeline and calculated summaries such as observed buy/sell counts, observed value and observed token-flow differences.

The system may describe observed/calculated differences. It must not claim either wallet's owner, private reasoning, emotions, identity, skill or intent.

A future creator-authored annotation layer can let a trader voluntarily explain their own reasoning. Those annotations must remain distinguishable from chain-derived facts.

## What-if / Parallel Universe

Counterfactual overlays are simulations layered beside actual observed events. The first implemented primitive mirrors the observed timing of a source wallet onto a target wallet for comparison.

Every simulation is labeled hypothetical and must disclose that identical execution, liquidity, fees, slippage and price impact are not guaranteed. Simulation events use `verification: simulation` and cannot be promoted to observed evidence.

Future scenarios can include:

- entered when another wallet entered;
- exited when another wallet exited;
- held for a different duration;
- staged exits;
- alternative sizing rules;
- no-sale / hold counterfactuals;
- evidence-backed historical execution models when sufficient pool/liquidity data exists.

## Trickster integration

Trickster can receive replay events and optional candles in the same evidence bundle used to construct its Data Story Manifest. When replay data is present, the Studio preview becomes playable instead of static.

`wallet-comparison` is a first-class guided story type with:

1. comparison hook;
2. synchronized trade replay;
3. calculated differences;
4. what-if replay.

The creator edits events/scenes and factual emphasis, not arbitrary pixels. Export validation still requires the evidence manifest; AI narration cannot introduce unsupported claims.

## Current implementation files

- `js/temporal-replay-engine.mjs`
- `js/temporal-replay-engine.test.mjs`
- `js/trade-comparison-replay.mjs`
- `js/trade-comparison-replay.test.mjs`
- `js/trade-replay-player.mjs`
- `js/trickster-studio.mjs`
- `js/trickster-composer.mjs`
- `css/trickster-studio.css`

## Next data-plane integration

The next backend slice should expose a neutral replay bundle from the Intelligence Mesh rather than asking the browser to reconstruct chain history. The bundle should contain the requested public entities, exact observation window, normalized events, candles when available, route/evidence receipts, coverage for every wallet, and source/verification metadata.

Provider-specific RPC, Helius, Substreams, Yellowstone, Old Faithful or future adapters remain behind the Intelligence Mesh. The replay client never depends directly on one provider.

## Non-negotiable safeguards

- Public addresses only.
- No wallet connection or signature.
- No custody or transaction execution.
- No fabricated price/candle data.
- No unsupported ownership or intent claims.
- Observed, calculated, estimated, inferred and simulated information remain distinct.
- Existing Ranked Bull Invaders behavior remains outside this replay engine and unchanged.
