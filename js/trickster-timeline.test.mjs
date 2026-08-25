import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryTimeline,frameAt } from './trickster-timeline.mjs';
import { bitrateFor,TricksterFormats } from './trickster-clip-export.mjs';

const manifest={
  id:'story-1',
  claims:[{id:'c1',statement:'Observed',kind:'observed'}],
  scenes:[
    {id:'s1',type:'hook',durationFrames:60,claimIds:[]},
    {id:'s2',type:'evidence',durationFrames:120,claimIds:['c1']}
  ],
  output:{aspectRatio:'9:16'}
};

test('timeline maps claims to deterministic frame ranges',()=>{
  const timeline=buildStoryTimeline(manifest,{fps:30});
  assert.equal(timeline.totalFrames,180);
  assert.equal(frameAt(timeline,60).scene.id,'s2');
  assert.equal(frameAt(timeline,60).scene.claims[0].id,'c1');
});

test('timeline enforces the clip duration ceiling',()=>{
  const timeline=buildStoryTimeline(manifest,{fps:30,maxSeconds:2});
  assert.equal(timeline.totalFrames,60);
  assert.equal(timeline.capped,true);
});

test('portrait export is full vertical HD with derived bitrate',()=>{
  assert.deepEqual(TricksterFormats['9:16'],{width:1080,height:1920});
  assert.ok(bitrateFor(1080,1920,30)>10_000_000);
});
