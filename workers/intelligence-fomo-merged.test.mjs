import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeFomoTraderResponses,mergeIndexedWalletActivity,__fomoMergedContract } from './intelligence-fomo-merged.mjs';

const MINT='5AhfPStn66hRYoNNDfJHSDgCH7fBbwMQZUECRrhTo62F';
const OTHER='So11111111111111111111111111111111111111112';

test('partial live enrichment keeps provider-reported mapped token planets',()=>{
  const live={ok:true,coverage:'partial',positions:[],latestTrades:[{signature:null,mint:OTHER,side:'buy',observedAt:200,sourceKind:'fomo-reported-position-event'}],disclosure:'live'};
  const fallback={ok:true,coverage:'partial',positions:[{rank:1,mint:MINT,symbol:'KEEP',name:'Keep Me',sourceKind:'fomo-reported',valueUsd:null,tradeCount:null,lastObservedAt:null}],latestTrades:[],disclosure:'fallback'};
  const merged=mergeFomoTraderResponses(live,fallback);
  assert.equal(merged.positions.length,1);
  assert.equal(merged.positions[0].mint,MINT);
  assert.equal(merged.positions[0].symbol,'KEEP');
  assert.equal(merged.latestTrades.length,1);
});

test('observed and provider position evidence merge without losing enriched values',()=>{
  const live={ok:true,positions:[{rank:1,mint:MINT,symbol:null,name:null,sourceKind:'a-bulls-observed',valueUsd:125,tradeCount:4,lastObservedAt:300}],latestTrades:[],disclosure:'live'};
  const fallback={ok:true,positions:[{rank:1,mint:MINT,symbol:'TOKEN',name:'Token',sourceKind:'fomo-reported',valueUsd:null,tradeCount:null,lastObservedAt:null}],latestTrades:[],disclosure:'fallback'};
  const merged=mergeFomoTraderResponses(live,fallback);
  assert.equal(merged.positions[0].symbol,'TOKEN');
  assert.equal(merged.positions[0].valueUsd,125);
  assert.equal(merged.positions[0].tradeCount,4);
  assert.equal(merged.positions[0].sourceKind,'fomo-reported+a-bulls-observed');
});

test('wallet token index evidence fills sparse trader systems without inventing balances',()=>{
  const payload={ok:true,coverage:'empty',trader:{solanaWallet:MINT},positions:[],latestTrades:[],disclosure:'sparse'};
  const indexed=mergeIndexedWalletActivity(payload,{ok:true,index:{tokenCount:1,tokens:[{mint:OTHER,eventCount:7,tradeCount:3,lastEvent:1_780_000_000,observedTokenFlow:22}],coverage:{complete_to_genesis:0},indexing:{requested:true}}});
  assert.equal(indexed.positions.length,1);
  assert.equal(indexed.positions[0].mint,OTHER);
  assert.equal(indexed.positions[0].sourceKind,'a-bulls-observed');
  assert.equal(indexed.positions[0].tradeCount,3);
  assert.equal(indexed.positions[0].amount,null);
  assert.equal(indexed.indexing.requested,true);
  assert.equal(indexed.indexing.completeToGenesis,false);
});

test('merged Fomo trader responses stay bounded and page reads never execute transactions',()=>{
  const trades=Array.from({length:6},(_,index)=>({signature:`sig-${index}`,mint:MINT,side:'buy',observedAt:index+1,sourceKind:'a-bulls-observed'}));
  const merged=mergeFomoTraderResponses({ok:true,positions:[],latestTrades:trades,disclosure:'live'},{ok:true,positions:[],latestTrades:trades,disclosure:'fallback'});
  assert.equal(merged.latestTrades.length,3);
  assert.equal(__fomoMergedContract.maximumPositions,10);
  assert.equal(__fomoMergedContract.latestTrades,3);
  assert.equal(__fomoMergedContract.pageReadsProviderFree,true);
  assert.equal(__fomoMergedContract.auditPath,'/api/intelligence/fomo/audit');
  assert.equal(__fomoMergedContract.boundedWalletHistoryOnSparseSolanaTrader,true);
});
