# Production Verification — 2026-09-17

Phase 4 evidence for the Data Reliability + Trickster Cut Rebuild.

## Release identity

- Verified production source commit: `485b4a5bbb2f0aa1240d60c90713a9c6b3b4d922`
- GitHub Actions deploy run: `35254979660`
- Production preflight artifact: `production-preflight-485b4a5bbb2f0aa1240d60c90713a9c6b3b4d922` (artifact id `10511269438`)
- Intelligence Worker version published by that run: `1b2e7ce2-0746-44d7-b516-e577a30f86ba`
- Frontend Worker version published by that run: `547cc13f-5b4c-4ab1-915c-7bcc38704d8e`

The old `REVIEW_2026-09-08.md` statement that repository Actions could not deploy because `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` were unavailable is stale. The deployment job explicitly required both credentials and succeeded.

## Release gate and public smoke

The post-merge Cloudflare workflow completed successfully. It re-ran repository tests, TypeScript, the production frontend build, Intelligence Worker dry-run, frontend Worker dry-run, migration inspection, retained-evidence fixture discovery, and pre-mutation validation before publishing either Worker.

After publish, `scripts/check-live.mjs` reported:

> Live release, Fomo PnL coverage, trader data, frozen Cut route, retained Replay receipts, OHLC, holdings, and resolver coverage checks passed.

The retained live Replay fixture used by this release was discovered from production D1 rather than hard-coded as synthetic evidence. The selected fixture had retained transaction signatures and indexed 1-minute OHLC coverage.

## Multichain evidence

`scripts/check-multichain-live.mjs` returned `ok: true` with configured Fomo coverage targets:

- Solana
- Base
- BSC
- Monad
- Robinhood
- Ethereum

Observed production D1 population at verification time included:

| Dataset | Base | BSC | Ethereum | Monad | Robinhood | Solana |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fomo positions | 10 | 15 | 3 | 0 | 98 | 84 |
| Fomo trades | 33 | 75 | 12 | 1 | 476 | 47 |
| Chain assets v2 | 6 | 17 | 3 | 0 | 70 | 44 |
| Market snapshots v2 | 6 | 17 | 3 | 0 | 33 | 40 |
| Chain events v2 | 4 | 19 | 3 | 0 | 84 | 11 |

The absence of Monad asset/market/event rows is treated as unavailable retained coverage, not zero activity. The multichain endpoint disclosure continues to separate provider-reported Fomo records from independently observed transaction receipts.

## Replay hydration diagnostic

`scripts/diagnose-replay-production.mjs` returned:

- `ok: true`
- status: `no-sparse-row-currently-available`
- the sampled Fomo trade was already `observedIndexed: true`

That result means the diagnostic could not exercise a currently sparse production row because its sample was already hydrated. It does **not** prove every possible sparse wallet has complete history.

## Solana history source health

Production source-health rows captured by the deploy run showed:

| Source | State | Latest latency | Note |
| --- | --- | ---: | --- |
| `helius-getTransactionsForAddress` | `ok` | 580 ms | archive/history path healthy at capture |
| `helius-standard-rpc` | `ok` | 192 ms | configured Helius RPC path healthy at capture |
| `solana-public-rpc` | `error` | unavailable | retained error was `getSignaturesForAddress:http_403` |

The public Solana RPC is therefore **not** considered a dependable archival fallback. Production history remains dependent on the configured Helius paths and retained D1 evidence. This warning stays explicit rather than being collapsed into a successful/empty state.

## Provider fetch reliability now live

The same production commit introduced:

- bounded provider timeout/retry/backoff configuration;
- at least one retry for transient network failures, 429, and 5xx through `providerFetch`;
- machine-readable empty reasons: `NO_EVIDENCE`, `PROVIDER_FAILURE`, `PROVIDER_TIMEOUT`, `PROVIDER_BUDGET_EXHAUSTED`;
- unchanged calm user-facing disclosures and no fabricated fallback data.

## Phase 4 conclusion

For commit `485b4a5bbb2f0aa1240d60c90713a9c6b3b4d922`, `main == production` was proven by the release artifact identity and successful post-deploy checks. The remaining public-Solana-RPC 403 is documented as a degraded fallback, while both configured Helius history paths were healthy at the captured production check.
