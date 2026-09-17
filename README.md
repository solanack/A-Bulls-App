# A Bulls App

**Study the trader. Replay the trade. Verify the story.**

A Bulls App is an evidence-native Solana research operating system rendered as an explorable universe.

## START HERE

Before proposing, coding, refactoring, or deploying anything in this repository:

1. Read **[`MASTER_PLAN.md`](./MASTER_PLAN.md)** — highest-level product and architecture contract.
2. Read **[`AGENTS.md`](./AGENTS.md)** — release, evidence, safety, and implementation guardrails.
3. Read the relevant compact contract, especially **[`UNIVERSE_VISION.md`](./UNIVERSE_VISION.md)** and **[`SOCIALFI_ARCHITECTURE.md`](./SOCIALFI_ARCHITECTURE.md)**.
4. Inspect current `main` and existing implementation before assuming something is absent.

If an older document conflicts with `MASTER_PLAN.md`, the master plan wins unless the repository owner explicitly changes the direction.

## Core product path

**Universe → Galaxy → Planet → Holder Sky → Star → Holdings → Matched Rounds → Chosen Trade → Replay/Evidence/Ghost → Trickster Cut → Index → My Sky**

## Locked cosmology

- Galaxy = launch-origin ecosystem or explicit research lens
- Planet = token/mint
- Star = observed public wallet/holder/trader
- Asteroid belt = liquidity
- Comet = indexed trade
- Black hole = collapsed token with evidence
- Supernova = historical pump/death event
- Wormhole = migration/bridge
- Ghost = historical trace/evidence-backed echo
- Dust = decoration only

## Public Galaxy Zero

The public Field exposes **ZERO + FOMO**: ZERO is the overview, and **Fomo**
is its only active public research galaxy/lens.

PonsFamily (`pons`) and pump.fun (`pump-fun`) are retired public galaxies.
Their historical launch origins, applied migrations, and retained research
objects remain available as provenance, not as public galaxy destinations.
`solana-core` is internal provenance only.

Production configuration enables `FOMO_GALAXY_ENABLED`; retired galaxy
ranking/discovery flags are absent from `workers/wrangler.production.toml`.

## Current execution boundary

Research-first and non-custodial. No swaps, transaction signing, copy trading, custody, approvals, token creation, liquidity execution, or automated trade routing. The only approved future wallet-adapter exception is the narrow mobile `Bind My Star` public-address authorization defined in `MASTER_PLAN.md`.

Bull Invaders and LIFE are retired.
