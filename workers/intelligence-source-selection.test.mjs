import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceDepthClass, sourceErrorReprobeEligible, chooseEvidenceSource, buildRetrievalPlan } from './intelligence-source-selection.mjs';

const now=2_000_000_000;
test('classifies retrieval depth without claiming coverage',()=>{
  assert.equal(sourceDepthClass({from:now-3600,nowSeconds:now}),'recent');
  assert.equal(sourceDepthClass({from:now-30*86400,nowSeconds:now}),'historical');
  assert.equal(sourceDepthClass({from:now-365*86400,nowSeconds:now}),'archive');
});

test('prefers healthy live source for recent retrieval',()=>{
  const result=chooseEvidenceSource([
    {name:'rpc',kind:'rpc',state:'ok',latencyMs:80,lastOkAt:now},
    {name:'yellowstone',kind:'yellowstone-stream',state:'ok',latencyMs:100,lastOkAt:now}
  ],{from:now-60,nowSeconds:now});
  assert.equal(result.selected.name,'yellowstone');
  assert.match(result.disclosure,/does not prove/i);
});

test('prefers healthy archive source for deep history and excludes errored source',()=>{
  const result=chooseEvidenceSource([
    {name:'rpc',kind:'rpc',state:'ok',latencyMs:70,lastOkAt:now},
    {name:'old-faithful',kind:'archive',state:'ok',latencyMs:400,lastOkAt:now},
    {name:'broken-archive',kind:'archive',state:'error',latencyMs:10,lastOkAt:now}
  ],{from:now-400*86400,nowSeconds:now});
  assert.equal(result.selected.name,'old-faithful');
  assert.notEqual(result.selected.name,'broken-archive');
});

test('builds deterministic fallback order without converting ranking into a coverage claim',()=>{
  const plan=buildRetrievalPlan([
    {name:'rpc',kind:'rpc',state:'ok',latencyMs:60,lastOkAt:now},
    {name:'archive',kind:'archive',state:'ok',latencyMs:200,lastOkAt:now},
    {name:'failed',kind:'archive',state:'error',latencyMs:1,lastOkAt:now}
  ],{from:now-500*86400,nowSeconds:now});
  assert.equal(plan.primary.name,'archive');
  assert.deepEqual(plan.attemptOrder.map(x=>x.name),['archive','rpc']);
  assert.equal(plan.recoveryProbe,false);
  assert.equal(plan.coverageClaim,'unknown-until-measured');
});

test('recent provider failures remain quarantined during the bounded cooldown',()=>{
  const source={name:'rpc',kind:'rpc',state:'error',lastErrorAt:now-60};
  assert.equal(sourceErrorReprobeEligible(source,{nowSeconds:now}),false);
  const plan=buildRetrievalPlan([source],{from:now-3600,nowSeconds:now});
  assert.equal(plan.primary,null);
  assert.deepEqual(plan.attemptOrder,[]);
});

test('stale provider failures are re-probed instead of becoming permanent history lockouts',()=>{
  const plan=buildRetrievalPlan([
    {name:'helius-standard-rpc',kind:'rpc',state:'error',lastErrorAt:now-3600,lastOkAt:now-7200},
    {name:'solana-public-rpc',kind:'rpc',state:'error',lastErrorAt:now-7200}
  ],{from:now-30*86400,nowSeconds:now});
  assert.ok(plan.primary);
  assert.equal(plan.recoveryProbe,true);
  assert.deepEqual(new Set(plan.attemptOrder.map(x=>x.name)),new Set(['helius-standard-rpc','solana-public-rpc']));
  assert.match(plan.disclosure,/re-probed/i);
});

test('stale errored sources remain last-resort fallbacks when healthy sources exist',()=>{
  const plan=buildRetrievalPlan([
    {name:'healthy-rpc',kind:'rpc',state:'ok',lastOkAt:now,latencyMs:80},
    {name:'stale-rpc',kind:'rpc',state:'error',lastErrorAt:now-3600,lastOkAt:now-7200}
  ],{from:now-30*86400,nowSeconds:now});
  assert.equal(plan.primary.name,'healthy-rpc');
  assert.deepEqual(plan.attemptOrder.map(x=>x.name),['healthy-rpc','stale-rpc']);
  assert.equal(plan.recoveryProbe,false);
});
