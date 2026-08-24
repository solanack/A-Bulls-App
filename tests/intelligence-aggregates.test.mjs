import assert from 'node:assert/strict';
import {
  scoreRadarAggregate,
  deriveWeatherAggregate,
  aggregateCohortBaseline,
  weatherInputsFromWindows
} from '../workers/intelligence-aggregates.mjs';

const baseline = aggregateCohortBaseline([
  { uniqueWallets: 10, inboundWallets: 5, outboundWallets: 4, longDurationWallets: 2, newWallets: 2 },
  { uniqueWallets: 14, inboundWallets: 7, outboundWallets: 6, longDurationWallets: 4, newWallets: 4 }
]);
assert.equal(baseline.uniqueWallets, 12);
assert.equal(baseline.inboundWallets, 6);

const radar = scoreRadarAggregate(
  { uniqueWallets: 30, inboundWallets: 20, outboundWallets: 5, longDurationWallets: 8, newWallets: 14 },
  baseline
);
assert.ok(radar.severity > 0 && radar.severity <= 100);
assert.ok(['wallet-convergence','inbound-convergence','outbound-distribution','long-duration-shift','fresh-wallet-shift'].includes(radar.anomalyKey));
assert.match(radar.interpretation, /not a price prediction/i);

const weatherInputs = weatherInputsFromWindows(
  [{ txCount: 300, swaps: 210, uniqueMints: 40, nftEvents: 30 }],
  [{ uniqueWallets: 20, inboundWallets: 15, outboundWallets: 5 }]
);
assert.ok(weatherInputs.activity >= 0 && weatherInputs.activity <= 100);
assert.ok(weatherInputs.rotation >= 0 && weatherInputs.rotation <= 100);

assert.equal(deriveWeatherAggregate({ activity: 90, volatility: 85 }).regime, 'storm');
assert.equal(deriveWeatherAggregate({ activity: 70, rotation: 85, volatility: 30 }).regime, 'migration');
assert.equal(deriveWeatherAggregate({ activity: 20, volatility: 20 }).regime, 'calm');
assert.match(deriveWeatherAggregate({}).interpretation, /not a market forecast/i);

console.log('Intelligence Aggregate tests passed.');
