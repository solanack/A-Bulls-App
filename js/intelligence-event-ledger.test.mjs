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

test('preserves indexed event inspector context and direct execution evidence',()=>{
  const rows=buildLedgerRows([{
    id:'swap-1',signature:'sig-1',timestamp:3000,slot:44,wallet:walletA,token:'T'.repeat(32),side:'buy',tokenDelta:12.5,solDelta:-1.2,
    price:0.1,feeLamports:5000,counterparty:'C'.repeat(32),programId:'P'.repeat(32),confidence:.91,verification:'verified',sources:['rpc','archive'],
    execution:{baseAmount:12.5,quoteAmount:1.25,venue:'Jupiter',pool:'Q'.repeat(32)}
  }],{wallets:[walletA]});
  const row=rows[0];
  assert.equal(row.slot,44);
  assert.equal(row.programId,'P'.repeat(32));
  assert.equal(row.counterparty,'C'.repeat(32));
  assert.equal(row.feeLamports,5000);
  assert.equal(row.confidence,.91);
  assert.equal(row.execution.venue,'Jupiter');
  assert.equal(row.execution.baseAmount,12.5);
  assert.deepEqual(row.sources,['rpc','archive']);
});

test('limits ledger rows and preserves non-trade events',()=>{
  const rows=buildLedgerRows([
    {id:'1',timestamp:1,wallet:walletA,kind:'transfer-in',amount:2},
    {id:'2',timestamp:2,wallet:walletA,kind:'event',amount:0}
  ],{wallets:[walletA],limit:1});
  assert.equal(rows.length,1);
  assert.equal(rows[0].side,'transfer-in');
});
