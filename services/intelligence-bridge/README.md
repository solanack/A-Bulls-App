# External Intelligence Bridge

This service is the provider-neutral execution boundary for bounded historical retrieval work issued by the A Bulls App Intelligence Mesh.

## Safety model

- Public wallet addresses only.
- Read-only retrieval only. No signing, custody, transaction submission, or trading.
- The Worker remains the coordinator and source of task truth.
- The bridge receives only bounded tasks that have already been approved by Worker feature gates and source selection.
- A completed task does **not** imply complete wallet history or complete token-market coverage.
- A bounded interval is considered searched only when the executor explicitly returns `rangeVerified: true` with `searchedFrom` and `searchedTo` spanning that interval.
- A verified zero-row result means only that the bounded wallet interval was searched and no rows were returned by that source. It is not a claim that the market had no activity.

## Required configuration

- `INTELLIGENCE_API_BASE`: base URL of the vNext Worker.
- `INTELLIGENCE_MESH_INGEST_TOKEN`: protected internal bearer token. Keep it in the bridge runtime secret store; never commit it.
- `INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED=true`: enables the Substreams historical executor only when a real injected Substreams transport is also supplied.
- `INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED=true`: enables the Old Faithful historical executor only when a real injected Old Faithful transport is also supplied.
- `INTELLIGENCE_BRIDGE_CLAIM_LIMIT`: optional bounded claim count, 1–5.
- `INTELLIGENCE_BRIDGE_LEASE_SECONDS`: optional lease duration, 30–300 seconds.

The Worker must separately enable the Intelligence Mesh, external retrieval, and the specific historical source. Bridge configuration cannot turn Worker features on.

## Runtime contract

`runner.mjs` performs the provider-neutral loop:

1. Claim bounded leased tasks from `/api/internal/intelligence/retrieval-tasks/claim`.
2. Dispatch each task to an explicitly injected executor matching `task.sourceKind` or `task.source`.
3. Require a verified searched range that spans the entire requested task interval.
4. For non-empty results, submit normalized evidence to `/api/internal/intelligence/adapters/<sourceKind>` with the exact `taskId`.
5. For verified empty results, finish the exact task through `/api/internal/intelligence/retrieval-tasks/finish` with the searched-range receipt.
6. On retrieval, range-verification, or ingest failure, return the leased task to retry state. The bridge never marks failed or partial work complete.

## Executor layers

- `executor-contract.mjs` defines the provider-neutral historical task/result contract.
- `substreams-executor.mjs` is a fail-closed Substreams shell. A transport must explicitly prove the complete searched interval.
- `old-faithful-executor.mjs` is a fail-closed Old Faithful shell and preserves archive references when returned.
- `bootstrap.mjs` enables only executors whose Worker-style feature flags are on **and** whose real transports are injected.
- `service.mjs` creates the long-running bridge service and refuses startup when no historical executor is safely configured.

Provider-specific network transports are intentionally not hard-coded here. They must be implemented from verified provider contracts and injected into the executor shells. Yellowstone/Richat remain live-ingest transports and are not arbitrary historical executors.

## Validation

Run locally from the repository root:

```sh
for f in services/intelligence-bridge/*.mjs; do node --check "$f"; done
node --test services/intelligence-bridge/*.test.mjs
```

Hosted CI remains deliberate; the draft branch does not require every commit to trigger a hosted run.
