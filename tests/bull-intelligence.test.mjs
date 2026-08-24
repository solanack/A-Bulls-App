import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/bull-intelligence.js', import.meta.url), 'utf8');
const window = {};
const context = { window, document: {}, console };
vm.runInNewContext(source, context, { filename: 'bull-intelligence.js' });

assert.ok(window.BBRBullIntelligence, 'Bull Intelligence API should be exported');

const bundle = {
  address: '11111111111111111111111111111111',
  range: '90d',
  overview: {
    totalUsdValue: 12000,
    topHoldingPercent: 58,
    holdings: [
      { mint: 'MintA', symbol: 'ALPHA', usdValue: 7000 },
      { mint: 'MintB', symbol: 'BETA', usdValue: 3000 }
    ]
  },
  activity: {
    signaturesAnalyzed: 120,
    successCount: 118,
    failedCount: 2,
    feesSol: 0.02,
    historyComplete: false,
    trading: { swapCount: 20, activeDays: 30, uniqueMints: 9, busiestWeekday: 'Monday', busiestHour: 14 },
    flow: { transferInCount: 12, transferOutCount: 8 },
    topFlows: [{ mint: 'MintA', symbol: 'ALPHA', net: 125 }],
    recent: [
      { blockTime: 1700000000, signature: 'a' },
      { blockTime: 1710000000, signature: 'b' }
    ]
  }
};

const dna = window.BBRBullIntelligence.deriveDNA(bundle);
assert.equal(dna.dimensions.length, 6);
for (const dimension of dna.dimensions) {
  assert.ok(Number.isInteger(dimension.score), `${dimension.key} score should be an integer`);
  assert.ok(dimension.score >= 0 && dimension.score <= 100, `${dimension.key} must be clamped to 0..100`);
  assert.ok(dimension.why.length > 0, `${dimension.key} must remain explainable`);
}
assert.ok(dna.archetype?.name?.startsWith('THE '));

const museum = window.BBRBullIntelligence.deriveMuseum(bundle);
assert.equal(museum.length, 6);
assert.equal(museum[0].title, 'CROWN JEWEL');
assert.match(museum[0].value, /ALPHA/);
assert.match(museum[3].detail, /not necessarily/i, 'visible relic must not pretend to be the wallet first transaction');

const empty = window.BBRBullIntelligence.deriveDNA({ overview: {}, activity: {} });
for (const dimension of empty.dimensions) {
  assert.ok(dimension.score >= 0 && dimension.score <= 100);
}

console.log('Bull Intelligence derivation tests passed.');
