import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventStoryFocus } from './event-story-focus.mjs';

test('focuses transaction replay on the exact selected signature',()=>{
  const bundle={storyType:'transaction-replay',subject:{id:'sig-b'},marketContext:{subject:{signature:'sig-b',eventTime:2000}},replayEvents:[{id:'a',signature:'sig-a',timestamp:1000},{id:'b',signature:'sig-b',timestamp:2000},{id:'c',signature:'sig-c',timestamp:3000}]};
  assert.deepEqual(resolveEventStoryFocus(bundle),{signature:'sig-b',id:'b',timestamp:2000});
});

test('falls back to selected replay event timestamp when context time is unavailable',()=>{
  const bundle={storyType:'transaction-replay',subject:{id:'sig-a'},replayEvents:[{id:'event-a',signature:'sig-a',timestamp:1500}]};
  assert.deepEqual(resolveEventStoryFocus(bundle),{signature:'sig-a',id:'event-a',timestamp:1500});
});

test('non-transaction stories do not invent a replay focus',()=>{
  assert.deepEqual(resolveEventStoryFocus({storyType:'wallet-comparison',subject:{id:'sig-a'}}),{signature:'',id:'',timestamp:null});
});
