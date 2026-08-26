import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPublicChainQuery, searchRequest } from './universal-search.mjs';

test('classifies a Solana address without over-labeling it', () => {
  const query='11111111111111111111111111111111';
  const result=classifyPublicChainQuery(query);
  assert.equal(result.kind,'solana-address');
  assert.equal(result.destination,'resolve-address');
  assert.match(result.explanation,/wallet, mint, token account, program, or asset/);
});

test('classifies a long base58 transaction signature', () => {
  const query='5'.repeat(72);
  const result=classifyPublicChainQuery(query);
  assert.equal(result.kind,'transaction-signature');
  assert.equal(result.destination,'transaction');
});

test('keeps free text as search text instead of inventing an on-chain label', () => {
  const result=classifyPublicChainQuery('jupiter swap router');
  assert.equal(result.kind,'search-text');
  assert.equal(result.destination,'search');
});

test('search requests are read-only and cannot sign or submit', () => {
  const result=searchRequest('11111111111111111111111111111111');
  assert.equal(result.readOnly,true);
  assert.equal(result.permitsSigning,false);
  assert.equal(result.permitsSubmission,false);
});
