import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OBSERVATORY_CACHE_KEY, OBSERVATORY_HIDE_AFTER_SECONDS, presentObservatoryPayload, rankWeeklyTraders } from './intelligence-trader-observatory.mjs';

const W1='11111111111111111111111111111111';
const W2='22222222222222222222222222222222';
const W3='44444444444444444444444444444445';
const W4='55555555555555555555555555555555';
const M1='33333333333333333333333333333333';
const M2='66666666666666666666666666666666';
const now=1_700_000_000_000;
const window={windowStartMs:now-1,windowEndMs:now+100_000,limit:50};

const trip=(wallet,mint,buySol,sellSol,offset,feeSol=undefined)=>([
  {wallet,mint,side:'buy',tokenAmount:10,solAmount:buySol,observedAt:now+offset,signature:`${wallet}-${offset}-b`},
  {wallet,mint,side:'sell',tokenAmount:10,solAmount:sellSol,observedAt:now+offset+5,signature:`${wallet}-${offset}-s`,...(feeSol==null?{}:{feeSol})},
]);
const book=(wallet,pnls,feeSol=undefined)=>pnls.flatMap((pnl,index)=>trip(wallet,index%2?M2:M1,10,10+pnl,index*100,feeSol));

test('weekly observatory ranks matched realized SOL, not sell volume or win rate',()=>{
  const rows=[
    ...book(W1,[0.6,0.6,0.6,0.6,0.6]),
    ...book(W2,[10,1,-1,-2,-3]),
    ...book(W3,[0.2,0.2,0.2,0.2,0.2].map(()=>0.2)),
    ...trip(W4,M1,1,101,0),
  ];
  const ranked=rankWeeklyTraders(rows,window);
  assert.deepEqual(ranked.items.map(item=>item.wallet),[W2,W1,W3]);
  assert.equal(ranked.excludedBelowSample,1);
  assert.ok(Math.abs(ranked.items[0].realizedSol-5)<1e-9);
  assert.ok(ranked.items[0].winRate<ranked.items[1].winRate);
  assert.equal(ranked.items[0].sampleSize,5);
  assert.ok(Math.abs(ranked.items[0].medianTradePnlSol-(-1))<1e-9);
  assert.ok(Math.abs(ranked.items[0].profitConcentrationTop1-(10/11))<1e-9);
  assert.equal(ranked.items[0].profitConcentrationTop3,1);
  assert.equal(ranked.items[0].netOfFeesSol,null);
  assert.equal(ranked.items[0].feeTreatment,'gross-swap-leg-network-fees-unobserved');
  assert.equal(ranked.items[0].completeness.state,'complete');
  assert.equal(ranked.items[0].completeness.sampleSufficient,true);
  assert.equal(ranked.items[0].completeness.costBasisMatched,true);
});

test('five matched sells on one mint stay below the token minimum even with a second unmatched buy',()=>{
  const rows=[
    ...[0,1,2,3,4].flatMap(index=>trip(W1,M1,10,11,index*100)),
    {wallet:W1,mint:M2,side:'buy',tokenAmount:10,solAmount:1,observedAt:now+900,signature:`${W1}-extra-b`},
  ];
  const ranked=rankWeeklyTraders(rows,window);
  assert.equal(ranked.items.length,0);
  assert.equal(ranked.excludedBelowSample,1);
});

test('weekly observatory excludes a single matched sell instead of ranking a 100 percent win rate',()=>{
  const ranked=rankWeeklyTraders([...trip(W1,M1,1,50,0)],window);
  assert.deepEqual(ranked.items,[]);
  assert.equal(ranked.excludedBelowSample,1);
});

test('weekly observatory excludes unmatched sells instead of inventing cost basis',()=>{
  const ranked=rankWeeklyTraders([{wallet:W1,mint:M1,side:'sell',tokenAmount:100,solAmount:99,observedAt:now+1000,signature:'only-sell'}],window);
  assert.deepEqual(ranked.items,[]);
  assert.equal(ranked.considered,0);
});

test('weekly observatory never turns unknown acquisition cost into apparent profit',()=>{
  const rows=[
    {wallet:W1,mint:M1,side:'buy',tokenAmount:100,solAmount:null,observedAt:now,signature:'unknown-buy'},
    {wallet:W1,mint:M1,side:'sell',tokenAmount:100,solAmount:5,observedAt:now+1000,signature:'unknown-sell'},
  ];
  const ranked=rankWeeklyTraders(rows,window);
  assert.deepEqual(ranked.items,[]);
});

