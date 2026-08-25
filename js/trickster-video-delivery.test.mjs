import test from 'node:test';
import assert from 'node:assert/strict';
import { describeVideoDelivery } from './trickster-video-delivery.mjs';

test('describes a real encoded video with embedded synchronized sound as save-ready',()=>{
  const state=describeVideoDelivery({videoReady:true,blob:{size:1},extension:'mp4',width:1080,height:1920,fps:30,audio:{embedded:true,cueCount:7}});
  assert.equal(state.mode,'ready');assert.equal(state.extension,'mp4');assert.match(state.summary,/1080×1920/);assert.match(state.summary,/SOUND 7 CUES/);
});

test('truthfully labels silent local fallback when audio was not embedded',()=>{
  const state=describeVideoDelivery({videoReady:true,blob:{size:1},extension:'webm',width:1080,height:1920,fps:30,audio:{embedded:false,cueCount:5}});
  assert.match(state.summary,/SILENT FALLBACK/);
});

test('server-required and validated-only states never claim a video exists',()=>{
  const server=describeVideoDelivery({videoReady:false,renderRequired:'server',reason:'encoder_unavailable',validated:true});assert.equal(server.mode,'server');assert.match(server.summary,/no fake video file/i);
  const validated=describeVideoDelivery({videoReady:false,validated:true});assert.equal(validated.mode,'validated');assert.match(validated.summary,/has not been produced/i);
});
