import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredRpcSources, mergeSourceHealth } from './intelligence-history-orchestrator.mjs';
import { buildRetrievalPlan } from './intelligence-source-selection.mjs';

test('builds executable RPC source order with duplicate URLs removed',()=>{
  const sources=configuredRpcSources({
    INTELLIGENCE_RPC_URL:'https://rpc.primary',
    INTELLIGENCE_RPC_FALLBACK_URLS:'https://rpc.backup, https://rpc.primary',
    HELIUS_API_KEY:'abc'
  });
  assert.deepEqual(sources.map(x=>x.name),['configured-rpc','configured-rpc-fallback-1','helius-standard-rpc','solana-public-rpc']);
});

test('merges observed health without allowing health rows to replace executable URLs',()=>{
  const configured=[{name:'configured-rpc',kind:'rpc',url:'https://real.rpc'}];
  const merged=mergeSourceHealth(configured,[{name:'configured-rpc',kind:'archive',state:'error',latencyMs:999,url:'https://untrusted.example'}]);
  assert.equal(merged[0].url,'https://real.rpc');
  assert.equal(merged[0].kind,'rpc');
  assert.equal(merged[0].state,'error');
  assert.equal(merged[0].latencyMs,999);
});

test('retrieval plan skips failed executable provider and keeps coverage unknown',()=>{
  const now=2_000_000_000;
  const plan=buildRetrievalPlan([
    {name:'configured-rpc',kind:'rpc',url:'https://bad',state:'error',latencyMs:10,lastOkAt:now},
    {name:'configured-rpc-fallback-1',kind:'rpc',url:'https://good',state:'ok',latencyMs:80,lastOkAt:now}
  ],{from:now-86400,nowSeconds:now});
  assert.equal(plan.primary.name,'configured-rpc-fallback-1');
  assert.equal(plan.coverageClaim,'unknown-until-measured');
});
