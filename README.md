# A Bulls App

**Study the trader. Replay the trade. Verify the story.**

A Bulls App is an evidence-native Solana research and content-creation operating system rendered as an explorable universe. It turns public blockchain activity into navigable evidence, deterministic Replay, and verifiable cinematic Cuts.

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

## The Field

The dock is **FIELD · FOMO · AFTERBELL · MY SKY**. FOMO and AFTERBELL are equal rooms. **FIELD** shows both rooms together. **FOMO** holds memecoin traders from retained Fomo activity (figures are provider-reported). **AFTERBELL** holds trader STARS observed trading supported Solana xStocks, which descend into their stock PLANETS and retained trade COMETS. **MY SKY** keeps watched traders and tokens on this device.

Any trader opens the same sheet: REPLAY · WATCH TRADER · EVIDENCE. Replay is a full-frame tape of real candles (or an event tape marked "Candles unavailable") with a green bolt per observed buy and a red bolt per observed sell. Tapping a bolt opens its Evidence. SHARE copies a URL that reopens the exact Replay, and CUT renders a 1080×1920 or 1920×1080 video that ends on VERIFY plus that URL, with a manifest of wallet, mint, window, signatures, and candle source.

See [`HACKATHON_DEMO.md`](./HACKATHON_DEMO.md) for the demo script and golden fixtures.

## Run locally

```bash
npm install
npm run dev   # http://localhost:8080
npm test && npm run typecheck && npm run verify:release
```

A push to `main` runs `.github/workflows/deploy-cloudflare.yml`: tests, build, Worker dry-runs, D1 migrations, publish, then production checks including `scripts/check-golden-fixtures.mjs`.

PonsFamily (`pons`) and pump.fun (`pump-fun`) are retired public galaxies.
Their historical launch origins, applied migrations, and retained research
objects remain available as provenance, not as public galaxy destinations.
`solana-core` is internal provenance only.

Production configuration enables `FOMO_GALAXY_ENABLED`; retired galaxy
ranking/discovery flags are absent from `workers/wrangler.production.toml`.

## Current execution boundary

Research-first and non-custodial. No swaps, transaction signing, copy trading, custody, approvals, token creation, liquidity execution, or automated trade routing. The only approved future wallet-adapter exception is the narrow mobile `Bind My Star` public-address authorization defined in `MASTER_PLAN.md`.

Bull Invaders and LIFE are retired.
