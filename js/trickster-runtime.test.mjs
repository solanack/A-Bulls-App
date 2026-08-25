import test from 'node:test';
import assert from 'node:assert/strict';
import { composeGuidedStory, narrationClaims } from './trickster-composer.mjs';
import { chooseExportPlan } from './trickster-export-capabilities.mjs';

function story() {
  return composeGuidedStory({
    id: 'story-1',
    storyType: 'transaction-replay',
    subject: { kind: 'transaction', id: 'sig-1' },
    coverage: { from: 1, to: 2, verifiedPercent: 100, statement: 'Fully verified' },
    evidence: [{ id: 'e-1', signature: 'sig-1', source: 'rpc' }],
    claims: [{ id: 'c-1', kind: 'observed', statement: 'Observed on chain.', evidenceIds: ['e-1'] }]
  });
}

test('composer produces a valid vertical evidence story', () => {
  const result = story();
  assert.equal(result.output.aspectRatio, '9:16');
  assert.equal(result.scenes.some((scene) => scene.claimIds.includes('c-1')), true);
});

test('narration receives only manifest claims', () => {
  assert.deepEqual(narrationClaims(story()).flatMap((scene) => scene.claims).map((claim) => claim.statement), ['Observed on chain.']);
});

test('capable phones use WebCodecs and Mediabunny', () => {
  const plan = chooseExportPlan({ webCodecs: true, mediaRecorder: true, hardwareConcurrency: 8, deviceMemory: 8 });
  assert.equal(plan.mode, 'on-device-webcodecs');
  assert.equal(plan.muxer, 'mediabunny');
  assert.equal(plan.height, 1920);
});

test('unsupported devices request server rendering', () => {
  assert.equal(chooseExportPlan({ webCodecs: false, mediaRecorder: false }).mode, 'server-render-required');
});
