import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarketBackfillPlan } from './intelligence-market-backfill-plan.mjs';

test('flags only incomplete wallets whose oldest indexed point is newer than the request start',()=>{
  const plan=buildMarketBackfillPlan([
    {wallet:'WalletA',oldest_block_time:200,complete_to_genesis:0},
    {wallet:'WalletB',oldest_block_time:50,complete_to_genesis:0},
    {wallet:'WalletC',oldest_block_time:300,complete_to_genesis:1},
    {wallet:'WalletD',oldest_block_time:null,complete_to_genesis:0}
  ],{requestFrom:100,requestTo:500});
  assert.equal(plan.candidateCount,1);
  assert.equal(plan.candidates[0].wallet,'WalletA');
  assert.equal(plan.candidates[0].missingOlderSeconds,100);
});

test('does not interpret newer quiet periods as missing data',()=>{
  const plan=buildMarketBackfillPlan([{wallet:'WalletA',oldest_block_time:50,newest_block_time:150,complete_to_genesis:0}],{requestFrom:100,requestTo:500});
  assert.equal(plan.candidateCount,0);
  assert.match(plan.disclosure,/does not treat a quiet period as a data gap/i);
});

test('invalid request windows fail closed',()=>{
  assert.throws(()=>buildMarketBackfillPlan([],{requestFrom:500,requestTo:100}),/valid requested coverage window/);
});


