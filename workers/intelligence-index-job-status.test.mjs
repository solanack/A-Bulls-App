import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIndexJobIds } from './intelligence-index-job-status.mjs';

test('normalizes bounded unique positive integer job ids',()=>{
  const ids=normalizeIndexJobIds([3,'3',2,0,-1,1.5,'4',5,6,7,8,9,10,11,12,13]);
  assert.deepEqual(ids,[3,2,4,5,6,7,8,9,10,11]);
  assert.equal(Object.isFrozen(ids),true);
});
