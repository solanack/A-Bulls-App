import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceState, evidenceSummary, EvidenceStates } from './evidence-state.mjs';

test('all required product states are available', () => {
  for (const state of ['indexing','partial','observed','confirmed','finalized','verified','degraded','error']) {
    assert.equal(EvidenceStates.includes(state), true);
  }
});

test('partial history exposes coverage and observation count', () => {
  const state = evidenceState('partial', {
    coveragePercent: 99.8,
    observedCount: 1438,
    sources: ['rpc','archive','rpc']
  });
  assert.equal(state.label, 'PARTIAL HISTORY');
  assert.deepEqual(state.sources, ['rpc','archive']);
  assert.match(evidenceSummary(state), /99\.8% coverage/);
  assert.match(evidenceSummary(state), /1,438 observations/);
});

test('invalid states and coverage fail loudly', () => {
  assert.throws(() => evidenceState('predictive'), /unsupported/);
  assert.throws(() => evidenceState('partial', { coveragePercent: 'not-a-number' }), /finite/);
});
