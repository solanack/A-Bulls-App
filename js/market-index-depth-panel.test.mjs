import test from 'node:test';
import assert from 'node:assert/strict';
import { describeIndexJobProgress } from './market-index-depth-panel.mjs';

test('labels scheduled retries without claiming completion',()=>{
  const view=describeIndexJobProgress({schedulerEnabled:true,found:2,complete:0,running:0,queued:2,waitingExternal:0,retrying:1,pagesCompleted:1,signaturesSeen:25,transactionsIngested:20,sources:['configured-rpc-fallback-1']});
  assert.equal(view.terminal,false);
  assert.equal(view.reload,false);
  assert.match(view.text,/RETRY SCHEDULED/);
  assert.match(view.text,/1 PAGES · 25 SIGNATURES · 20 TX INGESTED/);
  assert.match(view.text,/SOURCE USED configured-rpc-fallback-1/);
});

test('labels external retrieval as planned rather than used',()=>{
  const view=describeIndexJobProgress({schedulerEnabled:true,found:1,complete:0,running:0,queued:0,waitingExternal:1,retrying:0,pagesCompleted:0,signaturesSeen:0,transactionsIngested:0,sources:['old-faithful']});
  assert.equal(view.terminal,false);
  assert.equal(view.reload,false);
  assert.match(view.text,/EXTERNAL RETRIEVAL/);
  assert.match(view.text,/SOURCE PLANNED old-faithful/);
  assert.doesNotMatch(view.text,/SOURCE USED old-faithful/);
});

test('offers reload only when every found job is complete',()=>{
  const view=describeIndexJobProgress({schedulerEnabled:true,found:2,complete:2,running:0,queued:0,waitingExternal:0,retrying:0,pagesCompleted:4,signaturesSeen:100,transactionsIngested:82,sources:['configured-rpc']});
  assert.deepEqual(view,{terminal:true,reload:true,text:'INDEX ADVANCED · 2/2 COMPLETE · 4 PAGES · 100 SIGNATURES · 82 TX INGESTED · SOURCE USED configured-rpc'});
});

test('reports a paused scheduler as terminal without reload',()=>{
  const view=describeIndexJobProgress({schedulerEnabled:false,found:2,complete:0,running:0,queued:2,waitingExternal:0,retrying:0,pagesCompleted:0,signaturesSeen:0,transactionsIngested:0,sources:[]});
  assert.deepEqual(view,{terminal:true,reload:false,text:'QUEUED · SCHEDULER PAUSED · 0 PAGES · 0 SIGNATURES · 0 TX INGESTED'});
});
