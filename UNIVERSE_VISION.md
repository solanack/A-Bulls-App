# A Bulls App - Living Universe Direction

The authoritative product brief is preserved at
`docs/a-bulls-app-universe-brief.pdf`. This file is the compact engineering
contract used while implementing it.

## Non-negotiable boundaries

- The product is read-only: no wallet connection, custody, commerce, minting,
  transaction approval, or signing.
- Retired shooter code, assets, terminology, navigation, and Bullpen
  staking/skin surfaces must not return.
- The current particle field, the Grey query organism, voice layer, Field OS,
  modes, and read-only intelligence Worker are Galaxy Zero. Extend and
  generalize them; do not rewrite them.
- The Grey speaks only observed, sourced facts. Estimates are visibly marked
  and never blended with observed evidence.

## Shared cosmology

| Universe object | On-chain meaning | Required visual evidence |
| --- | --- | --- |
| Galaxy | Origin ecosystem or launchpad | Permanent launch origin |
| Star | Token or mint | Brightness from liquidity/volume; color from health |
| Planet | Major holder wallet | Relative bag size and trading-frequency orbit |
| Moon | Related NFT collection | Orbits its relevant planet or star |
| Asteroid belt | Liquidity pools and LP positions | Density from liquidity depth |
| Comet | Near-real-time large trade | Current, live motion rather than batch-only state |
| Black hole | Rugged or dead token | Pulls in planets as holders exit |
| Supernova | Fast pump-and-death cycle | Permanent discoverable scar |
| Wormhole | Migration or bridge event | Traversable connection without changing origin |
| Ghost | Dormant or collapsed object | Translucent trace linked to real chart evidence |

## Architecture and delivery rules

`field-os.ts` gains a current-galaxy state. The field and synthetic universe
become a reusable galaxy render pipeline. Galaxy identity is determined by
launch origin and never changes. Shared wallets retain the same identity across
galaxies. Ship the generalized Galaxy Zero first, then prove the pattern with
one real additional galaxy (pump.fun is the preferred first candidate).

Replay is the timeline primitive. Trickster/Create selects a bounded Replay
window and produces a cited narrated tour. Compare, What-If, Sequences,
Evidence, and Ghost must be real interaction modes, not labels or placeholders.
Every surfaced trade must be checkable against OHLC/candlestick history with
the trade marked at its actual time and price.

Games becomes non-competitive, narrated education based on real indexed events.
There are no scores, missions, progression, or shooter mechanics.

Preserve mobile, reduced-motion, and save-data behavior. Use level of detail at
galaxy scale, keep Comets live, and cache bounded Replay windows. The future
public API/SDK and third-party platform layer informs separation of concerns but
is not part of the current build pass.

## Implemented data-cost foundation

- D1 schema for normalized galaxy snapshots, query cache, provider usage,
  market candles, and ingestion receipts.
- Cache-first QUERY resolution with a 60-second fresh TTL and stale-cache
  fallback.
- Database-guarded monthly provider reservation with a default hard stop at
  75% of the declared allowance.
- Galaxy entry reads one indexed snapshot from D1; rendering and Replay never
  issue passive provider requests.
- Explicit `PROTOTYPE / DEGRADED` state when D1 is not attached or no indexed
  snapshot exists. No live fallback is attempted for the field.
- Direct secondary Solana RPC sampling was removed from QUERY so one user ask
  cannot silently fan out into multiple provider requests.

## Completed Living Universe layer

- The recovered production Intelligence Worker is integrated without creating
  a second D1 database.
- Real indexed Replay bundles and event market context drive candlesticks and
  evidence receipts.
- Compare, What-If, Sequences, Ghost, Trickster/Create, and narrated education
  are functional read-only modes with honest empty states.
- pump.fun writes to the shared event, provenance, route, candle, and universe
  contracts used by Galaxy Zero.
- One database-guarded provider reservation protects QUERY and background
  Helius indexing before a network call is made.
- The retired competitive runtime and its database binding are absent from the
  release.

Account-owned bindings, provider secrets, webhook configuration, and the
health of live ingestion remain deployment configuration. Those values and any
missing market evidence are never fabricated or committed.
