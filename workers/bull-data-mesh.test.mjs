import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeRpcTransactionForWallet,
  listAddressSignatures,
  meshEnabled,
  resolveRpcSource
} from './bull-data-mesh.mjs';

const WALLET = '11111111111111111111111111111111';

test('mesh flag is explicit and default-off', () => {
  assert.equal(meshEnabled({}), false);
  assert.equal(meshEnabled({ BULL_MESH_ENABLED: 'true' }), true);
  assert.equal(meshEnabled({ BULL_MESH_ENABLED: 'TRUE' }), true);
});

test('source selection prefers configured RPC then standard Helius RPC', () => {
  assert.equal(resolveRpcSource({ BULL_RPC_URL: 'https://rpc.example' }).name, 'configured-rpc');
  const helius = resolveRpcSource({ HELIUS_API_KEY: 'abc' });
  assert.equal(helius.name, 'helius-standard-rpc');
  assert.match(helius.url, /api-key=abc/);
  assert.equal(resolveRpcSource({}).name, 'solana-public-rpc');
});

test('getSignaturesForAddress is bounded and uses confirmed commitment', async () => {
  let body;
  const fetchImpl = async (_url, init) => {
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: [{ signature: 'sig1', slot: 9 }] }) };
  };
  const result = await listAddressSignatures({ BULL_RPC_URL: 'https://rpc.example' }, WALLET, { limit: 999, fetchImpl });
  assert.equal(body.method, 'getSignaturesForAddress');
  assert.equal(body.params[1].limit, 50);
  assert.equal(body.params[1].commitment, 'confirmed');
  assert.equal(result.rows.length, 1);
});

test('RPC decoder derives SOL and SPL balance deltas without identity inference', () => {
  const tx = {
    slot: 123,
    blockTime: 456,
    transaction: { message: { accountKeys: [WALLET] }, signatures: ['sig'] },
    meta: {
      err: null,
      fee: 5000,
      preBalances: [2_000_000_000],
      postBalances: [1_500_000_000],
      preTokenBalances: [{ accountIndex: 1, mint: 'MintA', owner: WALLET, uiTokenAmount: { uiAmountString: '2' } }],
      postTokenBalances: [{ accountIndex: 1, mint: 'MintA', owner: WALLET, uiTokenAmount: { uiAmountString: '5' } }]
    }
  };
  const rows = decodeRpcTransactionForWallet({ signature: 'sig', slot: 123 }, tx, WALLET, 'test-rpc');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].solDelta, -0.5);
  assert.equal(rows[0].tokenDelta, 3);
  assert.equal(rows[0].source, 'test-rpc');
  assert.equal(rows[0].counterparty, undefined);
});
