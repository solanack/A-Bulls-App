import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PONS_TOP25_CONTRACT,
  buildPonsMarketRankQuery,
  handlePonsRankingRequest,
  normalizePonsMarketRows,
  selectStablePonsTop25,
} from './intelligence-pons-ranking.mjs';

const token=index=>`0x${index.toString(16).padStart(40,'0')}`;
const row=(index,marketCap,now)=>({Block:{Time:new Date(now*1000).toISOString()},Token:{Address:token(index),Symbol:`T${index}`,Name:`Token ${index}`},Supply:{MarketCap:marketCap,FullyDilutedValuationUsd:marketCap*2,CirculatingSupply:100,TotalSupply:200},Price:{Ohlc:{Close:1}}});

test('contract is read-only, capped at 25, and forbids FDV fallback',()=>{
  assert.equal(PONS_TOP25_CONTRACT.maximumMembers,25);
  assert.equal(PONS_TOP25_CONTRACT.marketCapFloorUsd,500000);
  assert.equal(PONS_TOP25_CONTRACT.fdvFallback,false);
  assert.equal(PONS_TOP25_CONTRACT.readOnly,true);
});

test('Bitquery discovery query clamps the market-cap floor',()=>{
  const query=buildPonsMarketRankQuery(500,1);
  assert.match(query,/Network: \{is: \"Robinhood\"\}/);
  assert.match(query,/MarketCap: \{ge: 500000\}/);
});

test('normalizer rejects stale, malformed, below-floor, and FDV-only rows',()=>{
  const now=2_000_000_000;
  const rows=[row(1,600000,now),row(2,499999,now),{...row(3,700000,now-901)}, {...row(4,700000,now),Token:{Address:'bad'}},{...row(5,0,now),Supply:{FullyDilutedValuationUsd:900000}}];
  const normalized=normalizePonsMarketRows(rows,now,{maxAgeSeconds:900});
  assert.deepEqual(normalized.map(item=>item.token),[token(1)]);
});

test('membership requires two cycles, caps at 25, and exits after two misses',()=>{
  const markets=Array.from({length:30},(_,index)=>({token:token(index+1),marketCapUsd:2_000_000-index*1000}));
  const first=selectStablePonsTop25(markets,[]);
  assert.equal(first.filter(item=>item.active).length,0);
  const prior=first.map(item=>({token:item.token,market_cap_usd:item.marketCapUsd,qualifying_cycles:item.qualifyingCycles,disqualifying_cycles:0,active:0}));
  const second=selectStablePonsTop25(markets,prior);
  assert.equal(second.filter(item=>item.active).length,25);
  const activePrior=second.map(item=>({token:item.token,market_cap_usd:item.marketCapUsd,qualifying_cycles:item.qualifyingCycles,disqualifying_cycles:item.disqualifyingCycles,active:item.active?1:0}));
  const oneMiss=selectStablePonsTop25([],activePrior);
  assert.equal(oneMiss.filter(item=>item.active).length,25);
  const missPrior=oneMiss.map(item=>({token:item.token,market_cap_usd:item.marketCapUsd,qualifying_cycles:item.qualifyingCycles,disqualifying_cycles:item.disqualifyingCycles,active:item.active?1:0}));
  const twoMisses=selectStablePonsTop25([],missPrior);
  assert.equal(twoMisses.filter(item=>item.active).length,0);
});

test('a new entrant cannot evict an active token before its second miss',()=>{
  const incumbent={token:token(1),market_cap_usd:600000,qualifying_cycles:2,disqualifying_cycles:0,active:1};
  const firstMiss=selectStablePonsTop25([{token:token(2),marketCapUsd:5_000_000}],[incumbent],{maximumMembers:1});
  assert.equal(firstMiss.find(item=>item.token===token(1))?.active,true);
  assert.equal(firstMiss.find(item=>item.token===token(2))?.active,false);
});

test('protected ranking route fails closed while disabled',async()=>{
  const response=await handlePonsRankingRequest(new Request('https://abullsapp.com/api/intelligence/pons/rank',{method:'POST'}),{});
  assert.equal(response.status,404);
});
