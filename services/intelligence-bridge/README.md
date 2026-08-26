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
- `INTELLIGENCE_BRIDGE_SOURCE_KINDS`: comma-separated source kinds this bridge instance is allowed to claim, for example `substreams` or `old-faithful`.

The Worker must separately enable the Intelligence Mesh, external retrieval, and the specific historical source. The bridge configuration cannot turn Worker features on.

## Runtime contract

`runner.mjs` performs the provider-neutral loop:

1. Claim bounded leased tasks from `/api/internal/intelligence/retrieval-tasks/claim`.
2. Dispatch each task to an explicitly injected executor matching `task.sourceKind` or `task.source`.
3. Normalize the executor result without inventing missing range verification.
4. For non-empty results, submit normalized evidence to `/api/internal/intelligence/adapters/<sourceKind>` with the exact `taskId`.
5. For verified or unverified empty results, finish the exact task through `/api/internal/intelligence/retrieval-tasks/finish`; the Worker decides whether the receipt satisfies the requested interval.
6. On retrieval/ingest failure, return the leased task to retry state. The bridge does not mark failed work complete.

## Provider executors

Provider-specific transports are intentionally **not** implemented in `runner.mjs`. Each executor must be built from a verified provider contract and return normalized evidence plus an explicit searched-range receipt only when the provider response proves that range was searched.

Yellowstone/Richat remain live-ingest transports and are not arbitrary historical executors. Historical bridge execution is currently intended for separately enabled Substreams and Old Faithful/archive-style sources.

## Validation

Run locally from the repository root:

```sh
node --check services/intelligence-bridge/runner.mjs
node --test services/intelligence-bridge/runner.test.mjs
```

Hosted CI remains deliberate; the draft branch does not require every commit to trigger a hosted run.
