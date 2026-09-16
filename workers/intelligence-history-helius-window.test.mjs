import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeliusWindowConfig, heliusWindowCursor, decodeRpcWalletTx } from './intelligence-history-engine.mjs';

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
  assert.equal(rows[0].source,'helius-getTransactionsForAddress');
});
