import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLedgerRows } from './intelligence-event-ledger.mjs';

const walletA='A'.repeat(32),walletB='B'.repeat(32);

test('builds ordered evidence rows with wallet labels and sources',()=>{
  const rows=buildLedgerRows([
    {id:'b',timestamp:2000,wallet:walletB,side:'sell',tokenDelta:-5,verification:'finalized',sources:['rpc','archive'],signature:'sig-b'},
    {id:'a',timestamp:1000,wallet:walletA,side:'buy',tokenDelta:10,verification:'confirmed',source:'rpc',signature:'sig-a'}
  ],{wallets:[walletA,walletB]});
  assert.equal(rows.length,2);
  assert.equal(rows[0].id,'a');
  assert.equal(rows[0].walletLabel,'Wallet A');
  assert.equal(rows[0].amount,10);
  assert.deepEqual(rows[0].sources,['rpc']);
  assert.equal(rows[1].walletLabel,'Wallet B');
  assert.equal(rows[1].side,'sell');
});

test('limits ledger rows and preserves non-trade events',()=>{
  const rows=buildLedgerRows([
    {id:'1',timestamp:1,wallet:walletA,kind:'transfer-in',amount:2},
    {id:'2',timestamp:2,wallet:walletA,kind:'event',amount:0}
  ],{wallets:[walletA],limit:1});
  assert.equal(rows.length,1);
  assert.equal(rows[0].side,'transfer-in');
});
