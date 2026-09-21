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
    {wallet:A,txId:'prebuy',side:'buy',amount:10,priceUsd:5,blockTime:100,source:'observed',sourceKind:'observed-fact'},
    {wallet:A,txId:'sell-a',side:'sell',amount:4,priceUsd:7,blockTime:220,source:'observed',sourceKind:'observed-fact'},
    {wallet:B,txId:'buy-b',side:'buy',amount:3,priceUsd:null,blockTime:210,source:'provider',sourceKind:'provider-reported'},
    {wallet:B,txId:'sell-b',side:'sell',amount:2,priceUsd:9,blockTime:230,source:'provider',sourceKind:'provider-reported'},
    {wallet:B,txId:'sell-b',side:'sell',amount:2,priceUsd:9,blockTime:230,source:'observed-copy',sourceKind:'observed-fact'},
  ];
  const ranked=rankAfterbellTraders(rows,{from,to,limit:50});
  assert.equal(ranked[0].wallet,B);
  assert.equal(ranked[0].transactionCount,2);
  assert.equal(ranked[0].realizedPnlUsd,null);
  assert.equal(ranked[1].wallet,A);
  assert.equal(ranked[1].transactionCount,1);
  assert.equal(ranked[1].realizedPnlUsd,8);
});

test('Afterbell dedupes duplicate transaction evidence without losing observed provenance',()=>{
  const rows=normalizeAfterbellEvents([
    {wallet:A,txId:'same',side:'buy',amount:1,priceUsd:2,blockTime:300,source:'provider',sourceKind:'provider-reported'},
    {wallet:A,txId:'same',side:'buy',amount:1,priceUsd:2,blockTime:300,source:'chain',sourceKind:'observed-fact'},
  ]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].sourceKind,'observed-fact');
});
