# Intelligence Mesh — Build Status

## Implemented on `feature/intelligence-mesh-v1`

- Neutral infrastructure naming for new work.
- Additive neutral D1 runtime schema.
- Protected adapter ingest endpoint using `INTELLIGENCE_MESH_INGEST_TOKEN`.
- Source adapters for Yellowstone/Richat, Substreams SVM and Old Faithful payloads.
- Source provenance and health tracking.
- Verification state: observed / confirmed / finalized / verified.
- Slot gap registry and repair evidence.
- Progressive wallet coverage schema.
- Routed DEX hop persistence for Chain Lens / Trade Autopsy.
- On-chain OHLC candle builder and persistence.
- Market Sequence storage/read API.
- Demand Engine request/cost tracking for future auto-materialization.
- Community Integrations registry for Ansem, Bullpen NFTs and Ansem.io legacy features.
- Read-only public APIs for mesh status, source health, coverage, verification and Market Sequence.
- CI syntax/unit/migration/naming/read-only guardrails.

## Existing production compatibility

Migrations 0007/0008 and existing deployed Worker 8.1.1 are not destructively renamed. New neutral tables live alongside legacy tables until a safe migration/alias layer is deployed.

## Next integration steps

1. Create a Worker release that composes the new neutral routers with the existing Worker router.
2. Apply migrations 0009 and 0010 to a test/backup D1 before production.
3. Keep `INTELLIGENCE_MESH_ENABLED` off until migration and Worker verification pass.
4. Add `INTELLIGENCE_MESH_INGEST_TOKEN` as a Worker secret before external adapter ingest is enabled.
5. Wire progressive standard-RPC wallet backfill to the neutral coverage/jobs tables.
6. Add a scheduled continuation loop for queued backfill jobs.
7. Add a Richat/Yellowstone bridge service outside Cloudflare for gRPC/QUIC live streams.
8. Add Substreams SVM sink/bridge for decoded DEX routes, swaps, NFTs and staking.
9. Add Old Faithful history-repair adapter for missing/old ranges and archive references.
10. Surface live/confirmed/verified/partial-history states in the Intelligence UI.
11. Feed Chain Radar, Chain Weather, Wallet DNA, Time Machine, Ghost Portfolio, Constellation and Chain Lens from the neutral mesh.
12. Move Ansem/Bullpen/Ansem.io under Community Integrations when the broader rebrand is ready.

## Trust constraints

- Public addresses only.
- No wallet signing, private keys, custody, transaction submission or trading execution.
- Relationships are observed public interactions, never proof of identity/common ownership.
- Market Sequence is chronological evidence, not proof of causation.
- Chain Radar is descriptive anomaly detection, not prediction or investment advice.
