import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateZ500Identity,
  __z500IdentityRegistryContract
} from './intelligence-z500-identity-registry.mjs';
import { __z500EvidenceContract } from './intelligence-z500-evidence-collector.mjs';
import { __z500UniverseContract } from './intelligence-z500-universe.mjs';
import { __universeSchedulerContract } from './intelligence-universe-scheduler.mjs';

const REF={name:'Bullshit Coin',ticker:'BULLSHIT'};
const MINT_A='22222222222222222222222222222222';
const MINT_B='33333333333333333333333333333333';

function item(source,mint,extra={}){
  return {
    source,mint,name:'Bullshit Coin',ticker:'BULLSHIT',directMint:true,
    marketCapUsd:5_000_000,volume24hUsd:1_000_000,liquidityUsd:250_000,
    pairCreatedAt:Date.now()-30*86400000,
    ...extra
  };
}

test('ticker/name from one source never verifies',()=>{
  const decision=evaluateZ500Identity(REF,[item('dexscreener',MINT_A)]);
  assert.equal(decision.state,'candidate');
  assert.equal(decision.mint,null);
});

test('CoinGecko plus DexScreener exact mint verifies',()=>{
  const decision=evaluateZ500Identity(REF,[item('coingecko',MINT_A),item('dexscreener',MINT_A)]);
  assert.equal(decision.state,'verified');
  assert.equal(decision.mint,MINT_A);
});

test('different one-source duplicate mints stay ambiguous',()=>{
  const decision=evaluateZ500Identity(REF,[item('coingecko',MINT_A),item('dexscreener',MINT_B)]);
  assert.equal(decision.state,'ambiguous');
  assert.equal(decision.mint,null);
});

test('two independently strong mints fail closed without a dominant cross-check',()=>{
  const decision=evaluateZ500Identity(REF,[
    item('coingecko',MINT_A,{marketCapUsd:100_000,volume24hUsd:10_000,liquidityUsd:5_000}),
    item('dexscreener',MINT_A,{marketCapUsd:100_000,volume24hUsd:10_000,liquidityUsd:5_000}),
    item('ansem-direct',MINT_B,{authoritativeLink:true})
  ]);
  assert.equal(decision.state,'conflict');
});

test('contracts preserve hard verification gates',()=>{
  assert.equal(__z500IdentityRegistryContract.exactMintIdentity,true);
  assert.equal(__z500IdentityRegistryContract.tickerAloneNeverVerifies,true);
  assert.equal(__z500IdentityRegistryContract.marketDataSupportingOnly,true);
  assert.equal(__z500EvidenceContract.heliusUsedForIdentity,false);
  assert.equal(__z500EvidenceContract.liveAnsemRequiredByDefault,true);
  assert.equal(__z500UniverseContract.membershipSource,'verified-canonical-mint-registry');
  assert.equal(__z500UniverseContract.failClosed,true);
  assert.equal(__universeSchedulerContract.z500IdentityBeforeSelector,true);
  assert.equal(__universeSchedulerContract.z500IdentityBatchDefault,2);
  assert.equal(__universeSchedulerContract.z500IdentityRefreshDefaultSeconds,300);
  assert.equal(__universeSchedulerContract.watchlistReconcilesAfterSelector,true);
});
