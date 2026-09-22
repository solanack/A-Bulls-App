import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateTransactionId,fomoPositionToChainAsset,fomoTradeToChainEvent,fomoTradeToChainEvents,verifyEvmTransaction,__multichainEvidenceContract } from './intelligence-multichain-evidence.mjs';

const TOKEN='0x1111111111111111111111111111111111111111';
const WALLET='0x2222222222222222222222222222222222222222';
const TO='0x3333333333333333333333333333333333333333';
const HASH=`0x${'a'.repeat(64)}`;

test('provider Fomo positions become chain-qualified assets without identity collapse',()=>{
  const base=fomoPositionToChainAsset({handle:'Trader',token_address:TOKEN.toUpperCase().replace('0X','0x'),symbol:'BULL',name:'Bull',chain:'Base',captured_at:100});
  const bsc=fomoPositionToChainAsset({handle:'Trader',token_address:TOKEN,symbol:'BULL',chain:'BNB Chain',captured_at:100});
  assert.equal(base.assetId,`base:${TOKEN}`);assert.equal(bsc.assetId,`bsc:${TOKEN}`);assert.notEqual(base.assetId,bsc.assetId);
});

test('Fomo trade lifecycle preserves provider-reported entry and exit independently',()=>{
  const events=fomoTradeToChainEvents({handle:'Trader',trade_id:HASH,token_address:TOKEN,chain:'base',status:'closed',amount:'4',avg_entry_price:'1',avg_exit_price:'2',realized_pnl_usd:'4',created_at:100,closed_at:200,evm_wallet:WALLET});
  assert.equal(events.length,2);
  assert.equal(events[0].eventClass,'fomo-position-entry');assert.equal(events[0].side,'entry');assert.equal(events[0].blockTime,100);assert.equal(events[0].priceUsd,1);assert.equal(events[0].txId,null);assert.equal(events[0].evidence.phase,'entry');
  assert.equal(events[1].chain,'base');assert.equal(events[1].txId,HASH);assert.equal(events[1].eventClass,'fomo-position-exit');assert.equal(events[1].side,'exit');assert.equal(events[1].sourceKind,'provider-reported');assert.equal(events[1].priceUsd,2);assert.equal(events[1].evidence.reportedRealizedPnlUsd,4);assert.equal(events[1].evidence.phase,'exit');
  assert.equal(fomoTradeToChainEvent({handle:'Trader',trade_id:HASH,token_address:TOKEN,chain:'base',status:'closed',amount:'4',created_at:100,closed_at:200,evm_wallet:WALLET}).eventClass,'fomo-position-exit');
  assert.equal(candidateTransactionId('base','trade-123'),null);
});

test('RPC verification creates a separate observed receipt fact without claiming swap interpretation',async()=>{
  const event=fomoTradeToChainEvent({handle:'Trader',trade_id:HASH,token_address:TOKEN,chain:'base',created_at:100,evm_wallet:WALLET});
  const fetchImpl=async(_url,init)=>{const body=JSON.parse(init.body);if(body.method==='eth_getTransactionByHash')return Response.json({jsonrpc:'2.0',id:1,result:{hash:HASH,from:WALLET,to:TO,blockNumber:'0x10'}});if(body.method==='eth_getTransactionReceipt')return Response.json({jsonrpc:'2.0',id:1,result:{transactionHash:HASH,blockNumber:'0x10',status:'0x1',gasUsed:'0x5208',logs:[{}]}});throw new Error('unexpected');};
  const receipt=await verifyEvmTransaction({BASE_RPC_URL:'https://rpc.example'},event,{fetchImpl});
  assert.equal(receipt.sourceKind,'observed-fact');assert.equal(receipt.blockHeight,16);assert.equal(receipt.evidence.success,true);assert.equal(receipt.evidence.tradeInterpretationVerified,false);assert.equal(receipt.eventClass,'transaction-receipt');
});

test('contract keeps public reads provider-free and execution disabled',()=>{assert.equal(__multichainEvidenceContract.readOnly,true);assert.equal(__multichainEvidenceContract.pageReadsProviderFree,true);assert.equal(__multichainEvidenceContract.providerLifecyclePreservesEntryAndExit,true);assert.equal(__multichainEvidenceContract.providerReportedTradeFactsStayProviderReported,true);assert.equal(__multichainEvidenceContract.independentTransactionReconciliation,true);assert.equal(__multichainEvidenceContract.exactPoolResolutionFromReceipt,true);});


test('closed provider lifecycle uses phase-specific transaction references when supplied',()=>{
  const entry=`0x${'b'.repeat(64)}`,exit=`0x${'c'.repeat(64)}`,events=fomoTradeToChainEvents({handle:'Trader',trade_id:'provider-id',token_address:TOKEN,chain:'base',status:'closed',created_at:100,closed_at:200,entry_tx_id:entry,exit_tx_id:exit,evm_wallet:WALLET});
  assert.equal(events[0].txId,entry);
  assert.equal(events[1].txId,exit);
});
