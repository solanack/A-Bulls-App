import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWalletTokenIndex, buildCommonTokenIndex } from './intelligence-wallet-token-index.mjs';

const wallet='7'.repeat(32);
const walletB='6'.repeat(32);
const mint='8'.repeat(32);
const mintOnlyA='9'.repeat(32);

function fakeDb(rowsByWallet){return{prepare(){return{bind(walletArg){return{all:async()=>({results:rowsByWallet[walletArg]||[]})}}}}};}

test('builds token activity from indexed wallet events',async()=>{
  const db=fakeDb({[wallet]:[{mint,event_count:9,trade_count:4,first_event:100,last_event:500,observed_token_flow:42.5,max_confidence:.88}]});
  const index=await buildWalletTokenIndex({},wallet,{db});
  assert.equal(index.wallet,wallet);assert.equal(index.tokenCount,1);assert.equal(index.tokens[0].mint,mint);assert.equal(index.tokens[0].tradeCount,4);assert.equal(index.tokens[0].eventCount,9);assert.equal(index.tokens[0].observedTokenFlow,42.5);assert.equal(index.tokens[0].maxConfidence,.88);assert.match(index.disclosure,/currently indexed public-chain observations/);
});

test('finds tokens observed in both wallets without implying coordination',async()=>{
  const db=fakeDb({[wallet]:[{mint,event_count:9,trade_count:4,first_event:100,last_event:500,observed_token_flow:42,max_confidence:.9},{mint:mintOnlyA,event_count:2,trade_count:1,first_event:200,last_event:300,observed_token_flow:4,max_confidence:.7}],[walletB]:[{mint,event_count:7,trade_count:3,first_event:150,last_event:600,observed_token_flow:31,max_confidence:.85}]});
  const result=await buildCommonTokenIndex({},wallet,walletB,{db});
  assert.equal(result.commonTokenCount,1);assert.equal(result.commonTokens[0].mint,mint);assert.equal(result.commonTokens[0].combinedTradeCount,7);assert.equal(result.commonTokens[0].hasTemporalOverlap,true);assert.equal(result.commonTokens[0].overlapFrom,150);assert.equal(result.commonTokens[0].overlapTo,500);assert.equal(result.commonTokens[0].observedFrom,100);assert.equal(result.commonTokens[0].observedTo,600);assert.match(result.disclosure,/does not prove shared ownership, coordination/);
});

test('keeps same-token comparisons even when observed periods do not overlap',async()=>{
  const db=fakeDb({[wallet]:[{mint,event_count:3,trade_count:2,first_event:100,last_event:200,observed_token_flow:5,max_confidence:.8}],[walletB]:[{mint,event_count:4,trade_count:2,first_event:500,last_event:700,observed_token_flow:8,max_confidence:.82}]});
  const result=await buildCommonTokenIndex({},wallet,walletB,{db});
  assert.equal(result.commonTokenCount,1);assert.equal(result.commonTokens[0].hasTemporalOverlap,false);assert.equal(result.commonTokens[0].overlapFrom,null);assert.equal(result.commonTokens[0].overlapTo,null);assert.equal(result.commonTokens[0].observedFrom,100);assert.equal(result.commonTokens[0].observedTo,700);
});

test('rejects invalid public wallet input',async()=>{
  await assert.rejects(()=>buildWalletTokenIndex({},'not-a-wallet',{db:fakeDb({})}),/invalid_public_wallet/);
  await assert.rejects(()=>buildCommonTokenIndex({},wallet,wallet,{db:fakeDb({})}),/comparison_wallet_must_differ/);
});


