import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentMarketSequence } from './market-sequence-phases.mjs';

test('splits longer sequences at the largest observed time gaps',()=>{
  const result=segmentMarketSequence({events:[
    {id:'a',timestamp:0,wallet:'W1',side:'buy',tokenDelta:1},
    {id:'b',timestamp:10,wallet:'W1',side:'buy',tokenDelta:2},
    {id:'c',timestamp:20,wallet:'W2',side:'sell',tokenDelta:-3},
    {id:'d',timestamp:1000,wallet:'W3',side:'buy',tokenDelta:4},
    {id:'e',timestamp:1010,wallet:'W3',side:'sell',tokenDelta:-5},
    {id:'f',timestamp:3000,wallet:'W4',side:'buy',tokenDelta:6}
  ]});
  assert.equal(result.method,'largest-observed-time-gaps');
  assert.equal(result.phases.length,3);
  assert.deepEqual(result.phases.map(phase=>phase.eventCount),[3,2,1]);
  assert.equal(result.phases[1].largestAbsTokenDelta,5);
});

test('uses neutral phase labels and does not infer strategy',()=>{
  const result=segmentMarketSequence({events:[{id:'a',timestamp:1},{id:'b',timestamp:2},{id:'c',timestamp:3}]});
  assert.ok(result.phases.every((phase,index)=>phase.label===`PHASE ${index+1}`));
  assert.match(result.disclosure,/do not label market regime/i);
  assert.match(result.disclosure,/trader intent/i);
});

test('missing deltas remain missing',()=>{
  const result=segmentMarketSequence({events:[{id:'a',timestamp:1,tokenDelta:null}]});
  assert.equal(result.phases[0].largestAbsTokenDelta,null);
});