test('a priced slice is realized and the unpriced remainder stays unmatched',()=>{
  const rows=[
    ...book(W1,[0.2,0.2,0.2,0.2]),
    {wallet:W1,mint:M2,side:'buy',tokenAmount:4,solAmount:0.4,observedAt:now+900,signature:'partial-buy'},
    {wallet:W1,mint:M2,side:'sell',tokenAmount:10,solAmount:2,observedAt:now+910,signature:'partial-sell'},
  ];
  const ranked=rankWeeklyTraders(rows,window);
  assert.equal(ranked.items.length,1);
  assert.ok(Math.abs(ranked.items[0].realizedSol-1.2)<1e-9);
  assert.equal(ranked.items[0].unknownBasisSellCount,1);
  assert.equal(ranked.items[0].completeness.state,'partial');
  assert.equal(ranked.items[0].completeness.costBasisMatched,false);
});

test('a zero SOL leg is known basis and observed sell fees become net of fees',()=>{
  const rows=book(W1,[1,1,1,1,1],0.01).map(row=>row.side==='buy'?{...row,solAmount:row.signature.endsWith('-b')?0:row.solAmount}:row);
  const ranked=rankWeeklyTraders(rows,{...window,feesOnRows:true});
  assert.equal(ranked.items.length,1);
  assert.ok(Math.abs(ranked.items[0].realizedSol-55)<1e-9);
  assert.ok(Math.abs(ranked.items[0].netOfFeesSol-54.95)<1e-9);
  assert.equal(ranked.items[0].feeTreatment,'net-of-observed-sell-network-fees');
});

test('a stored zero fee is unobserved and does not invent a net figure',()=>{
  const rows=book(W1,[1,1,1,1,1],0);
  const ranked=rankWeeklyTraders(rows,{...window,feesOnRows:true});
  assert.equal(ranked.items[0].netOfFeesSol,null);
  assert.equal(ranked.items[0].feeTreatment,'gross-network-fees-incomplete');
});

test('weekly observatory ignores trades outside the seven-day input window',()=>{
  const ranked=rankWeeklyTraders([
    {wallet:W1,mint:M1,side:'buy',tokenAmount:100,solAmount:1,observedAt:now-20_000,signature:'old-buy'},
    {wallet:W1,mint:M1,side:'sell',tokenAmount:100,solAmount:10,observedAt:now+1000,signature:'late-sell'},
  ],{windowStartMs:now,windowEndMs:now+10_000});
  assert.deepEqual(ranked.items,[]);
});

test('an observatory payload older than seven days is withheld and a two-hour payload is flagged stale',()=>{
  const payload={ok:true,coverage:'partial',items:[{wallet:W1,completeness:{state:'complete',fresh:true,reasons:[]}}],disclosure:'Cached ranking.'};
  const nowSec=1_800_000_000;
  const hidden=presentObservatoryPayload(payload,{generatedAt:nowSec-OBSERVATORY_HIDE_AFTER_SECONDS-1,nowSec});
  assert.equal(hidden.withheld,true);
  assert.deepEqual(hidden.items,[]);
  assert.equal(hidden.coverage,'stale');
  assert.match(hidden.disclosure,/hidden/);
  const stale=presentObservatoryPayload(payload,{generatedAt:nowSec-3*3600,nowSec});
  assert.equal(stale.withheld,false);
  assert.equal(stale.items.length,1);
  assert.equal(stale.items[0].completeness.fresh,false);
  assert.equal(stale.items[0].completeness.state,'partial');
  assert.match(stale.disclosure,/may be out of date/);
});

test('the scheduler rewrites the observatory cache and does not keep the average-cost key',()=>{
  const hooks=readFileSync(new URL('./intelligence-worker-hooks.mjs',import.meta.url),'utf8');
  const source=readFileSync(new URL('./intelligence-trader-observatory.mjs',import.meta.url),'utf8');
  assert.match(hooks,/refreshTraderObservatoryIfDue\(env\)/);
  assert.match(hooks,/maintenance\.push\(refreshTraderObservatoryIfDue/);
  assert.equal(OBSERVATORY_CACHE_KEY,'trader-observatory:7d:v2');
  assert.doesNotMatch(source,/trader-observatory:7d:v1/);
  assert.match(source,/winRateUsedForRank:\s*false/);
  assert.match(source,/minimumMatchedSells:\s*MIN_MATCHED_SELLS/);
});
