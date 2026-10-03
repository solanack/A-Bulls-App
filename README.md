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

Any trader opens the same sheet: REPLAY · EVIDENCE · COMPARE · WATCH. With a planet selected, WATCH saves that token; otherwise it saves the trader. The label becomes WATCHING once saved. Replay is a full-frame tape of the retained candles in that window (FULL HISTORY or EXACT WINDOW), or a dark event tape marked "DARK TAPE · PRICE CANDLES UNAVAILABLE". EVM tokens without a chosen quote are priced in USD. Each of the trader's buys (lime) and sells (rose) strikes the candle once as lightning, then stays as a small scar. The tape shows that trader's prints only. Tapping a scar opens that print's evidence. SHARE copies a URL that reopens the exact Replay (a viewport under 760px may use the device share sheet), and CUT renders a 1080×1920 or 1920×1080 video that ends on VERIFY plus that URL, with a manifest of wallet, mint, window, signatures, and candle source.

Opening Replay queues one That day request for the mint and the UTC date of the first print. The request covers that date, then +1, +3 and +7: public X posts that mention the token (ticker, name, or mint). Replay does not open that list; no control shows it. In production the Intelligence Worker queues the request for the host (`SOCIAL_HOST_PRIMARY`). `.github/workflows/social-reach.yml` runs `scripts/social-reach/runner.py` with the [Agent-Reach](https://github.com/solanack/Agent-Reach) fork. The workflow authenticates with a short-lived GitHub OIDC token. `SOCIAL_INGEST_TOKEN` is an optional fallback, as a repo secret and a Worker secret. It can optionally use `TWITTER_AUTH_TOKEN`/`TWITTER_CT0` from a dedicated account, never the owner's main account. None of these reach the browser. If the host has not drained the queue within 45 minutes, the Worker uses official X search when `X_BEARER_TOKEN` is set, otherwise the credential-free Exa route Agent-Reach uses. Matches that pass validation are retained in `social_posts_retained`. An empty window's copy is "No retained posts in this window.", and a post is never presented as the reason for a print.

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
