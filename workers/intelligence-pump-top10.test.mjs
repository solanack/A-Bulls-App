import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePumpEvent, shouldPersistDetailedTrade, __pumpTop10Contract } from './intelligence-pump-top10.mjs';

const signature='5'.repeat(88);
const mint='7'.repeat(44);
const wallet='8'.repeat(44);

test('normalizes a bounded verified Pump trade without inventing intent',()=>{
  const event=normalizePumpEvent({signature,mint,wallet,side:'buy',tokenAmount:2500,solAmount:2.5,slot:123,blockTime:1_800_000_000,programId:__pumpTop10Contract.defaultPrograms[1],commitment:'confirmed'});
  assert.equal(event.eventId,`${signature}:0`);
  assert.equal(event.mint,mint);
  assert.equal(event.wallet,wallet);
  assert.equal(event.side,'buy');
  assert.equal(event.priceSol,0.001);
  assert.equal(event.commitment,'confirmed');
  assert.equal(Object.hasOwn(event,'profit'),false);
  assert.equal(Object.hasOwn(event,'intent'),false);
});

test('derives buy direction from enhanced webhook transfers conservatively',()=>{
  const event=normalizePumpEvent({
    signature,blockTime:1_800_000_000,
    tokenTransfers:[{mint,tokenAmount:10,toUserAccount:wallet,fromUserAccount:'9'.repeat(44)}],
    nativeTransfers:[{amount:1_000_000_000,fromUserAccount:wallet,toUserAccount:'A'.repeat(44)}]
  });
  assert.equal(event.side,'buy');
  assert.equal(event.wallet,wallet);
  assert.equal(event.solAmount,1);
});

test('rejects malformed evidence identifiers',()=>{
  assert.throws(()=>normalizePumpEvent({signature:'bad',mint,blockTime:1}),/invalid_pump_event/);
  assert.throws(()=>normalizePumpEvent({signature,mint:'bad',blockTime:1}),/invalid_pump_event/);
  assert.throws(()=>normalizePumpEvent({signature,mint,blockTime:0}),/invalid_pump_event/);
});



test('cold-start persists detailed trades when active set is empty',()=>{
  assert.equal(shouldPersistDetailedTrade(new Set(),mint),true);
});

test('after active set exists, only active mints get detailed trades',()=>{
  const active=new Set([mint]);
  assert.equal(shouldPersistDetailedTrade(active,mint),true);
  assert.equal(shouldPersistDetailedTrade(active,'9'.repeat(44)),false);
});
