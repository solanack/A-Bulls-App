import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUT_SHARE_SIZE,
  cutShareCopy,
  cutShareHref,
  cutSharePath,
  cutShareReceiptLines,
  cutShareSize,
  shareCutLink,
  shareIdFromSearch,
  validateStoryManifest
} from './trickster-story-manifest.mjs';

const valid = {
  id: 'story-1',
  storyType: 'transaction-replay',
  subject: { kind: 'transaction', id: 'sig-1' },
  coverage: { from: 1_700_000_000, to: 1_700_086_400, verifiedPercent: 100, statement: 'Currently indexed evidence only.' },
  evidence: [{ id: 'receipt-1', signature: 'Sig11111111111111111111111111111111111111111', slot: 123, blockTime: 1_700_000_000, source: 'solana-rpc' }],
  claims: [{ id: 'claim-1', kind: 'observed', statement: 'The transaction was observed.', evidenceIds: ['receipt-1'] }],
  scenes: [{ id: 'scene-1', type: 'evidence', durationFrames: 60, claimIds: ['claim-1'] }],
  output: { aspectRatio: '9:16', rendererVersion: 'trickster-v1' }
};

test('existing VERIFY page is /?tour= and defaults to 1080×1920', () => {
  assert.deepEqual(cutShareSize('9:16'), { w: 1080, h: 1920 });
  assert.equal(CUT_SHARE_SIZE['9:16'].h / CUT_SHARE_SIZE['9:16'].w, 16 / 9);
  assert.equal(cutSharePath('deadbeef'), '/?tour=deadbeef');
  assert.equal(cutShareHref('https://abullsapp.com/', 'abc'), 'https://abullsapp.com/?tour=abc');
  assert.equal(shareIdFromSearch('?tour=deadbeef'), 'deadbeef');
  assert.equal(shareIdFromSearch('?verify=cafef00d'), 'cafef00d');
  assert.equal(shareIdFromSearch('?tour=kept&verify=ignored'), 'kept');
});

test('receipt burn-in uses indexed signatures and never invents missing ones', () => {
  const manifest = validateStoryManifest(valid);
  const lines = cutShareReceiptLines(manifest, 'https://abullsapp.com/?tour=abc');
  assert.equal(lines[0], 'INDEXED');
  assert.match(lines[1] ?? '', /→/);
  assert.ok(lines.some((line) => line.startsWith('SIG Sig11111')));
  assert.ok(lines.some((line) => line.includes('VERIFY https://abullsapp.com/?tour=abc')));
  const empty = cutShareReceiptLines({ ...manifest, evidence: [{ ...manifest.evidence[0], signature: null, sourceReference: 'indexed-event:0' }] }, 'https://x/?tour=1');
  assert.ok(empty.includes('signature unavailable'));
  assert.match(cutShareCopy('https://x/?tour=1').text, /VERIFY/);
});

test('native share prefers a file, then the VERIFY URL, then clipboard', async () => {
  const shared = [];
  const file = new File(['cut'], 'abulls-cut.svg', { type: 'image/svg+xml' });
  assert.equal(await shareCutLink({
    title: 'VERIFY this Cut',
    text: 'Indexed receipts',
    url: 'https://abullsapp.com/?tour=abc',
    file,
    nav: { canShare: () => true, share: async (payload) => { shared.push(payload); } }
  }), 'shared');
  assert.equal(shared[0]?.files?.length, 1);
  let copied = '';
  assert.equal(await shareCutLink({
    title: 'VERIFY this Cut',
    text: 'Indexed receipts',
    url: 'https://abullsapp.com/?tour=abc',
    nav: { clipboard: { writeText: async (value) => { copied = value; } } }
  }), 'copied');
  assert.equal(copied, 'https://abullsapp.com/?tour=abc');
});
