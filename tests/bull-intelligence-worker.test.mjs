import assert from 'node:assert/strict';
import { intelligenceCapabilities, handleBullIntelligenceRequest } from '../workers/bull-intelligence-extension.js';

const caps = intelligenceCapabilities({});
assert.equal(caps.readOnly, true);
assert.equal(caps.publicAddressOnly, true);
assert.equal(caps.features.bullDna.state, 'ready');
assert.equal(caps.features.radar.state, 'index-required');
assert.equal(caps.features.timeMachine.state, 'index-required');

const fakeDb = {
  prepare(sql) {
    return {
      bind() { return this; },
      async first() {
        if (/bull_wallet_windows/.test(sql)) return { window_key: '90d', window_start: 1, window_end: 2, tx_count: 10, active_days: 3, swaps: 2, unique_mints: 4, failures: 0, sol_in: 1, sol_out: .5, fees_sol: .001, top_holding_percent: 42, updated_at: 2 };
        if (/COUNT\(\*\)/.test(sql)) return { event_count: 10, first_seen: 1, last_seen: 2 };
        if (/bull_chain_weather/.test(sql)) return { regime: 'clear', bucket_start: 2, bucket_seconds: 3600, activity_score: 55 };
        return null;
      },
      async all() {
        if (/bull_wallet_relationships/.test(sql)) return { results: [{ wallet_a: '11111111111111111111111111111111', wallet_b: '22222222222222222222222222222222', interaction_count: 2 }] };
        if (/bull_radar_anomalies/.test(sql)) return { results: [{ anomaly_key: 'rotation-spike', severity: 0.8, observed_at: 2 }] };
        return { results: [] };
      }
    };
  }
};

const indexedCaps = intelligenceCapabilities({ DB: fakeDb, BULL_INDEXER_ENABLED: 'true', BULL_ARCHIVAL_ENABLED: 'true' });
assert.equal(indexedCaps.features.radar.state, 'ready');
assert.equal(indexedCaps.features.weather.state, 'ready');
assert.equal(indexedCaps.features.timeMachine.state, 'ready');

let response = await handleBullIntelligenceRequest(new Request('https://example.com/api/intelligence/capabilities'), {});
assert.equal(response.status, 200);
let body = await response.json();
assert.equal(body.ok, true);
assert.equal(body.capabilities.readOnly, true);

response = await handleBullIntelligenceRequest(new Request('https://example.com/api/intelligence/wallet-summary', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: 'bad' })
}), { DB: fakeDb });
assert.equal(response.status, 400);

response = await handleBullIntelligenceRequest(new Request('https://example.com/api/intelligence/wallet-summary', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: '11111111111111111111111111111111' })
}), { DB: fakeDb });
body = await response.json();
assert.equal(body.ok, true);
assert.equal(body.indexed.indexedEvents, 10);
assert.equal(body.relationships.length, 1);

response = await handleBullIntelligenceRequest(new Request('https://example.com/api/intelligence/radar'), { DB: fakeDb, BULL_INDEXER_ENABLED: 'true' });
body = await response.json();
assert.equal(body.state, 'ready');
assert.equal(body.anomalies.length, 1);

response = await handleBullIntelligenceRequest(new Request('https://example.com/api/intelligence/weather'), { DB: fakeDb, BULL_INDEXER_ENABLED: 'true' });
body = await response.json();
assert.equal(body.state, 'ready');
assert.equal(body.weather.regime, 'clear');

console.log('Bull Intelligence Worker contract tests passed.');
