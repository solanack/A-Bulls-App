# A Bulls App - Living Universe Direction

The authoritative product brief is preserved at
`docs/a-bulls-app-universe-brief.pdf`. This file is the compact engineering
contract used while implementing the current approved universe.

## Non-negotiable boundaries

- The product is read-only: no wallet connection, custody, commerce, minting,
  transaction approval, copy trading, or signing.
- Retired shooter code, assets, terminology, navigation, and Bullpen
  staking/skin surfaces must not return.
- The current particle field, the Grey query organism, voice layer, Field OS,
  modes, and read-only Intelligence Worker are Galaxy Zero. Extend and
  generalize them; do not rewrite them.
- The Grey speaks only observed, sourced facts. Estimates are visibly marked
  and never blended with observed evidence.
- Decorative field fabric is DUST only. It is never promoted into a wallet,
  token, trade, holder, or other evidence-bearing object.

## Shared cosmology

| Universe object | On-chain meaning | Required visual evidence |
| --- | --- | --- |
| Galaxy | Origin ecosystem or launchpad | Permanent launch origin |
| Planet | Token or mint | Size/brightness may use observed market depth, liquidity, valuation, or five-minute activity; missing metrics stay missing |
| Star | Observed public wallet / holder / trader | Stable public-wallet identity and evidence-backed relationship weight; never a claim about the real person behind the address |
| Moon | Related NFT collection | Orbits its relevant planet or wallet star only when the relationship is observed |
| Asteroid belt | Liquidity pools and LP depth | Density from observed liquidity depth; absent liquidity cannot create a certified belt |
| Comet | Near-real-time indexed trade | Current observed motion linked to a real transaction/event |
| Black hole | Collapsed or rugged token with indexed evidence | Requires retained collapse evidence; never inferred from appearance alone |
| Supernova | Historical pump-and-death cycle | Permanent discoverable scar backed by retained evidence |
| Wormhole | Migration or bridge event | Traversable connection without changing launch origin |
| Ghost | Dormant or collapsed historical trace | Translucent trace linked to real historical evidence |
| Dust | Decorative field fabric | No on-chain meaning and never market evidence |

The taxonomy is locked in this direction: **token = PLANET** and **public
wallet/holder/trader = STAR**. Legacy producer contracts may retain old type or
field names for compatibility, but adapters must normalize them before they
enter the rendered universe or Grey speech.

## Planet entry and wallet-star sky

A token planet is a navigable research object. Touching or selecting a token
planet enters that token's local planetary system:

- The selected token remains the central PLANET.
- Observed public wallets with retained evidence for that token become STARS in
  the surrounding sky.
- Star size may represent only the relationship weight we can actually support
  from retained indexed evidence (for example retained positive-net sample
  share or another explicitly labeled observed measure). It must never be
  silently described as percent of total supply.
- Indexed current/recent trades may appear as COMETS in that local system.
- Observed liquidity may appear as an ASTEROID BELT around the token planet.
- Missing holder/wallet evidence produces an honest empty sky. Planet entry and
  rendering must not trigger passive provider fan-out.

Wallet stars retain a stable public-address identity across galaxies. Token
planets retain immutable launch origin even after migrations.

## Weekly trader observatory

The trader observatory is a separate research destination, not another launch
galaxy and not a competitive game. It may surface up to 50 wallet STARS from a
bounded seven-day retained D1 window.

- Rankings are descriptive research only, never a skill score, endorsement,
  copy-trading instruction, or prediction.
- Ranking inputs must come from retained indexed evidence. No scraping or
  undocumented third-party leaderboard dependency is allowed.
- Realized-result ranking may count only matched in-window buys and sells whose
  cost basis can be reconstructed from the retained window. Unmatched sells are
  excluded rather than assigned an invented cost basis.
- The observatory must disclose the observed window, sample limitations, and
  matching method.

## Watchlist universe

The device watchlist may save both token PLANETS and public-wallet STARS. Saved
objects are references for research continuity, not proof that fresh evidence
exists. When current indexed evidence is available it may hydrate the saved
object; otherwise the UI must distinguish the saved reference from live market
or wallet evidence. Existing token-only device watchlists may migrate forward
without changing the user's saved token identity.

## Architecture and delivery rules

`field-os.ts` owns the current-galaxy/current-system state. The field and
synthetic universe are a reusable render pipeline. Galaxy identity is
determined by launch origin and never changes. Shared wallets retain the same
identity across galaxies.

Replay is the timeline primitive. Trickster/Create selects a bounded Replay
window and produces a cited narrated tour. Compare, What-If, Sequences,
Evidence, and Ghost must be real interaction modes, not labels or placeholders.
Every surfaced trade must be checkable against OHLC/candlestick history with
the trade marked at its actual time and price.

Games remains non-competitive, narrated education based on real indexed events.
There are no scores, missions, progression, or shooter mechanics.

Preserve mobile, reduced-motion, save-data, and the known-good Seeker WebGL
renderer lifecycle. Use level of detail at galaxy scale, keep bounded current
Comets live, and cache bounded Replay windows. The future public API/SDK and
third-party platform layer informs separation of concerns but is not part of
the current build pass.

## Implemented data-cost foundation

- D1 schema for normalized galaxy snapshots, query cache, provider usage,
  market candles, ingestion receipts, cited theses, and their resolutions.
- Cache-first QUERY resolution with a 60-second fresh TTL and stale-cache
  fallback.
- Database-guarded monthly provider reservation with a default hard stop at
  75% of the declared allowance.
- Galaxy entry, planet-system entry, thesis views, watchlist hydration, and
  observatory views read retained D1/cache state; rendering and Replay never
  issue passive provider requests.
- Explicit `PROTOTYPE / DEGRADED` or honest-empty state when required indexed
  evidence is unavailable. No live fallback is attempted merely to fill the
  field.
- Direct secondary Solana RPC sampling was removed from QUERY so one user ask
  cannot silently fan out into multiple provider requests.

## Completed Living Universe layer

- The production Intelligence Worker is integrated without creating a second
  D1 database.
- Real indexed Replay bundles and event market context drive candlesticks and
  evidence receipts.
- Compare, What-If, Sequences, Ghost, Trickster/Create, and narrated education
  are functional read-only modes with honest empty states.
- pump.fun writes to the shared event, provenance, route, candle, and universe
  contracts used by Galaxy Zero.
- One database-guarded provider reservation protects QUERY and background
  Helius indexing before a network call is made.
- Token planets, wallet stars, token-local systems, the weekly trader
  observatory, and token+wallet device watchlists all remain read-only research
  surfaces.
- The retired competitive runtime and its database binding are absent from the
  release.

Account-owned bindings, provider secrets, webhook configuration, and the
health of live ingestion remain deployment configuration. Those values and any
missing market evidence are never fabricated or committed.
