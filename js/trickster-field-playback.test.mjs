import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTricksterSceneMeta,TricksterFieldPlaybackDisclosure} from './trickster-field-playback.mjs';

test('parses runtime mode duration and claims from canonical Trickster scene metadata',()=>{
  const parsed=parseTricksterSceneMeta({title:'Synchronized Trade Replay',meta:'8.0s · 3 evidence-backed claims · comparison replay · frames 75-314',index:1});
  assert.equal(parsed.mode,'comparison-replay');
  assert.equal(parsed.durationMs,8000);
  assert.equal(parsed.claimCount,3);
  assert.match(parsed.id,/field-scene-2-synchronized-trade-replay/);
});

test('falls back to evidence close without inventing missing runtime semantics',()=>{
  const parsed=parseTricksterSceneMeta({title:'Evidence Summary',meta:'3.5s · 0 evidence-backed claims',index:0});
  assert.equal(parsed.mode,'evidence-close');
  assert.equal(parsed.durationMs,3500);
  assert.equal(parsed.claimCount,0);
});

test('minimum duration is bounded and disclosure preserves evidence truth',()=>{
  const parsed=parseTricksterSceneMeta({title:'Tiny',meta:'0.1s · 1 evidence-backed claim · focus event',index:0});
  assert.equal(parsed.durationMs,250);
  assert.equal(parsed.mode,'focus-event');
  assert.match(TricksterFieldPlaybackDisclosure,/does not create new evidence/i);
  assert.match(TricksterFieldPlaybackDisclosure,/simulation into observed history/i);
});
