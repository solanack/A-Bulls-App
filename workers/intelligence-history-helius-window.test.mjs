import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeliusWindowConfig, heliusWindowCursor, decodeRpcWalletTx, historyRpcRequest, historyRpcTimeoutMs } from './intelligence-history-engine.mjs';

const wallet='11111111111111111111111111111111';
const mint='33333333333333333333333333333333';

test('builds a bounded chronological Helius archival request for a Replay window',()=>{
  const config=buildHeliusWindowConfig({from:200,to:100,paginationToken:'123:4',limit:500});
  assert.equal(config.transactionDetails,'full');
  assert.equal(config.encoding,'jsonParsed');
  assert.equal(config.maxSupportedTransactionVersion,0);
  assert.equal(config.sortOrder,'asc');
  assert.equal(config.limit,100);
  assert.deepEqual(config.filters.blockTime,{gte:100,lte:200});
  assert.equal(config.filters.status,'succeeded');
  assert.equal(config.filters.tokenAccounts,'balanceChanged');
  assert.equal(config.paginationToken,'123:4');
});

test('Helius pagination tokens are namespaced away from standard signature cursors',()=>{
  assert.equal(heliusWindowCursor('gtfa:123:4'),'123:4');
  assert.equal(heliusWindowCursor('5abcSignature'),'');
  assert.equal(heliusWindowCursor(''),'');
});

test('history RPC timeout is configurable but remains bounded',()=>{
  assert.equal(historyRpcTimeoutMs({INTELLIGENCE_HISTORY_RPC_TIMEOUT_MS:'5000'}),5000);
  assert.equal(historyRpcTimeoutMs({INTELLIGENCE_HISTORY_RPC_TIMEOUT_MS:'10'}),1000);
  assert.equal(historyRpcTimeoutMs({INTELLIGENCE_HISTORY_RPC_TIMEOUT_MS:'99999'}),15000);
  assert.equal(historyRpcTimeoutMs({},{}),5000);
});

test('stalled history RPC calls abort with source-labeled timeout evidence',async()=>{
  const source={name:'test-rpc',kind:'rpc',url:'https://rpc.invalid'};
  const fetchImpl=async(_url,init={})=>new Promise((resolve,reject)=>{
    assert.ok(init.signal);
    const abort=()=>{const error=new Error('aborted');error.name='AbortError';reject(error)};
    if(init.signal.aborted)return abort();
    init.signal.addEventListener('abort',abort,{once:true});
  });
  await assert.rejects(
    historyRpcRequest(source,'getSignaturesForAddress',[wallet,{}],{fetchImpl,timeoutMs:1000}),
    /test-rpc:getSignaturesForAddress:timeout_1000/
  );
});

test('full Helius archival transactions decode through the existing evidence decoder',()=>{
  const tx={
    slot:42,
    blockTime:150,
    transaction:{signatures:['sig-1'],message:{accountKeys:[wallet,'22222222222222222222222222222222']}},
    meta:{
      err:null,
      fee:5000,
      preBalances:[1_000_000_000,0],
      postBalances:[900_000_000,0],
      preTokenBalances:[{accountIndex:1,mint,owner:wallet,uiTokenAmount:{uiAmountString:'1'}}],
      postTokenBalances:[{accountIndex:1,mint,owner:wallet,uiTokenAmount:{uiAmountString:'3'}}]
    }
  };
  const rows=decodeRpcWalletTx({signature:'sig-1',slot:42,blockTime:150},tx,wallet,'helius-getTransactionsForAddress');
  assert.equal(rows.length,1);
  assert.equal(rows[0].signature,'sig-1');
  assert.equal(rows[0].mint,mint);
  assert.equal(rows[0].tokenDelta,2);
  assert.equal(rows[0].eventClass,'swap-like');
  assert.equal(rows[0].source,'helius-getTransactionsForAddress');
});

test('classifies a token sale for native SOL as swap-like after removing the fee component',()=>{
  const tx={
    slot:43,
    blockTime:160,
    transaction:{signatures:['sig-2'],message:{accountKeys:[wallet,'22222222222222222222222222222222']}},
    meta:{
      err:null,
      fee:5000,
      preBalances:[1_000_000_000,0],
      postBalances:[1_249_995_000,0],
      preTokenBalances:[{accountIndex:1,mint,owner:wallet,uiTokenAmount:{uiAmountString:'5'}}],
      postTokenBalances:[{accountIndex:1,mint,owner:wallet,uiTokenAmount:{uiAmountString:'2'}}]
    }
  };
  const rows=decodeRpcWalletTx({signature:'sig-2',slot:43,blockTime:160},tx,wallet,'helius-getTransactionsForAddress');
  assert.equal(rows.length,1);
  assert.equal(rows[0].tokenDelta,-3);
  assert.equal(rows[0].eventClass,'swap-like');
});

test('does not treat a token transfer plus only a transaction fee as a swap',()=>{
  const tx={
    slot:44,
    blockTime:170,
    transaction:{signatures:['sig-3'],message:{accountKeys:[wallet,'22222222222222222222222222222222']}},
    meta:{
      err:null,
      fee:5000,
      preBalances:[1_000_000_000,0],
      postBalances:[999_995_000,0],
      preTokenBalances:[{accountIndex:1,mint,owner:wallet,uiTokenAmount:{uiAmountString:'1'}}],
      postTokenBalances:[{accountIndex:1,mint,owner:wallet,uiTokenAmount:{uiAmountString:'2'}}]
    }
  };
  const rows=decodeRpcWalletTx({signature:'sig-3',slot:44,blockTime:170},tx,wallet,'helius-getTransactionsForAddress');
  assert.equal(rows.length,1);
  assert.equal(rows[0].eventClass,'transfer');
});