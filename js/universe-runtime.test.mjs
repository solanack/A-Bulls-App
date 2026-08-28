import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticUniverse } from './universe-synthetic-data.mjs';
import { FrameBudgetController, initialUniverseQuality } from './universe-quality.mjs';
import { HyperspaceTransition } from './universe-transition.mjs';
import { hasRenderableUniverseSnapshot } from './universe-experience.mjs';

test('synthetic data is deterministic and explicitly labeled', () => {
  const first = createSyntheticUniverse({ seed: 7, count: 12 });
  const second = createSyntheticUniverse({ seed: 7, count: 12 });
  assert.deepEqual(first.particles, second.particles);
  assert.match(first.samplingPolicy, /synthetic/);
  assert.equal(first.sources[0], 'synthetic-prototype');
});

test('empty live snapshots never replace the playable synthetic field', () => {
  assert.equal(hasRenderableUniverseSnapshot({ particles: [] }), false);
  assert.equal(hasRenderableUniverseSnapshot({ particles: [{ id: 'live-1' }] }), true);
  assert.equal(hasRenderableUniverseSnapshot(null), false);
});

test('reduced motion selects non-canvas fallback', () => {
  assert.equal(initialUniverseQuality({ webgl2: true, webgpu: true, reducedMotion: true }), 'fallback');
});

test('sustained slow frames regress quality', () => {
  const budget = new FrameBudgetController('medium', { webgl2: true, deviceMemory: 4 });
  for (let index = 0; index < 20; index += 1) budget.sample(30);
  assert.equal(budget.tier, 'low');
});

test('transition waits at whiteout until destination is ready', () => {
  const transition = new HyperspaceTransition({ locking: 10, accelerating: 10, whiteout: 10, revealing: 10 });
  transition.start({ id: 'a', kind: 'wallet' }, 0);
  assert.equal(transition.update(31, false).state, 'whiteout');
  assert.equal(transition.update(31, true).state, 'revealing');
  assert.equal(transition.update(41, true).state, 'complete');
});
