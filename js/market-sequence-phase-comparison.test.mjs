import test from 'node:test';
import assert from 'node:assert/strict';
import { compareMarketSequencePhases } from './market-sequence-phase-comparison.mjs';

const phases=[
  {id:'phase-1',label:'PHASE 1',eventCount:2,walletCount:1,buyCount:2,sellCount:0,largestAbsTokenDelta:10,evidenceIds:['a','b']},
  {id:'phase-2',label:'PHASE 2',eventCount:5,walletCount:3,buyCount:3,sellCount:2,largestAbsTokenDelta:25,evidenceIds:['c','d']},
  {id:'phase-3',label:'PHASE 3',eventCount:1,walletCount:1,buyCount:0,sellCount:1,largestAbsTokenDelta:null,evidenceIds:['e']}
];

test('compares adjacent neutral phases with evidence IDs',()=>{
  const result=compareMarketSequencePhases(phases);
  assert.equal(result.transitions.length,2);
  assert.equal(result.transitions[0].eventDelta,3);
  assert.equal(result.transitions[0].walletDelta,2);
  assert.equal(result.transitions[0].largestAbsTokenDeltaChange,15);
  assert.deepEqual(result.transitions[0].evidenceIds,['a','b','c','d']);
  assert.match(result.transitions[0].statement,/PHASE 2 has 5 indexed events/i);
});

test('missing numeric phase deltas stay missing',()=>{
  const result=compareMarketSequencePhases(phases);
  assert.equal(result.transitions[1].largestAbsTokenDeltaChange,null);
});

test('disclosure forbids regime and intent interpretation',()=>{
  const result=compareMarketSequencePhases(phases);
  assert.match(result.disclosure,/do not identify market regime/i);
  assert.match(result.disclosure,/trader intent/i);
});
