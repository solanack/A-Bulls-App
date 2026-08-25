import test from 'node:test';
import assert from 'node:assert/strict';
import { manifestDisclosures, validateStoryManifest } from './trickster-story-manifest.mjs';

function validManifest() {
  return {
    id: 'story-1',
    storyType: 'transaction-replay',
    subject: { kind: 'transaction', id: 'signature-1' },
    coverage: { from: 1000, to: 1010, verifiedPercent: 80, statement: '80% verified' },
    evidence: [{
      id: 'receipt-1',
      signature: 'signature-1',
      slot: 123,
      blockTime: 1005,
      source: 'rpc'
    }],
    claims: [{
      id: 'claim-1',
      kind: 'observed',
      statement: 'The transaction was observed at slot 123.',
      evidenceIds: ['receipt-1']
    }],
    scenes: [{
      id: 'scene-1',
      type: 'transaction-focus',
      durationFrames: 90,
      claimIds: ['claim-1']
    }],
    output: { aspectRatio: '9:16', rendererVersion: 'trickster-v1' }
  };
}

test('accepts an evidence-backed vertical story', () => {
  const result = validateStoryManifest(validManifest());
  assert.equal(result.output.aspectRatio, '9:16');
  assert.deepEqual(manifestDisclosures(result), ['80% verified']);
});

test('rejects claims without evidence', () => {
  const input = validManifest();
  input.claims[0].evidenceIds = [];
  assert.throws(() => validateStoryManifest(input), /requires evidence/);
});

test('requires disclosure for inference', () => {
  const input = validManifest();
  input.claims[0].kind = 'inferred';
  assert.throws(() => validateStoryManifest(input), /requires an estimate\/inference disclosure/);
});
