import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredRpcSources, configuredExternalHistorySources, mergeSourceHealth, externalHistorySource } from './intelligence-history-orchestrator.mjs';
import { buildRetrievalPlan } from './intelligence-source-selection.mjs';

test('builds executable RPC source order with duplicate URLs removed',()=>{
  const sources=configuredRpcSources({
    INTELLIGENCE_RPC_URL:'https://rpc.primary',
    INTELLIGENCE_RPC_FALLBACK_URLS:'https://rpc.backup, https://rpc.primary',
    HELIUS_API_KEY:'abc'
  });
  assert.deepEqual(sources.map(x=>x.name),['configured-rpc','configured-rpc-fallback-1','helius-standard-rpc','solana-public-rpc']);
});

test('bootstraps only explicitly enabled external history executors and overlays observed health',()=>{
  const sources=configuredExternalHistorySources({
    INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED:'true',
    INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED:'true',
    INTELLIGENCE_SUBSTREAMS_SOURCE_NAME:'substreams-a'
  },[{name:'substreams-a',kind:'substreams',state:'ok',latencyMs:120}]);
  assert.deepEqual(sources.map(x=>x.name),['substreams-a','old-faithful']);
  assert.equal(sources[0].state,'ok');
  assert.equal(sources[0].latencyMs,120);
  assert.equal(sources[1].state,'unknown');
  assert.equal(sources[0].execution,'external-bridge');
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

test('only bounded historical transports are eligible for external history execution',()=>{
  assert.equal(externalHistorySource({kind:'substreams'}),true);
  assert.equal(externalHistorySource({kind:'old-faithful'}),true);
  assert.equal(externalHistorySource({kind:'archive-faithful'}),true);
  assert.equal(externalHistorySource({kind:'yellowstone'}),false);
  assert.equal(externalHistorySource({kind:'richat'}),false);
  assert.equal(externalHistorySource({kind:'rpc'}),false);
});
