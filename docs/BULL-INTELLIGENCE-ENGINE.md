# Bull Intelligence Engine

Status: architecture locked for staged implementation on `feature/bull-intelligence-engine`.

## Product rule

A Bulls App remains read-only. Users provide public Solana addresses. The app never requests private keys, seed phrases, transaction signatures, custody, copy trading, automated trading, or execution authority.

Forked repositories are research/reference inputs, not dependencies to merge wholesale. Reusable concepts must be reimplemented behind A Bulls App interfaces with license, security, performance, and mobile review.

## Experience model

### INTELLIGENCE — understand the chain

1. **Bull DNA** — explainable behavioral fingerprint computed from public-chain observations. Initial dimensions: conviction, curiosity, pacing, rotation, execution reliability and flow balance. Every score exposes the observations that produced it.
2. **Wallet Museum** — history presented as memorable exhibits using only facts visible in the loaded range. Never shame the user; labels describe transactions, not the person.
3. **Wallet Time Machine** — reconstruct a wallet at a selected historical timestamp. Full archival mode uses indexed history; free-RPC mode exposes only the period actually available and labels coverage.
4. **Ghost Ledger / Ghost Portfolio** — Ghost Ledger is usable with observed net outbound quantities now. Exact Ghost Portfolio valuation remains locked until defensible historical position and price coverage exists.
5. **Parallel Universe** — replay historical activity under user-selected rules such as fixed holding period. Historical simulation only, not prediction or advice.
6. **Wallet Rivalries** — compare two public addresses across transparent dimensions and render rounds/scorecards. No wagering.
7. **Where Were You?** — place the wallet on its own observed public-chain timeline. The current version shows earliest/latest loaded traces, visible span and loaded activity timing. Named historical Solana events may be added later only with verifiable external timestamps and adequate wallet coverage.
8. **Bull Radar** — anomaly detection over aggregate public-chain behavior. Surface unusual convergence, rotation and cohort shifts; do not emit BUY/SELL calls.
9. **Solana Weather** — translate aggregate chain conditions into an explorable visual weather metaphor while exposing the underlying metrics.
10. **Activity Constellation** — lightweight wallet-to-token relationship visualization from currently loaded analytics.
11. **Wallet Constellation** — deeper indexed wallet-to-wallet interaction graph. An edge means an interaction was observed; it never means common ownership, shared identity, organization or intent.
12. **NFT Memory** — indexed public NFT history presented as earliest/latest observed NFT traces, deepest observed collection, longest observed collection era, event counts and collection counts. It never claims complete lifetime ownership, exact cost basis or P&L without the required history/pricing data.

### LIFE — understand your behavior

LIFE consumes derived observations from Bull Intelligence rather than raw transaction dumps. It produces sophisticated reflective advice and feel-good observations. It does not diagnose, identify, shame, or provide financial instructions.

Primary inputs: holding duration, repeated entry/exit patterns, drawdown exposure, concentration, rotation, realized-vs-unrealized outcomes, re-entry behavior, and historical counterfactuals when those inputs are actually available.

### GAMES — experience the chain

Bull Invaders remains deterministic and fair. Public-chain conditions may alter cosmetic/environmental presentation (weather, event themes, special non-ranked encounters) but must not create pay-to-win advantages or alter Ranked hitboxes/scoring.

## Data architecture

### Phase A — current/free infrastructure

Browser -> A Bulls App Pages -> Cloudflare Worker -> existing RPC/Helius free tier + existing providers -> D1/KV caches.

Every intelligence response must expose `coverage`, `source`, `freshness` and/or explicit limitations. Unavailable archival history is never fabricated.

### Phase B — indexed intelligence

Introduce an A Bulls App-owned indexing service inspired by Carbon/Squid patterns: normalized transaction events, token balance deltas, NFT events, wallet-token relationships, wallet-wallet relationships, and time-bucket aggregates. Historical backfill can use archival infrastructure when economically justified.

Migration `0007_bull_intelligence.sql` establishes the token/wallet intelligence index. Migration `0008_bull_nft_intelligence.sql` establishes staged NFT event, wallet/collection window and NFT cohort tables. Neither indexer should be enabled until its migration and ingest path are ready.

### Phase C — full historical reconstruction

When archival access is available, activate complete Bull Vision/Trickshot-style candle reconstruction, exact historical replay, Trade Movies, deep Time Machine, complete Ghost Portfolio and full counterfactual simulations without changing the product UI contract.

## Normalized event model

Each indexed token/wallet event should minimally contain:

- signature, slot, block_time
- observed public wallet(s)
- program IDs
- token mint or collection when applicable
- event class: swap-like, transfer, mint, burn, staking-like, unknown
- pre/post token and SOL balance deltas
- fee in lamports and normalized SOL
- optional observed historical price
- confidence and decoder/source metadata

NFT events additionally preserve asset id, collection, marketplace when observed, counterparty when observed, optional SOL/USD value, confidence and metadata required for display.

Derived tables/materializations include:

- wallet_token_position_history (future materialization)
- bull_wallet_windows
- bull_wallet_relationships
- bull_token_wallet_buckets
- bull_token_cohorts
- bull_radar_anomalies
- bull_chain_weather
- bull_nft_wallet_events
- bull_nft_wallet_collection_windows
- bull_nft_collection_cohorts

## Fork research map

- `trickshot`: replay, exact P&L, historical candles, wallet graph, recording/sound concepts.
- `carbon`: real-time indexing, decoding, backfill, persistence/API pipeline concepts.
- `jetstreamer`: large historical replay/backfill concepts.
- `squid-sdk`: selective ETL/indexing architecture concepts.
- `gmgn-skills`: analytics taxonomy inspiration only. Trading/execution functionality is explicitly excluded.
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
11. NFT history must distinguish indexed observations from complete ownership history.
12. Historical price/P&L claims remain unavailable unless the required historical price and position evidence exists.

## Build order

1. Capability/coverage contract + normalized intelligence types. ✅
2. Bull DNA + Wallet Museum using data already available to the Worker. ✅
3. Rivalries + LIFE observation bridge. ✅
4. Ghost Ledger + visible-history Time Machine + guarded Parallel Universe. ✅
5. Radar + Solana Weather aggregate engine/UI. ✅ staged
6. Deep Wallet Constellation. ✅ staged
7. NFT Memory schema/API/UI. ✅ staged
8. Full Ghost Portfolio / deep Time Machine after archival/indexing expansion.
9. Chain-reactive game cosmetics after analytics correctness is proven.

This sequencing delivers useful features on the current infrastructure while keeping the API stable for the later full historical engine.