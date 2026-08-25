# Intelligence Mesh

This document locks the naming and product direction for the next-generation indexing and intelligence stack.

## Product direction

The app may retain existing Ansem, Bullpen NFT, Ansem.io, and legacy Bull-branded features for compatibility, but they are no longer the center of the product architecture.

Going forward, new systems must use neutral, extensible names that work for any Solana wallet, token, NFT collection, protocol, or community.

Existing legacy integrations should later move behind an optional **Community Integrations** layer so they can be removed, replaced, or expanded without redesigning Intelligence, LIFE, Games, or the data platform.

## Locked naming map

- Bull Data Mesh -> **Intelligence Mesh**
- Bull Stream -> **Live Data Plane**
- Bull Historian -> **History Engine**
- Bull Truth Engine -> **Verification Engine**
- Bull Lake -> **Intelligence Store**
- Bull Brain -> **Intelligence Layer**
- Bull DNA -> **Wallet DNA**
- Bull Radar -> **Chain Radar**
- Bull Vision -> **Chain Lens**
- Bull Demand Engine -> **Demand Engine**
- Solana Weather / Bull Weather -> **Chain Weather**

Names already deployed in database tables or compatibility modules are not destructively renamed in place. They should be treated as legacy implementation details and migrated behind aliases/adapters later.

## New infrastructure naming rule

New code created after this decision must not introduce `bull_` prefixes, `BULL_` environment-variable names, or Bull/Ansem/Bullpen-branded feature names unless the code is specifically an integration for that legacy ecosystem.

For new mesh infrastructure use neutral names such as:

- `INTELLIGENCE_MESH_ENABLED`
- `INTELLIGENCE_RPC_URL`
- `INTELLIGENCE_MESH_INGEST_TOKEN`
- `intelligence_index_coverage`
- `intelligence_event_provenance`
- `intelligence_source_health`
- `intelligence_slot_gaps`
- `intelligence_price_candles`
- `intelligence_trade_routes`

## Core architecture

1. **Live Data Plane** — interchangeable real-time sources such as Richat/Yellowstone-compatible providers.
2. **History Engine** — progressive standard RPC now, with future Substreams SVM and Old Faithful adapters.
3. **Verification Engine** — provenance, gap detection, repair, reconciliation, and completeness tracking.
4. **Intelligence Store** — D1 for edge summaries/control state, with Postgres/ClickHouse/R2 when scale justifies it.
5. **Intelligence Layer** — Wallet DNA, LIFE, Chain Radar, Chain Weather, Museum, Time Machine, Ghost Portfolio, Rivalries, Constellation, and Chain Lens.

## Compatibility policy

Current deployed Intelligence tables from migrations 0007/0008 may keep their existing names until a safe migration is justified. New migration 0009 and later should use neutral naming only.

Existing Ansem/Bullpen/Ansem.io features remain available for now. Future redesign should move them into a clearly separated optional integration group rather than deleting them abruptly.

## Brand direction ideas

The app should increasingly feel like a universal Solana intelligence and entertainment platform rather than a single-community companion.

Recommended neutral product vocabulary:

- **Intelligence** — main analytics hub
- **LIFE** — behavioral reflection based only on public trading activity
- **Games** — arcade and interactive experiences
- **Chain Lens** — transaction/trade reconstruction and replay
- **Wallet DNA** — explainable behavioral fingerprint
- **Chain Radar** — anomaly and convergence detection
- **Chain Weather** — visualized aggregate network conditions
- **Time Machine** — historical wallet replay
- **Ghost Portfolio** — counterfactual observed-history portfolio
- **Constellation** — observed public interaction graph
- **Museum** — wallet history as a curated timeline

Avoid naming that implies investment advice, prediction, ownership identity, or trading execution.
