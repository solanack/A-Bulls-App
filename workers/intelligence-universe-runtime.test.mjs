import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeObservation,
  positionForEntity,
  sampleUniverseObservations,
  universeSnapshot
} from './intelligence-universe-runtime.mjs';
import { handleUniverseRequest } from './intelligence-universe-router.mjs';

test('entity positions are stable across snapshots', () => {
  assert.deepEqual(positionForEntity('wallet-1'), positionForEntity('wallet-1'));
  assert.notDeepEqual(positionForEntity('wallet-1'), positionForEntity('wallet-2'));
});

test('observation normalization fails closed and clamps magnitude', () => {
  const item = normalizeObservation({
    eventId:'event-1',
    entityKind:'wallet',
    entityId:'wallet-1',
    category:'transfer',
    observedAt:100,
    commitment:'confirmed',
    magnitudeBand:2,
    source:'yellowstone'
  });
  assert.equal(item.magnitudeBand,1);
  assert.equal(item.commitment,'confirmed');
  assert.throws(()=>normalizeObservation({entityId:'wallet-1'}),/required/);
});

test('sampling is capped and retains category diversity', () => {
  const rows = Array.from({length:100},(_,index)=>({
    event_id:`event-${index}`,
    category:index%2?'swap':'nft',
    magnitude_band:index/100,
    observed_at:index
  }));
  const sampled = sampleUniverseObservations(rows,20);
  assert.equal(sampled.length,20);
  assert.deepEqual(new Set(sampled.map(({category})=>category)),new Set(['swap','nft']));
});

test('missing database returns an honest empty snapshot', async () => {
  const snapshot = await universeSnapshot({}, {now:1000,windowSeconds:60});
  assert.equal(snapshot.observedEventCount,0);
  assert.equal(snapshot.particles.length,0);
  assert.match(snapshot.coverageStatement,/No live observations/);
});

test('endpoint is disabled unless explicitly enabled', async () => {
  const response = await handleUniverseRequest(
    new Request('https://example.test/api/intelligence/universe-snapshot'),
    {}
  );
  assert.equal(response.status,404);
  assert.equal((await response.json()).error,'feature_disabled');
});
