import test from 'node:test';
import assert from 'node:assert/strict';
import { cueToneSpec, renderTricksterAudioBuffer, audioCueMixInfo } from './trickster-audio-renderer.mjs';

test('uses distinct deterministic tone specs for evidence and simulation cues',()=>{
  assert.deepEqual(cueToneSpec({kind:'buy-impact'}),cueToneSpec({kind:'buy-impact'}));
  assert.notDeepEqual(cueToneSpec({kind:'buy-impact'}),cueToneSpec({kind:'sell-impact'}));
  assert.notDeepEqual(cueToneSpec({kind:'simulation-impact'}),cueToneSpec({kind:'buy-impact'}));
  assert.equal(cueToneSpec({kind:'simulation-impact'}).wave,'square');
});

test('fails open to silent video when offline audio rendering is unavailable',async()=>{
  const audio=await renderTricksterAudioBuffer({durationSeconds:1,cues:[]},{OfflineAudioContextClass:null});
  assert.equal(audio,null);
  assert.deepEqual(audioCueMixInfo({durationSeconds:1,cues:[{kind:'scene-transition'}]},audio),{cueCount:1,durationSeconds:1,embedded:false,sampleRate:null,channels:null});
});
