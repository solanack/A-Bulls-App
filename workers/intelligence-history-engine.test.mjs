import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeRpcWalletTx, resolveHistoryRpc } from './intelligence-history-engine.mjs';

test('history engine prefers explicit neutral RPC then Helius standard RPC', () => {
  assert.equal(resolveHistoryRpc({ INTELLIGENCE_RPC_URL:'https://rpc.example' }).name, 'configured-rpc');
  assert.equal(resolveHistoryRpc({ HELIUS_API_KEY:'abc' }).name, 'helius-standard-rpc');
  assert.equal(resolveHistoryRpc({}).name, 'solana-public-rpc');
});

test('history decoder recognizes observed token/native-SOL movement without claiming PnL', () => {
  const wallet='11111111111111111111111111111111';
  const tx={
    slot:10, blockTime:100,
    transaction:{signatures:['sig'],message:{accountKeys:[wallet]}},
    meta:{fee:5000,err:null,preBalances:[2_000_000_000],postBalances:[1_900_000_000],
      preTokenBalances:[{accountIndex:1,mint:'MintA',owner:wallet,uiTokenAmount:{uiAmountString:'1'}}],
      postTokenBalances:[{accountIndex:1,mint:'MintA',owner:wallet,uiTokenAmount:{uiAmountString:'3'}}]}
  };
  const rows=decodeRpcWalletTx({signature:'sig',slot:10,blockTime:100},tx,wallet,'test-rpc');
  assert.equal(rows.length,1);
  assert.equal(rows[0].tokenDelta,2);
  assert.equal(rows[0].solDelta,-0.1);
  assert.equal(rows[0].eventClass,'swap-like');
  assert.equal(rows[0].source,'test-rpc');
  assert.equal(Object.hasOwn(rows[0],'pnl'),false);
  assert.equal(Object.hasOwn(rows[0],'price'),false);
});
