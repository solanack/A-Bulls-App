import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/intelligence-core.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'intelligence-core.js' });
const core = window.BBRIntelligenceCore;
assert.ok(core, 'Bull Intelligence Core should be exported');

const raw = [
  { signature: 'a', blockTime: 100, wallet: 'W', mint: 'M1', type: 'buy', tokenDelta: 10, solDelta: -1, feeLamports: 5000, priceUsd: 2 },
  { signature: 'b', blockTime: 200, wallet: 'W', mint: 'M1', type: 'swap', tokenDelta: 0, priceUsd: 3 },
  { signature: 'c', blockTime: 300, wallet: 'W', mint: 'M1', type: 'sell', tokenDelta: -4, solDelta: .8, feeLamports: 5000, priceUsd: 4 },
  { signature: 'd', blockTime: 400, wallet: 'W', mint: 'M2', description: 'token transfer received', tokenDelta: 5, priceUsd: 1 }
];

const events = core.normalizeEvents(raw, 'W');
assert.equal(events.length, 4);
assert.equal(events[0].eventClass, 'swap-like');
assert.equal(events[3].eventClass, 'transfer');
assert.equal(events[0].feeLamports, 5000);

const slice = core.reconstructAt(raw, 350);
assert.equal(slice.eventCount, 3);
assert.equal(slice.positions.length, 1);
assert.equal(slice.positions[0].mint, 'M1');
assert.equal(slice.positions[0].quantityDelta, 6);
assert.equal(slice.feesLamports, 10000);
assert.equal(slice.coverage.complete, false);

const sim = core.simulateFixedHold(raw, { holdSeconds: 100 });
assert.equal(sim.buyLegs, 1);
assert.equal(sim.pricedLegs, 1);
assert.equal(sim.missingExitPrice, 0);
const m1 = sim.legs.find(leg => leg.mint === 'M1');
assert.equal(m1.entryPriceUsd, 2);
assert.equal(m1.exitPriceUsd, 3);
assert.equal(m1.pnlUsd, 10);
assert.equal(sim.coverage.complete, true);
assert.equal(sim.legs.some(leg => leg.mint === 'M2'), false, 'Transfers must not be treated as buys');

const radar = core.scoreRadar(
  { uniqueWallets: 40, inboundWallets: 30, outboundWallets: 8, longDurationWallets: 12, newWallets: 20 },
  { uniqueWallets: 20, inboundWallets: 10, outboundWallets: 8, longDurationWallets: 6, newWallets: 5 }
);
assert.ok(radar.severity >= 0 && radar.severity <= 100);
assert.equal(radar.sampleSize, 40);
assert.match(radar.interpretation, /not a price prediction/i);

assert.equal(core.scoreWeather({ activity: 85, volatility: 80 }).regime, 'storm');
assert.equal(core.scoreWeather({ activity: 70, rotation: 80, volatility: 40 }).regime, 'migration');
assert.equal(core.scoreWeather({ activity: 20, volatility: 20 }).regime, 'calm');
assert.match(core.scoreWeather({}).interpretation, /not a market forecast/i);

console.log('Intelligence Core tests passed.');
