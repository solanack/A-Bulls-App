import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIndexJobIds, summarizeIndexJobs } from './intelligence-index-job-status.mjs';

test('normalizes bounded unique positive integer job ids',()=>{
  const ids=normalizeIndexJobIds([3,'3',2,0,-1,1.5,'4',5,6,7,8,9,10,11,12,13]);
  assert.deepEqual(ids,[3,2,4,5,6,7,8,9,10,11]);
  assert.equal(Object.isFrozen(ids),true);
});

test('separates retries, external waits, exhausted fallbacks, work counters and retrieval sources',()=>{
  const summary=summarizeIndexJobs([
    {state:'complete',source:'configured-rpc-fallback-1',lastError:null,nextAttemptAt:null,pagesCompleted:2,signaturesSeen:50,transactionsIngested:42},
    {state:'running',source:'configured-rpc-fallback-1',lastError:null,nextAttemptAt:null,pagesCompleted:1,signaturesSeen:25,transactionsIngested:20},
    {state:'waiting-external',source:'old-faithful',lastError:null,nextAttemptAt:null,pagesCompleted:0,signaturesSeen:0,transactionsIngested:0},
    {state:'queued',source:null,lastError:'external_retrieval_exhausted',nextAttemptAt:1000,pagesCompleted:0,signaturesSeen:0,transactionsIngested:0},
    {state:'queued',source:null,lastError:null,nextAttemptAt:1100,pagesCompleted:0,signaturesSeen:0,transactionsIngested:0},
    {state:'queued',source:'solana-public-rpc',lastError:'rpc_timeout',nextAttemptAt:1120,pagesCompleted:1,signaturesSeen:25,transactionsIngested:0},
    {state:'queued',source:'solana-public-rpc',lastError:'old_error',nextAttemptAt:990,pagesCompleted:1,signaturesSeen:10,transactionsIngested:8}
  ],1000);
  assert.deepEqual(summary,{complete:1,running:1,queued:4,waitingExternal:1,externalFallbackQueued:1,retrying:1,nextRetryAt:1120,pagesCompleted:5,signaturesSeen:110,transactionsIngested:70,sources:['configured-rpc-fallback-1','old-faithful','solana-public-rpc']});
  assert.equal(Object.isFrozen(summary),true);
  assert.equal(Object.isFrozen(summary.sources),true);
});


