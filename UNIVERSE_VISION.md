# A Bulls App - Living Universe Direction

The authoritative product brief is preserved at
`docs/a-bulls-app-universe-brief.pdf`. This file is the compact engineering
contract used while implementing it.

## Non-negotiable boundaries

- The product is read-only: no wallet connection, custody, commerce, minting,
  transaction approval, or signing.
- Bull Invaders is retired. Shooter code, assets, terminology, navigation, and
  Bullpen staking/skin surfaces must not return.
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
