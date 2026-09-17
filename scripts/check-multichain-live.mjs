import { productionOrigins } from "./deployment-origins.mjs";
import assert from 'node:assert/strict';

const origin=process.env.LIVE_ORIGIN||productionOrigins.public;
const expectedTargets=['solana','base','bsc','monad','robinhood','ethereum'];

const response=await fetch(`${origin}/api/intelligence/multichain/status?ts=${Date.now()}`,{
  headers:{accept:'application/json','cache-control':'no-cache'},
  signal:AbortSignal.timeout(30000)
});
assert.equal(response.status,200,`multichain status HTTP ${response.status}`);
const body=await response.json();
assert.equal(body?.ok,true,`multichain status failed: ${body?.error||'not ok'}`);
assert.equal(body?.schemaVersion,'multichain-evidence-spine-v1','unexpected multichain schema');
assert.equal(body?.enabled,true,'multichain evidence is not enabled in production');
assert.equal(body?.marketEnabled,true,'multichain market enrichment is not enabled in production');
assert.deepEqual(new Set(body?.fomoCoverageTargets||[]),new Set(expectedTargets),'production Fomo chain target registry is stale');
assert.equal((body?.fomoCoverageTargets||[]).includes('arc'),false,'Arc must not be claimed as a current Fomo token-chain target');
for(const key of ['assets','markets','events','evidenceKinds'])assert.ok(Array.isArray(body?.[key]),`multichain status is missing ${key}`);
console.log(JSON.stringify(body));
