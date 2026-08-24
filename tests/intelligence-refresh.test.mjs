import assert from 'node:assert/strict';
import { planRadarRows, planWeatherRow } from '../workers/intelligence-refresh.mjs';

const current = [{
  mint: 'TOKEN', bucket_start: 1000, bucket_seconds: 3600,
  unique_wallets: 40, inbound_wallets: 30, outbound_wallets: 8,
  long_duration_wallets: 12, new_wallets: 20
}];
const baseline = [
  { mint: 'TOKEN', unique_wallets: 18, inbound_wallets: 8, outbound_wallets: 7, long_duration_wallets: 5, new_wallets: 4 },
  { mint: 'TOKEN', unique_wallets: 22, inbound_wallets: 11, outbound_wallets: 9, long_duration_wallets: 7, new_wallets: 6 }
];
const radar = planRadarRows(current, baseline, 5000);
assert.equal(radar.length, 1);
assert.equal(radar[0].scopeType, 'token');
assert.equal(radar[0].scopeValue, 'TOKEN');
assert.ok(radar[0].severity >= 55 && radar[0].severity <= 100);
assert.equal(radar[0].sampleSize, 40);
assert.ok(radar[0].expiresAt > 5000);

const weather = planWeatherRow(
  [{ tx_count: 1000, swaps: 500, unique_mints: 120 }],
  current,
  [{ event_count: 250 }],
  3600,
  3600
);
assert.equal(weather.bucketStart, 3600);
assert.equal(weather.bucketSeconds, 3600);
assert.ok(weather.activityScore >= 0 && weather.activityScore <= 100);
assert.ok(weather.rotationScore >= 0 && weather.rotationScore <= 100);
assert.ok(weather.nftActivityScore > 0);
assert.ok(typeof weather.regime === 'string' && weather.regime.length > 0);
assert.match(weather.evidence.interpretation, /not a market forecast/i);

const quiet = planWeatherRow([], [], [], 7200, 3600);
assert.equal(quiet.regime, 'calm');

console.log('Intelligence Refresh tests passed.');
