import test from 'node:test';
import assert from 'node:assert/strict';
import { afterbellWindow, normalizeAfterbellEvents, rankAfterbellTraders } from './intelligence-afterbell-traders.mjs';

const A='11111111111111111111111111111111';
const B='22222222222222222222222222222222';

test('Afterbell uses the most recent 4 PM to 9:30 AM New York weekday window',()=>{
  const mondayNoon=Date.parse('2026-09-21T16:00:00Z'); // 12:00 ET
  const window=afterbellWindow(mondayNoon);
  assert.equal(window.from,Math.floor(Date.parse('2026-09-18T20:00:00Z')/1000));
  assert.equal(window.to,Math.floor(Date.parse('2026-09-21T13:30:00Z')/1000));
  assert.equal(window.live,false);
  assert.equal(window.timezone,'America/New_York');
});

test('Afterbell live window begins at 4 PM ET and ends at now until next open',()=>{
  const mondayFive=Date.parse('2026-09-21T21:00:00Z'); // 17:00 ET
  const window=afterbellWindow(mondayFive);
  assert.equal(window.from,Math.floor(Date.parse('2026-09-21T20:00:00Z')/1000));
  assert.equal(window.to,Math.floor(mondayFive/1000));
  assert.equal(window.live,true);
});

test('Afterbell ranks unique transactions and computes only defensible FIFO PnL',()=>{
  const from=200,to=400;
  const rows=[
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'prebuy',side:'buy',amount:10,priceUsd:5,blockTime:100,source:'observed',sourceKind:'observed-fact'},
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'sell-a',side:'sell',amount:4,priceUsd:7,blockTime:220,source:'observed',sourceKind:'observed-fact'},
    {wallet:B,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'buy-b',side:'buy',amount:3,priceUsd:null,blockTime:210,source:'provider',sourceKind:'provider-reported'},
    {wallet:B,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'sell-b',side:'sell',amount:2,priceUsd:9,blockTime:230,source:'provider',sourceKind:'provider-reported'},
    {wallet:B,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'sell-b',side:'sell',amount:2,priceUsd:9,blockTime:230,source:'observed-copy',sourceKind:'observed-fact'},
  ];
  const ranked=rankAfterbellTraders(rows,{from,to,limit:50});
  assert.equal(ranked[0].wallet,B);
  assert.equal(ranked[0].transactionCount,2);
  assert.equal(ranked[0].uniqueAfterCloseTxCount,2);
  assert.equal(ranked[0].realizedPnlUsd,null);
  assert.equal(ranked[0].assetCount,1);
  assert.equal(ranked[0].latestTrades.length,2);
  assert.equal(ranked[0].mostTraded[0].uniqueAfterCloseTxCount,2);
  assert.equal(ranked[0].topTraded[0].mint,ranked[0].mostTraded[0].mint);
  assert.equal(ranked[1].wallet,A);
  assert.equal(ranked[1].transactionCount,1);
  assert.equal(ranked[1].realizedPnlUsd,8);
});

test('Afterbell dedupes duplicate transaction evidence without losing observed provenance',()=>{
  const rows=normalizeAfterbellEvents([
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'same',side:'buy',amount:1,priceUsd:2,blockTime:300,source:'provider',sourceKind:'provider-reported'},
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'same',side:'buy',amount:1,priceUsd:2,blockTime:300,source:'chain',sourceKind:'observed-fact'},
  ]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].sourceKind,'observed-fact');
});


test('Afterbell cross-stock ranking aggregates a trader across tokenized equities without double-counting tx ids',()=>{
  const rows=[
    {wallet:A,mint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',txId:'tx-1',side:'buy',amount:1,priceUsd:10,blockTime:210,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'tx-2',side:'buy',amount:2,priceUsd:20,blockTime:220,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint:'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',txId:'tx-2',side:'buy',amount:2,priceUsd:20,blockTime:220,source:'provider',sourceKind:'provider-reported'},
  ];
  const ranked=rankAfterbellTraders(rows,{from:200,to:400,limit:50});
  assert.equal(ranked[0].wallet,A);
  assert.equal(ranked[0].transactionCount,2);
  assert.equal(ranked[0].assetCount,2);
  assert.deepEqual(new Set(ranked[0].mints),new Set(['Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh','XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB']));
});


test('Afterbell rank ignores PnL, asset breadth, and recency when unique transaction counts tie',()=>{
  const mintA='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',mintB='XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB';
  const rows=[
    {wallet:A,mint:mintA,txId:'a-1',side:'buy',amount:10,priceUsd:1,blockTime:210,source:'chain',sourceKind:'observed-fact'},
    {wallet:A,mint:mintA,txId:'a-2',side:'sell',amount:10,priceUsd:100,blockTime:220,source:'chain',sourceKind:'observed-fact'},
    {wallet:B,mint:mintA,txId:'b-1',side:'buy',amount:1,priceUsd:null,blockTime:390,source:'chain',sourceKind:'observed-fact'},
    {wallet:B,mint:mintB,txId:'b-2',side:'buy',amount:1,priceUsd:null,blockTime:395,source:'chain',sourceKind:'observed-fact'},
  ];
  const ranked=rankAfterbellTraders(rows,{from:200,to:400,limit:50});
  assert.equal(ranked[0].uniqueAfterCloseTxCount,2);
  assert.equal(ranked[1].uniqueAfterCloseTxCount,2);
  assert.deepEqual(ranked.map(row=>row.wallet),[A,B].sort(),'ties must be deterministic by wallet only, not PnL, asset count, or recency');
});

test('Afterbell trader activity exposes bounded holdings, most-traded assets, and at most three latest trades',()=>{
  const mint='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';
  const rows=[
    {wallet:A,mint,txId:'pre',side:'buy',amount:10,priceUsd:1,blockTime:150,source:'chain',sourceKind:'observed-fact'},
    ...[210,220,230,240].map((blockTime,index)=>({wallet:A,mint,txId:`t-${index}`,side:index===3?'sell':'buy',amount:1,priceUsd:2+index,blockTime,source:'chain',sourceKind:'observed-fact'})),
  ];
  const [ranked]=rankAfterbellTraders(rows,{from:200,to:400,limit:50});
  assert.equal(ranked.latestTrades.length,3);
  assert.equal(ranked.mostTraded[0].uniqueAfterCloseTxCount,4);
  assert.equal(ranked.holdings[0].mint,mint);
  assert.ok(ranked.holdings[0].observedNetAmount>0);
  assert.deepEqual(ranked.topHeld,ranked.holdings);
});
