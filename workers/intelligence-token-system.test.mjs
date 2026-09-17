import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAfterbellTraderRows, normalizeHolderRows, resolveAfterbellWindow } from './intelligence-token-system.mjs';

const A='11111111111111111111111111111111';
const B='22222222222222222222222222222222';
const C='33333333333333333333333333333333';

test('token system ranks only positive-net indexed wallets and reports sample share',()=>{
  const holders=normalizeHolderRows([
    {wallet:A,net_token:80,trade_count:4,buy_sol:8,sell_sol:2,last_seen:1700000000,source:'test'},
    {wallet:B,net_token:20,trade_count:2,buy_sol:2,sell_sol:1,last_seen:1700000010,source:'test'},
    {wallet:'bad',net_token:999,trade_count:9,last_seen:1700000020},
  ]);
  assert.equal(holders.length,2);
  assert.equal(holders[0].wallet,A);
  assert.equal(holders[0].observedSharePct,80);
  assert.equal(holders[1].observedSharePct,20);
  assert.equal(holders[0].lastObservedAt,1700000000000);
});

test('token system keeps empty holder evidence empty',()=>{
  assert.deepEqual(normalizeHolderRows([{wallet:A,net_token:0,trade_count:1}]),[]);
});

test('afterbell trader stars rank by transactions then defensible realized pnl',()=>{
  const traders=normalizeAfterbellTraderRows([
    {wallet:A,net_token:0,trade_count:5,buy_count:3,sell_count:2,buy_sol:10,sell_sol:12,first_seen:100,last_seen:500},
    {wallet:B,net_token:4,trade_count:5,buy_count:4,sell_count:1,buy_sol:11,sell_sol:13,first_seen:110,last_seen:510},
    {wallet:C,net_token:7,trade_count:6,buy_count:6,sell_count:0,buy_sol:15,sell_sol:0,first_seen:120,last_seen:520},
  ]);
  assert.deepEqual(traders.map(item=>item.wallet),[C,A,B]);
  assert.equal(traders[1].realizedPnlSol,2);
  assert.equal(traders[1].pnlStatus,'derived-flat-afterbell-window');
  assert.equal(traders[2].realizedPnlSol,null);
  assert.match(traders[2].pnlStatus,/unavailable/);
});

test('afterbell window starts at normal NYSE 4pm ET close',()=>{
  const now=Date.UTC(2026,6,10,21,0,0); // Friday 17:00 New York (EDT)
  const window=resolveAfterbellWindow(now);
  assert.equal(window.to-window.from,60*60);
  assert.equal(window.timeZone,'America/New_York');
  assert.match(window.boundary,/16:00 ET/);
});
