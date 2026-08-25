import test from 'node:test';
import assert from 'node:assert/strict';
import { destinationForEntity, normalizeUniverseSnapshot } from './universe-contracts.mjs';

const particle = {
  id: 'signature-1',
  kind: 'transaction',
  verificationState: 'confirmed',
  observedAt: 1005,
  category: 'swap',
  magnitudeBand: 0.5,
  position: [1, 2, 3]
};

test('normalizes a bounded and sourced snapshot', () => {
  const result = normalizeUniverseSnapshot({
    windowStart: 1000,
    windowEnd: 1010,
    observedEventCount: 20,
    samplingPolicy: 'top activity plus uniform sample',
    coverageStatement: '20 observed; 1 rendered',
    sources: ['yellowstone'],
    particles: [particle]
  });
  assert.equal(result.renderedParticleCount, 1);
  assert.equal(result.particles[0].verificationState, 'confirmed');
  assert.equal(Object.isFrozen(result), true);
});

test('rejects misleading particle counts', () => {
  assert.throws(() => normalizeUniverseSnapshot({
    windowStart: 1000,
    windowEnd: 1010,
    observedEventCount: 0,
    samplingPolicy: 'none',
    coverageStatement: 'empty',
    sources: ['rpc'],
    particles: [particle]
  }), /cannot exceed/);
});

test('routes selections without interpreting data', () => {
  assert.deepEqual(destinationForEntity(particle), {
    destination: 'transaction',
    entityKind: 'transaction',
    entityId: 'signature-1',
    verificationState: 'confirmed'
  });
});
