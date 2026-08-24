# Bull Intelligence Engine

Status: architecture locked for staged implementation on `feature/bull-intelligence-engine`.

## Product rule

A Bulls App remains read-only. Users provide public Solana addresses. The app never requests private keys, seed phrases, transaction signatures, custody, copy trading, automated trading, or execution authority.

Forked repositories are research/reference inputs, not dependencies to merge wholesale. Reusable concepts must be reimplemented behind A Bulls App interfaces with license, security, performance, and mobile review.

## Experience model

### INTELLIGENCE — understand the chain

1. **Bull DNA** — explainable behavioral fingerprint computed from public-chain observations. Initial dimensions: conviction, curiosity, patience, concentration, rotation, early-entry tendency, drawdown exposure, and realized-exit tendency. Every score must expose the observations that produced it.
2. **Wallet Museum** — history presented as memorable exhibits: Ancient Relics, Great Escapes, Round Trips, Longest Holds, Graveyard, and The One That Got Away. Never shame the user; labels describe transactions, not the person.
3. **Wallet Time Machine** — reconstruct a wallet at a selected historical timestamp. Full archival mode uses indexed history; free-RPC mode exposes only the period actually available and labels coverage.
4. **Ghost Portfolio** — compare observed outcomes with counterfactual hold rules. Simulation only; no recommendation language.
5. **Parallel Universe** — replay historical activity under user-selected rules such as fixed holding period or partial profit-taking. Historical simulation, not prediction.
6. **Wallet Rivalries** — compare two public addresses across transparent dimensions and render rounds/scorecards. No wagering.
7. **Where Were You?** — place a wallet on a timeline of notable Solana/token/NFT events using verifiable timestamps.
8. **Bull Radar** — anomaly detection over aggregate public-chain behavior. Surface unusual convergence, rotation, distribution, holder-duration changes, and cross-cohort overlap; do not emit BUY/SELL calls.
9. **Solana Weather** — translate aggregate chain conditions into an explorable visual weather metaphor while always exposing the underlying metrics.
10. **Wallet Constellation** — visualize public transaction relationships. Relationship edges are facts; common-ownership or identity claims are prohibited unless independently verified.

### LIFE — understand your behavior

LIFE consumes derived observations from Bull Intelligence rather than raw transaction dumps. It produces sophisticated reflective advice and feel-good observations. It does not diagnose, identify, shame, or provide financial instructions.

Primary inputs: holding duration, repeated entry/exit patterns, drawdown exposure, concentration, rotation, realized-vs-unrealized outcomes, re-entry behavior, and historical counterfactuals.

### GAMES — experience the chain

Bull Invaders remains deterministic and fair. Public-chain conditions may alter cosmetic/environmental presentation (weather, event themes, special non-ranked encounters) but must not create pay-to-win advantages or alter Ranked hitboxes/scoring.

## Data architecture

### Phase A — current/free infrastructure

Browser -> A Bulls App Pages -> Cloudflare Worker -> existing RPC/Helius free tier + existing providers -> D1/KV caches.

Implement capability negotiation. Every intelligence response includes `coverage`, `source`, `freshness`, and `limitations`. Never fabricate unavailable archival history.

### Phase B — indexed intelligence

Introduce an A Bulls App-owned indexing service inspired by Carbon/Squid patterns: normalized transaction events, token balance deltas, NFT events, wallet-token relationships, wallet-wallet relationships, and time-bucket aggregates. Historical backfill can use archival infrastructure when economically justified.

### Phase C — full historical reconstruction

When archival access is available, activate complete Bull Vision/Trickshot-style candle reconstruction, exact historical replay, Trade Movies, deep Time Machine, and full counterfactual simulations without changing the product UI contract.

## Normalized event model

Each indexed event should minimally contain:

- signature, slot, block_time
- observed public wallet(s)
- program IDs
- token/NFT mint or collection when applicable
- event class: swap-like, transfer, mint, burn, NFT sale/list/transfer, staking-like, unknown
- pre/post token and SOL balance deltas
- fee in lamports and normalized SOL
- confidence and decoder/source metadata

Derived tables/materializations:

- wallet_token_position_history
- wallet_behavior_windows
- wallet_relationship_edges
- token_wallet_cohorts
- nft_collection_wallet_cohorts
- chain_weather_windows
- radar_anomalies

## Fork research map

- `trickshot`: replay, exact P&L, historical candles, wallet graph, recording/sound concepts.
- `carbon`: real-time indexing, decoding, backfill, persistence/API pipeline concepts.
- `jetstreamer`: large historical replay/backfill concepts.
- `squid-sdk`: selective ETL/indexing architecture concepts.
- `gmgn-skills`: analytics taxonomy inspiration only (holders, traders, smart-money-like cohorts, security/fundamentals). Trading/execution functionality is explicitly excluded.
- `metaplex-program-library`: NFT/token metadata and compressed-NFT concepts.
- `solana`, `solana-web3.js`, `program-examples`: protocol correctness/reference implementations.
- `solana-ui`: mobile information architecture/design reference only. Key management, sniper, copy-trading, and execution functionality are excluded.
- `create-solana-dapp`, `solana-playground`: development/testing reference; not production runtime dependencies.

## Trust rules

1. Public address only.
2. Explain every behavioral score.
3. Distinguish observed facts from inference and simulation.
4. Never infer a real-world identity from a wallet.
5. Never claim linked wallets share an owner solely from graph/timing/funding patterns.
6. Display data coverage and freshness.
7. Cache expensive public-chain reconstruction safely.
8. No transaction execution in Intelligence/LIFE.
9. Ranked game outcomes remain independent of wallet wealth/trading activity.
10. New fork code is not copied wholesale without license and security review.

## Build order

1. Capability/coverage contract + normalized intelligence types.
2. Bull DNA + Wallet Museum using data already available to the Worker.
3. Rivalries + LIFE observation bridge.
4. Ghost Portfolio/Parallel Universe using only defensible historical coverage.
5. Radar + Solana Weather aggregate materializations.
6. Wallet Constellation.
7. Time Machine/deep replay after archival/indexing expansion.
8. Chain-reactive game cosmetics after analytics correctness is proven.

This sequencing delivers useful features on the current free infrastructure while keeping the API stable for the later full historical engine.