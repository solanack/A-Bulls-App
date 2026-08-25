# Universe + Trickster v1

Status: implementation foundation on `feature/universe-trickster-v1`. Disabled by default. No production deployment.

## Preservation contract

This branch starts at Intelligence Mesh head `f8625dff51552968b301ce8559e00f0d4a370979`.
It is additive. Pages 8.7.0 / Worker 8.2.0 behavior, Bull Invaders Ranked invariants,
Intelligence routes, media workspace, profiles, and Community Integrations must
remain unchanged unless a parity-tested migration is approved.

## Feature flags

- `UNIVERSE_ENABLED`: server/runtime gate, default false.
- `TRICKSTER_STUDIO_ENABLED`: server/runtime gate, default false.
- `universeEnabled`: client bootstrap capability, false unless supplied by server.
- `tricksterStudioEnabled`: client bootstrap capability, false unless supplied by server.

A missing, malformed, or false flag must leave all existing navigation and behavior unchanged.

## Universe truth contract

The Universe never claims to display all Solana activity. Every frame/snapshot carries:

- observation window start/end;
- observed event count;
- rendered particle count;
- sampling policy;
- sources;
- verification distribution;
- coverage statement.

Entity kinds are `transaction`, `wallet`, `program`, `token`, `nft`, and
`cluster`. Wallet relationships are observed public interactions, not ownership.
Live events remain unverified until confirmation/finality/verification advances.

## Selection contract

Selecting a visual entity emits a neutral destination request:

- wallet -> wallet-dna
- transaction -> transaction
- token -> market-sequence
- nft -> nft-memory
- program -> program
- cluster -> chain-radar

The renderer never fetches or interprets wallet history independently. It consumes the
same normalized evidence used by Intelligence.

## Mobile performance contract

WebGL2 is the baseline. WebGPU is an optional enhancement. The runtime selects a quality
tier from measured frame time and device capability; it does not rely only on user-agent
strings. Reduced-motion and 2D/list fallback modes are mandatory. The initial scene must
not block access to Intelligence or Games.

## Trickster Data Story Manifest

A story is structured evidence before it is video. Required fields:

- schema version and stable story id;
- subject and story type;
- frozen coverage snapshot;
- ordered scenes;
- factual claims with evidence receipt ids;
- explicit inference/estimate labels;
- theme, aspect ratio, duration and locale;
- renderer version.

Exports must preserve a verification link or code. AI-authored narration may summarize
claims but may not introduce claims absent from the manifest.

## Delivery stages

1. Pure contracts and validation.
2. Synthetic-data Universe renderer benchmark.
3. Feature-flagged live snapshot endpoint.
4. Intelligence destination integration.
5. Guided Trickster composer.
6. On-device Mediabunny/WebCodecs export.
7. Optional deterministic server renderer.

No merge, database migration, or deployment is authorized by this document.

## Product scope update — 2026-08-25

LIFE was removed completely by owner decision after this branch began. Universe and
Trickster must not route into, depend on, or cache any LIFE surface.
