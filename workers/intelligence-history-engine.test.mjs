import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeRpcWalletTx, historyRepairSource, isValidHistorySolanaPublicKey, resolveHistoryRpc } from './intelligence-history-engine.mjs';

test('history engine prefers configured or Helius RPC and does not silently depend on the public archival endpoint', () => {
  assert.equal(resolveHistoryRpc({ INTELLIGENCE_RPC_URL:'https://rpc.example' }).name, 'configured-rpc');
  assert.equal(resolveHistoryRpc({ HELIUS_API_KEY:'abc' }).name, 'helius-standard-rpc');
  assert.equal(resolveHistoryRpc({}).name, 'history-rpc-unavailable');
  assert.equal(resolveHistoryRpc({ INTELLIGENCE_ALLOW_PUBLIC_RPC_FALLBACK:'true' }).name, 'solana-public-rpc');
});

test('failed Helius history repairs through the public read-only Solana RPC', () => {
  assert.deepEqual(historyRepairSource({name:'helius-standard-rpc',kind:'rpc',url:'https://mainnet.helius-rpc.com/?api-key=x'}), {
    name:'solana-public-rpc',kind:'rpc',url:'https://solana-rpc.publicnode.com'
  });
  assert.equal(historyRepairSource({name:'configured-rpc',kind:'rpc',url:'https://rpc.example'}),null);
});

test('history provider boundary requires an actual 32-byte Solana public key', () => {
  assert.equal(isValidHistorySolanaPublicKey('11111111111111111111111111111111'),true);
  assert.equal(isValidHistorySolanaPublicKey('11111111111111111111111111111111111111111111'),false);
  assert.equal(isValidHistorySolanaPublicKey('not-a-wallet'),false);
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
