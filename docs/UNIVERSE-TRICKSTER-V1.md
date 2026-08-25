# Universe + Trickster v1

Status: active replacement implementation on `feature/universe-trickster-v1`. The replacement client shell is enabled on this branch. No production deployment.

## Baseline and preservation contract

This branch starts at Intelligence Mesh head `f8625dff51552968b301ce8559e00f0d4a370979` and builds forward from the undeployed Pages 8.7.0 / Worker 8.2.0 baseline.

Preserve:

- Bull Invaders Ranked scoring, hitboxes, physics, replay validation, campaign behavior, and game feel;
- read-only public-chain security boundaries;
- Intelligence Mesh evidence/provenance/coverage contracts;
- media/profile behavior that remains part of the new product.

Removed by owner decision:

- LIFE;
- Ansem and $ANSEM-specific product surfaces;
- Bullpen NFT/community integration;
- Ansem.io integration;
- Community Integrations product;
- Solana Bang Bang / Claude of Duty maze game.

Generic full-Solana NFT intelligence remains.

## Runtime gates

The replacement browser shell is enabled on this feature branch so local/browser review shows the actual vNext experience rather than the legacy phone-shaped shell.

Server data features remain fail-closed:

- `UNIVERSE_ENABLED` gates verified live Universe data;
- `TRICKSTER_STUDIO_ENABLED` gates server-side Trickster validation/export;
- `PLAYABLE_DATA_ENABLED` gates indexed Replay Bundle creation.

A disabled server gate must show a clear unavailable/degraded state. It must never fall back to fabricated or provider-inconsistent data.

## Universe truth contract

Universe never claims to display all Solana activity. Every frame/snapshot carries observation window start/end, observed event count, rendered particle count, sampling policy, sources, verification distribution, and coverage statement.

Entity kinds are `transaction`, `wallet`, `program`, `token`, `nft`, and `cluster`. Wallet relationships are observed public interactions, not ownership. Live events remain unverified until confirmation/finality/verification advances.

## Selection contract

Selecting a visual entity emits a neutral Intelligence destination:

- wallet → wallet / Wallet DNA / replay context;
- transaction → transaction / Chain Lens;
- token → Market Sequence / replay context;
- NFT → NFT Memory;
- program → program activity;
- cluster → Chain Radar evidence.

The renderer never reconstructs wallet history independently. Universe, Intelligence, replay, and Trickster consume the same normalized evidence.

## Playable Data contract

The first canonical Replay Bundle endpoint is `/api/intelligence/replay-bundle`.

Input can contain:

- one public wallet or two comparison wallets;
- token mint;
- optional quote mint;
- bounded time window;
- candle bucket size.

Output contains:

- normalized indexed events;
- exact route-backed execution prices only when evidence supports the selected base/quote pair;
- indexed OHLC when available;
- wallet coverage state;
- event verification distribution;
- source set;
- explicit caveats.

Missing prices and candles are never invented. What-if output is historical counterfactual analysis, never prediction or a promise of achievable execution.

## Replay experience

Every supported event can become a temporal object with deterministic ordering and deterministic visual treatment. Shared controls include play, pause, seek, rewind, previous/next event, loop, and 0.25×–16× playback.

Trade replay can render green buy impacts and red sell impacts. Effect intensity may scale with evidence-backed magnitude, but visuals must never obscure the underlying chart or imply unsupported significance.

## Desktop and mobile

Desktop is a full-screen workstation using the full browser canvas, persistent product navigation, wide Intelligence/replay surfaces, and multi-column context.

Phone switches to its dedicated touch-first layout at 760 CSS px and below, with bottom product navigation and single-column reflow as needed.

## Trickster Data Story Manifest

A story is structured evidence before it is video. Required fields include schema version, stable story id, subject/story type, frozen coverage snapshot, ordered scenes, evidence-backed factual claims, inference/estimate disclosures, theme/aspect/duration/locale, and renderer version.

Exports preserve a verification link or code. AI narration may summarize claims but may not introduce claims absent from the manifest.

## Delivery stages

1. Evidence/story contracts and validation — implemented.
2. Synthetic Universe renderer and deterministic transition foundation — implemented.
3. Shared temporal replay engine — implemented foundation.
4. Indexed Replay Bundle API — implemented foundation, server-gated.
5. Full-chain Intelligence replay/comparison workspace — implemented foundation.
6. Live verified Universe data integration.
7. Expanded what-if/counterfactual engine across Ghost Portfolio and Parallel Universe.
8. Guided Trickster composer over replay events.
9. On-device Mediabunny/WebCodecs export.
10. Optional deterministic server renderer and share/verification pages.

No merge, database migration, or production deployment is authorized by this document.

## Reproducible browser dependencies

The feature branch pins Three.js 0.185.0 (MIT) and Mediabunny 1.55.2 (MPL-2.0) with npm lockfile integrity. `npm run build:experience-vendor` creates local versioned browser modules, copies license files, and records SHA-256 hashes. CI verifies expected module hashes. No floating CDN import is permitted.
