import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOhlc, verificationState } from './intelligence-mesh-runtime.mjs';

test('verification state prefers independently verified evidence', () => {
  assert.equal(verificationState([{ source: 'rpc-a', commitment: 'confirmed', verified: 0 }]), 'confirmed');
  assert.equal(verificationState([{ source: 'rpc-a', commitment: 'finalized', verified: 0 }]), 'finalized');
  assert.equal(verificationState([
    { source: 'rpc-a', commitment: 'confirmed', verified: 1 },
    { source: 'old-faithful', commitment: 'finalized', verified: 0 }
  ]), 'verified');
});

test('buildOhlc creates deterministic candles', () => {
  const rows = [
    { blockTime: 100, price: 2, baseAmount: 3, quoteAmount: 6, wallet: 'a', source: 's1', confidence: 0.9 },
    { blockTime: 110, price: 5, baseAmount: 1, quoteAmount: 5, wallet: 'b', source: 's2', confidence: 0.8 },
    { blockTime: 119, price: 3, baseAmount: 2, quoteAmount: 6, wallet: 'a', source: 's1', confidence: 0.95 }
  ];
  const candles = buildOhlc(rows, 60);
  assert.equal(candles.length, 1);
  assert.deepEqual({ open: candles[0].open, high: candles[0].high, low: candles[0].low, close: candles[0].close }, { open: 2, high: 5, low: 2, close: 3 });
  assert.equal(candles[0].walletCount, 2);
  assert.equal(candles[0].swapCount, 3);
  assert.equal(candles[0].confidence, 0.8);
});
