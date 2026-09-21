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


test('token system normalizes EVM wallets without inventing SOL values',()=>{
  const wallet='0x1111111111111111111111111111111111111111';
  const holders=normalizeHolderRows([{wallet,net_token:25,trade_count:4,buy_usd:120,sell_usd:40,priced_count:4,last_seen:1700000100,source:'chain-events',source_kind:'observed-fact'}],50,{chainKey:'base'});
  assert.equal(holders.length,1);
  assert.equal(holders[0].wallet,wallet);
  assert.equal(holders[0].chainKey,'base');
  assert.equal(holders[0].buySolObserved,null);
  assert.equal(holders[0].sellSolObserved,null);
  assert.equal(holders[0].buyValueUsd,120);
  assert.equal(holders[0].sourceKind,'observed-fact');
});

test('token system keeps missing EVM valuation unavailable rather than zero',()=>{
  const wallet='0x2222222222222222222222222222222222222222';
  const holders=normalizeHolderRows([{wallet,net_token:10,trade_count:1,buy_usd:0,sell_usd:0,priced_count:0,last_seen:1700000100,source_kind:'provider-reported'}],50,{chainKey:'ethereum'});
  assert.equal(holders[0].buyValueUsd,null);
  assert.equal(holders[0].sellValueUsd,null);
  assert.equal(holders[0].sourceKind,'provider-reported');
});


test('all current Fomo EVM chains retain wallet stars instead of Solana-only empty coverage',()=>{
  const wallet='0x3333333333333333333333333333333333333333';
  for(const chainKey of ['base','bsc','ethereum','monad','robinhood']){
    const holders=normalizeHolderRows([{wallet,net_token:7,trade_count:2,priced_count:0,last_seen:1700000200,source:'chain-events',source_kind:'provider-reported'}],50,{chainKey});
    assert.equal(holders.length,1,chainKey);
    assert.equal(holders[0].chainKey,chainKey);
    assert.equal(holders[0].wallet,wallet);
    assert.equal(holders[0].buySolObserved,null);
  }
});
