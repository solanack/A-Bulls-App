import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const coreSource = fs.readFileSync(new URL('../js/intelligence-core.js', import.meta.url), 'utf8');
const historySource = fs.readFileSync(new URL('../js/intelligence-time-machine.js', import.meta.url), 'utf8');

const window = { addEventListener() {} };
const document = {
  getElementById: () => null,
  createElement: tag => ({ tagName: tag, style: { setProperty() {} }, append() {}, replaceChildren() {}, setAttribute() {}, addEventListener() {}, className: '', textContent: '' }),
  head: { append() {} }
};
const context = { window, globalThis: window, document, console, Date };
vm.runInNewContext(coreSource, context, { filename: 'intelligence-core.js' });
vm.runInNewContext(historySource, context, { filename: 'intelligence-time-machine.js' });

const api = window.BBRIntelligenceHistory;
assert.ok(api, 'Time Machine API should export');

const state = {
  address: '11111111111111111111111111111111',
  activity: {
    recent: [
      { signature: 'a', blockTime: 100, type: 'transfer', feeSol: 0.000005 },
      { signature: 'b', blockTime: 200, type: 'swap', feeSol: 0.000006 },
      { signature: 'c', blockTime: 300, type: 'swap', feeSol: 0.000007 }
    ]
  }
};
const events = api.observedEvents(state);
assert.equal(events.length, 3);
assert.equal(events[0].wallet, state.address);
assert.equal(events[0].feeLamports, 5000);
assert.deepEqual(api.eventBounds(events), { first: 100, last: 300 });

const slice = api.reconstruct(events, 220);
assert.equal(slice.eventCount, 2);
assert.equal(slice.feesLamports, 11000);
assert.equal(slice.coverage.complete, false);

const emptySim = api.simulate(events, 86400);
assert.equal(emptySim.buyLegs, 0);
assert.equal(emptySim.pricedLegs, 0);

const pricedState = {
  address: state.address,
  activity: {
    normalizedEvents: [
      { signature: 'x', blockTime: 100, type: 'buy', mint: 'M', tokenDelta: 10, priceUsd: 2 },
      { signature: 'y', blockTime: 200, type: 'swap', mint: 'M', tokenDelta: 0, priceUsd: 3 }
    ]
  }
};
const sim = api.simulate(api.observedEvents(pricedState), 100);
assert.equal(sim.buyLegs, 1);
assert.equal(sim.pricedLegs, 1);
assert.equal(sim.simulatedPnlUsd, 10);

console.log('Intelligence Time Machine tests passed.');
