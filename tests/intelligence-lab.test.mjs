import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/intelligence-lab.js', import.meta.url), 'utf8');
const window = {};
const document = { getElementById: () => null, createElement: () => ({ style: { setProperty() {} }, append() {}, className: '', textContent: '' }), head: { append() {} } };
const context = { window, document, console, setInterval, clearInterval };
vm.runInNewContext(source, context, { filename: 'intelligence-lab.js' });

assert.ok(window.BBRIntelligenceLab, 'Intelligence Lab API should be exported');

const state = {
  address: '11111111111111111111111111111111',
  overview: { holdings: [{ mint: 'MintA', symbol: 'ALPHA', usdValue: 100 }] },
  activity: {
    signaturesAnalyzed: 10,
    historyComplete: false,
    recent: [],
    topFlows: [
      { mint: 'MintA', symbol: 'ALPHA', net: -25 },
      { mint: 'MintB', symbol: 'BETA', net: 12 },
      { mint: 'MintC', symbol: 'GAMMA', net: -5 }
    ]
  }
};

const capabilities = window.BBRIntelligenceLab.capabilityMap(state);
const status = id => capabilities.find(item => item.id === id)?.status;
assert.equal(status('dna'), 'ready');
assert.equal(status('ghost-ledger'), 'ready');
assert.equal(status('ghost-portfolio'), 'index-required');
assert.equal(status('radar'), 'index-required');

const ghost = window.BBRIntelligenceLab.ghostLedger(state.activity);
assert.equal(ghost.length, 2);
assert.equal(ghost[0].mint, 'MintA');
assert.equal(ghost[0].ghostQuantity, 25);
assert.ok(ghost.every(item => item.ghostQuantity > 0));
assert.ok(ghost.every(item => item.net < 0));

const graph = window.BBRIntelligenceLab.constellation(state);
const alpha = graph.find(item => item.mint === 'MintA');
const beta = graph.find(item => item.mint === 'MintB');
assert.equal(alpha.relationship, 'holding+flow');
assert.equal(alpha.netFlow, -25);
assert.equal(beta.relationship, 'flow');
assert.equal(beta.netFlow, 12);

const emptyCapabilities = window.BBRIntelligenceLab.capabilityMap({ overview: {}, activity: {} });
assert.equal(emptyCapabilities.find(item => item.id === 'dna')?.status, 'needs-wallet');
assert.equal(emptyCapabilities.find(item => item.id === 'time-machine')?.status, 'index-required');

console.log('Intelligence Lab tests passed.');
