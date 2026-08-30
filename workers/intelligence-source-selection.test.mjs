import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceDepthClass, chooseEvidenceSource, buildRetrievalPlan } from './intelligence-source-selection.mjs';

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
  assert.equal(plan.coverageClaim,'unknown-until-measured');
});

