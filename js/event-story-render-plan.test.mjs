import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventStoryRenderPlan, renderStateAtFrame } from './event-story-render-plan.mjs';

const timeline={scenes:[
  {id:'s1',type:'event-hook',startFrame:0,endFrame:74,durationFrames:75},
  {id:'s2',type:'market-window-replay',startFrame:75,endFrame:254,durationFrames:180},
  {id:'s3',type:'evidence-close',startFrame:255,endFrame:344,durationFrames:90}
]};
const runtime=[
  {sceneId:'s1',mode:'focus-event',from:940000,to:1060000,focusId:'event-a',eventIds:['event-a']},
  {sceneId:'s2',mode:'market-window',from:900000,to:2100000,focusId:'event-a',eventIds:['event-a','event-b'],quoteMint:'Q',bucketSeconds:60},
  {sceneId:'s3',mode:'evidence-close',evidenceCount:4}
];

test('aligns timeline frames with scene runtime directives',()=>{
  const plan=buildEventStoryRenderPlan(timeline,runtime);
  assert.equal(plan.length,3);
  assert.equal(plan[0].mode,'focus-event');
  assert.equal(plan[0].focusId,'event-a');
  assert.deepEqual(plan[1].eventIds,['event-a','event-b']);
  assert.equal(plan[1].quoteMint,'Q');
  assert.equal(plan[2].evidenceCount,4);
});

test('maps any render frame to deterministic scene and chain time',()=>{
  const plan=buildEventStoryRenderPlan(timeline,runtime);
  const first=renderStateAtFrame(plan,0),middle=renderStateAtFrame(plan,164),close=renderStateAtFrame(plan,300);
  assert.equal(first.sceneId,'s1');
  assert.equal(first.chainTime,940000);
  assert.equal(middle.sceneId,'s2');
  assert.ok(middle.chainTime>900000&&middle.chainTime<2100000);
  assert.equal(middle.quoteMint,'Q');
  assert.equal(close.mode,'evidence-close');
  assert.equal(close.chainTime,null);
});
