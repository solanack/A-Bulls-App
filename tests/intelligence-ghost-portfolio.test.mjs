import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/intelligence-ghost-portfolio.js', import.meta.url), 'utf8');
const window = { BBRIntelligenceHistory: { observedEvents: () => [] } };
vm.runInNewContext(source, { window, globalThis: window, console, document: {} }, { filename: 'intelligence-ghost-portfolio.js' });
const ghost = window.BBRGhostPortfolio;
assert.ok(ghost, 'Ghost Portfolio should export');

const rows = [
  { type: 'buy', mint: 'M1', tokenDelta: 10, priceUsd: 2, blockTime: 100 },
  { type: 'sell', mint: 'M1', tokenDelta: -4, priceUsd: 4, blockTime: 200 },
  { type: 'swap', mint: 'M1', tokenDelta: 0, priceUsd: 5, blockTime: 300 },
  { type: 'transfer received', mint: 'M2', tokenDelta: 100, priceUsd: 50, blockTime: 100 },
  { eventClass: 'swap-like', mint: 'M3', tokenDelta: 2, priceUsd: 3, blockTime: 120 }
];

const model = ghost.derive(rows);
assert.equal(model.positions.length, 2, 'transfers must not become ghost purchases');
const m1 = model.positions.find(item => item.mint === 'M1');
assert.equal(m1.bought, 10);
assert.equal(m1.sold, 4);
assert.equal(m1.ghostQuantity, 10);
assert.equal(m1.observedNetSwapQuantity, 6);
assert.equal(m1.latestObservedPriceUsd, 5);
assert.equal(m1.ghostValueAtLastObservedPrice, 50);
assert.equal(m1.observedNetSwapValueAtLastObservedPrice, 30);
assert.equal(m1.differenceAtLastObservedPrice, 20);
assert.equal(model.coverage, 'priced-observed-history');

const unpriced = ghost.derive([{ type: 'buy', mint: 'X', tokenDelta: 3, blockTime: 1 }]);
assert.equal(unpriced.pricedPositions, 0);
assert.equal(unpriced.coverage, 'index-required');

console.log('Ghost Portfolio tests passed.');
