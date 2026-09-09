import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveMatchedRounds } from './intelligence-research-materializer.mjs';

const row=(id,side,token,sol,time)=>({event_id:id,signature:`sig-${id}`,event_index:0,wallet:'wallet',mint:'mint',side,token_amount:token,sol_amount:sol,block_time:time});

test('matched rounds close deterministic FIFO inventory cycles',()=>{
  const rounds=deriveMatchedRounds([row('b1','buy',100,1,100),row('s1','sell',40,.6,110),row('s2','sell',60,.9,120)]);
  assert.equal(rounds.length,1);assert.equal(rounds[0].status,'closed');assert.equal(rounds[0].buySol,1);assert.equal(rounds[0].sellSol,1.5);assert.equal(rounds[0].matchedRealizedSol,.5);assert.equal(rounds[0].observedInventory,0);assert.deepEqual(rounds[0].evidenceIds,['b1','s1','s2']);
});

test('open inventory never receives a realized result',()=>{
  const rounds=deriveMatchedRounds([row('b1','buy',100,1,100),row('s1','sell',25,.4,110)]);
  assert.equal(rounds.length,1);assert.equal(rounds[0].status,'open');assert.equal(rounds[0].observedInventory,75);assert.equal(rounds[0].matchedRealizedSol,null);
});

test('unmatched sells remain explicitly unmatched instead of inventing cost basis',()=>{
  const rounds=deriveMatchedRounds([row('s1','sell',20,.25,100)]);
  assert.equal(rounds.length,1);assert.equal(rounds[0].status,'unmatched');assert.equal(rounds[0].buySol,null);assert.equal(rounds[0].matchedRealizedSol,null);
});

test('oversells split supported matched inventory from unsupported remainder',()=>{
  const rounds=deriveMatchedRounds([row('b1','buy',10,1,100),row('s1','sell',15,3,110)]);
  assert.equal(rounds.length,2);assert.equal(rounds[0].status,'closed');assert.equal(rounds[0].sellSol,2);assert.equal(rounds[0].matchedRealizedSol,1);assert.equal(rounds[1].status,'unmatched');assert.equal(rounds[1].sellSol,1);
});
