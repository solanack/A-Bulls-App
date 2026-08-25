import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWalletTokenIndex } from './intelligence-wallet-token-index.mjs';

const wallet='7'.repeat(32);
const mint='8'.repeat(32);

function fakeDb(rows){
  return {prepare(){return{bind(){return{all:async()=>({results:rows})}}}}};
}

test('builds token activity from indexed wallet events',async()=>{
  const index=await buildWalletTokenIndex({},wallet,{db:fakeDb([{
    mint,event_count:9,trade_count:4,first_event:100,last_event:500,observed_token_flow:42.5,max_confidence:.88
  }])});
  assert.equal(index.wallet,wallet);
  assert.equal(index.tokenCount,1);
  assert.equal(index.tokens[0].mint,mint);
  assert.equal(index.tokens[0].tradeCount,4);
  assert.equal(index.tokens[0].eventCount,9);
  assert.equal(index.tokens[0].observedTokenFlow,42.5);
  assert.equal(index.tokens[0].maxConfidence,.88);
  assert.match(index.disclosure,/currently indexed public-chain observations/);
});

test('rejects invalid public wallet input',async()=>{
  await assert.rejects(()=>buildWalletTokenIndex({},'not-a-wallet',{db:fakeDb([])}),/invalid_public_wallet/);
});
