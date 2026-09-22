import test from 'node:test';
import assert from 'node:assert/strict';
import { chainAdapterCapabilities,erc20TopicAddress,matchDexScreenerPairFromReceipt,selectReconciliationCandidate,__chainAdapterContract } from './intelligence-chain-adapters.mjs';

const WALLET='0x1111111111111111111111111111111111111111';
const TOKEN='0x2222222222222222222222222222222222222222';
const POOL='0x3333333333333333333333333333333333333333';
const QUOTE='0x4444444444444444444444444444444444444444';

test('adapter capabilities keep discovery separate from verification and prefer configured RPC',()=>{
  const cap=chainAdapterCapabilities({BASE_RPC_URL:'https://private.example',GOLDRUSH_API_KEY:'x',GOLDRUSH_WALLET_STREAM_ENABLED:'true'},'base',TOKEN);
  assert.equal(cap.chain,'base');
  assert.equal(cap.kind,'evm');
  assert.equal(cap.history,'goldrush+rpc-verification');
  assert.equal(cap.rpcConfigured,true);
  assert.equal(cap.stream,'goldrush-wallet-stream');
  assert.equal(cap.readOnly,true);
});

test('ERC20 indexed topic pads a canonical wallet address',()=>{
  assert.equal(erc20TopicAddress(WALLET),'0x'+WALLET.slice(2).padStart(64,'0'));
});

test('reconciliation picks a unique side-consistent transaction near provider time',()=>{
  const selected=selectReconciliationCandidate([
    {txId:'0x'+'a'.repeat(64),blockTime:995,side:'buy',receiptSuccess:true},
    {txId:'0x'+'b'.repeat(64),blockTime:500,side:'buy',receiptSuccess:true},
    {txId:'0x'+'c'.repeat(64),blockTime:999,side:'sell',receiptSuccess:true},
  ],{at:1000,side:'entry',maxWindowSeconds:900});
  assert.equal(selected.txId,'0x'+'a'.repeat(64));
  assert.equal(selected.side,'buy');
  assert.ok(selected.confidence>=.88);
});

test('reconciliation refuses an ambiguous near-tie instead of guessing',()=>{
  const selected=selectReconciliationCandidate([
    {txId:'0x'+'a'.repeat(64),blockTime:999,side:'buy',receiptSuccess:true},
    {txId:'0x'+'b'.repeat(64),blockTime:1001,side:'buy',receiptSuccess:true},
  ],{at:1000,side:'entry',maxWindowSeconds:900});
  assert.equal(selected,null);
});

test('receipt log addresses can resolve the exact DEX pool without choosing a different liquid pool',()=>{
  const receipt={logs:[{address:POOL}]},pairs=[
    {chainId:'base',pairAddress:'0x5555555555555555555555555555555555555555',dexId:'other',baseToken:{address:TOKEN},quoteToken:{address:QUOTE},liquidity:{usd:999999}},
    {chainId:'base',pairAddress:POOL,dexId:'uniswap',baseToken:{address:TOKEN},quoteToken:{address:QUOTE},liquidity:{usd:1000}},
  ];
  const match=matchDexScreenerPairFromReceipt('base',TOKEN,receipt,pairs);
  assert.equal(match.poolAddress,POOL);
  assert.equal(match.dexId,'uniswap');
  assert.equal(match.quoteAssetAddress,QUOTE);
});

test('chain adapter contract remains read-only',()=>{
  assert.equal(__chainAdapterContract.readOnly,true);
  assert.equal(__chainAdapterContract.noExecution,true);
});
