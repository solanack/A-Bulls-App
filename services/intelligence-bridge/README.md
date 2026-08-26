# External Intelligence Bridge

This service is the provider-neutral execution boundary for bounded historical retrieval work issued by the A Bulls App Intelligence Mesh.

## Safety model

- Public wallet addresses only.
- Read-only retrieval only. No signing, custody, transaction submission, or trading.
- The Worker remains the coordinator and source of task truth.
- The bridge receives only bounded tasks that have already been approved by Worker feature gates and source selection.
- A completed task does **not** imply complete wallet history or complete token-market coverage.
- A bounded interval is considered searched only when the executor explicitly returns `rangeVerified: true` with `searchedFrom` and `searchedTo` spanning that interval.
- A verified zero-row result means only that the bounded wallet interval was searched and no rows were returned by that configured source. It is not a claim that the market had no activity or that the provider contains every Solana archive epoch.
- External retrieval retries are bounded. Exhaustion releases the parent history job to progressive RPC repair instead of trapping it behind a broken archive source.

## Required configuration

- `INTELLIGENCE_API_BASE`: base URL of the vNext Worker.
- `INTELLIGENCE_MESH_INGEST_TOKEN`: protected internal bearer token. Keep it in the bridge runtime secret store; never commit it.
- `INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED=true`: enables the Substreams historical executor only when a real injected Substreams transport is also supplied.
- `INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED=true`: enables the Old Faithful historical executor.
- `INTELLIGENCE_OLD_FAITHFUL_RPC_URL`: optional explicit `http(s)` Old Faithful JSON-RPC endpoint. When present with the Old Faithful flag, the bridge constructs the checked-in read-only JSON-RPC transport automatically.
- `INTELLIGENCE_OLD_FAITHFUL_RPC_HEADERS_JSON`: optional runtime-secret JSON object of HTTP headers required by the configured archive provider. Never commit its value.
- `INTELLIGENCE_OLD_FAITHFUL_PAGE_SIZE`: optional `getSignaturesForAddress` page size, clamped to 1–1000; default 1000.
- `INTELLIGENCE_OLD_FAITHFUL_MAX_PAGES`: optional pagination budget, clamped to 1–1000; default 100. Exhausting it fails closed rather than certifying the interval.
- `INTELLIGENCE_OLD_FAITHFUL_TIMEOUT_MS`: optional per-RPC timeout, clamped to 1–120 seconds; default 15 seconds.
- `INTELLIGENCE_BRIDGE_CLAIM_LIMIT`: optional bounded claim count, 1–5.
- `INTELLIGENCE_BRIDGE_LEASE_SECONDS`: optional lease duration, 30–300 seconds.
- `INTELLIGENCE_EXTERNAL_RETRIEVAL_MAX_ATTEMPTS`: Worker-side retry budget for one external task, default 4 and clamped to 1–10.

The Worker must separately enable the Intelligence Mesh, external retrieval, and the specific historical source. Bridge configuration cannot turn Worker features on.

## Runtime contract

`runner.mjs` performs the provider-neutral loop:

1. Claim bounded leased tasks from `/api/internal/intelligence/retrieval-tasks/claim`.
2. Dispatch each task to an explicitly configured executor matching `task.sourceKind` or `task.source`.
3. Require a verified searched range that spans the entire requested task interval.
4. For non-empty results, submit normalized evidence to `/api/internal/intelligence/adapters/<sourceKind>` with the exact `taskId`.
5. For verified empty results, finish the exact task through `/api/internal/intelligence/retrieval-tasks/finish` with the searched-range receipt.
6. On retrieval, range-verification, or ingest failure, return the leased task to retry state. The bridge never marks failed or partial work complete.
7. When the Worker retry budget is exhausted, the external task becomes terminally failed and the parent wallet-history job is released back to the progressive RPC path. The same failed external task is not recreated for that bounded request.

## Executor layers

- `executor-contract.mjs` defines the provider-neutral historical task/result contract.
- `substreams-executor.mjs` is a fail-closed Substreams shell. A transport must explicitly prove the complete searched interval.
- `old-faithful-executor.mjs` is the provider-neutral Old Faithful shell and preserves archive references when returned.
- `old-faithful-jsonrpc-transport.mjs` implements the concrete read-only JSON-RPC address-history transport against an operator-supplied endpoint. It paginates `getSignaturesForAddress`, keeps only rows inside the exact requested timestamp range, and refuses completion if its page budget is exhausted before the provider result set crosses/exhausts the lower boundary.
- `bootstrap.mjs` enables only executors whose Worker-style feature flags are on and whose real transport is either injected or explicitly configured from runtime environment.
- `service.mjs` creates the long-running bridge service and refuses startup when no historical executor is safely configured.
- the service exposes frozen readiness metadata (`ready`, source kinds, `readOnly`, transport-injection state) without exposing credentials.

### Provider status

Old Faithful now has a concrete configurable JSON-RPC transport based on its documented RPC contract. The repository still deliberately does not contain a production archive URL, account credential, or a claim that any configured archive has globally complete Solana coverage.

Substreams remains an executor shell. The official Solana endpoint/auth model is known, but a production package/module/parameter transport must still prove the exact bounded wallet interval before it can return `rangeVerified: true`; therefore no generic block-stream query is being mislabeled as complete wallet history.

Yellowstone/Richat remain live-ingest transports and are not arbitrary historical executors.

## Validation

From the repository root with Node 22+:

```sh
npm run validate:release-candidate
```

For only the bridge layer:

```sh
for f in services/intelligence-bridge/*.mjs; do node --check "$f"; done
node --test services/intelligence-bridge/*.test.mjs
```

Hosted GitHub Actions are not required to perform the local gate; a complete runnable validation result is still required before production deployment.
