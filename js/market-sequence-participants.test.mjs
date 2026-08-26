import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSequenceParticipants } from './market-sequence-participants.mjs';

test('orders participants by first observed event and preserves evidence',()=>{
  const result=analyzeSequenceParticipants({events:[
    {id:'b1',timestamp:2000,wallet:'B',side:'buy',tokenDelta:5},
    {id:'a1',timestamp:1000,wallet:'A',side:'buy',tokenDelta:2},
    {id:'a2',timestamp:3000,wallet:'A',side:'sell',tokenDelta:-7},
    {id:'c1',timestamp:4000,wallet:'C',side:'transfer',tokenDelta:null}
  ]});
  assert.equal(result.walletCount,3);
  assert.deepEqual(result.firstObserved.map(row=>row.wallet),['A','B','C']);
  assert.equal(result.firstObserved[0].eventCount,2);
  assert.equal(result.firstObserved[0].buyCount,1);
  assert.equal(result.firstObserved[0].sellCount,1);
  assert.equal(result.firstObserved[0].largestAbsTokenDelta,7);
  assert.deepEqual(result.firstObserved[0].evidenceIds,['a1','a2']);
});

test('missing token deltas remain missing rather than becoming zero',()=>{
  const result=analyzeSequenceParticipants({events:[{id:'x',timestamp:1000,wallet:'A',tokenDelta:null}]});
  assert.equal(result.firstObserved[0].largestAbsTokenDelta,null);
});

test('does not combine wallets or infer identity',()=>{
  const result=analyzeSequenceParticipants({events:[{id:'x',timestamp:1000,wallet:'A'},{id:'y',timestamp:1001,wallet:'B'}]});
  assert.equal(result.walletCount,2);
  assert.match(result.disclosure,/does not establish identity/i);
  assert.match(result.disclosure,/coordination/i);
});
