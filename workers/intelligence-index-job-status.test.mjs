import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIndexJobIds, summarizeIndexJobs } from './intelligence-index-job-status.mjs';

test('normalizes bounded unique positive integer job ids',()=>{
  const ids=normalizeIndexJobIds([3,'3',2,0,-1,1.5,'4',5,6,7,8,9,10,11,12,13]);
  assert.deepEqual(ids,[3,2,4,5,6,7,8,9,10,11]);
  assert.equal(Object.isFrozen(ids),true);
});

test('separates ordinary queued work from scheduled retries',()=>{
  const summary=summarizeIndexJobs([
    {state:'complete',lastError:null,nextAttemptAt:null},
    {state:'running',lastError:null,nextAttemptAt:null},
    {state:'queued',lastError:null,nextAttemptAt:1100},
    {state:'queued',lastError:'rpc_timeout',nextAttemptAt:1120},
    {state:'queued',lastError:'old_error',nextAttemptAt:990}
  ],1000);
  assert.deepEqual(summary,{complete:1,running:1,queued:3,retrying:1,nextRetryAt:1120});
  assert.equal(Object.isFrozen(summary),true);
});
