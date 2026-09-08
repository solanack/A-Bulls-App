import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHolderRows } from './intelligence-token-system.mjs';

const A='11111111111111111111111111111111';
const B='22222222222222222222222222222222';

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
