import test from 'node:test';
import assert from 'node:assert/strict';
import { mountAllowed, resolveExperienceFlags } from './experience-feature-flags.mjs';

test('missing flags are disabled', () => {
  assert.deepEqual(resolveExperienceFlags(), {
    universeEnabled: false,
    tricksterStudioEnabled: false
  });
});

test('explicit flags enable independently', () => {
  assert.deepEqual(resolveExperienceFlags({
    UNIVERSE_ENABLED: 'true',
    TRICKSTER_STUDIO_ENABLED: 'off'
  }), {
    universeEnabled: true,
    tricksterStudioEnabled: false
  });
});

test('unknown mount requests fail closed', () => {
  assert.equal(mountAllowed('notAFeature', { UNIVERSE_ENABLED: true }), false);
});
