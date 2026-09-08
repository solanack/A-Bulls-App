import test from 'node:test';
import assert from 'node:assert/strict';
import { rankWeeklyTraders } from './intelligence-trader-observatory.mjs';

const W1='11111111111111111111111111111111';
const W2='22222222222222222222222222222222';
const M1='33333333333333333333333333333333';
const now=1_700_000_000_000;

const t=(wallet,side,tokenAmount,solAmount,offset)=>({wallet,mint:M1,side,tokenAmount,solAmount,observedAt:now+offset,signature:`${wallet}-${offset}`,source:'test'});

test('weekly observatory ranks realized matched in-window SOL, not raw sell volume',()=>{
  const rows=[
    t(W1,'buy',100,10,0),
    t(W1,'sell',50,8,1000), // +3 SOL matched
    t(W2,'buy',100,10,0),
    t(W2,'sell',100,11,2000), // +1 SOL matched
  ];
  const ranked=rankWeeklyTraders(rows,{windowStartMs:now-1,windowEndMs:now+10_000,limit:50});
  assert.equal(ranked.length,2);
  assert.equal(ranked[0].wallet,W1);
  assert.ok(Math.abs(ranked[0].realizedSol-3)<1e-9);
  assert.equal(ranked[0].winRate,1);
});

test('weekly observatory excludes unmatched sells instead of inventing cost basis',()=>{
  const ranked=rankWeeklyTraders([t(W1,'sell',100,99,1000)],{windowStartMs:now-1,windowEndMs:now+10_000});
  assert.deepEqual(ranked,[]);
});

test('weekly observatory ignores trades outside the seven-day input window',()=>{
  const ranked=rankWeeklyTraders([t(W1,'buy',100,1,-20_000),t(W1,'sell',100,10,1000)],{windowStartMs:now,windowEndMs:now+10_000});
  assert.deepEqual(ranked,[]);
});
