import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneTransitionAtFrame } from './event-story-scene-transition.mjs';

const plan=[{sceneId:'a',startFrame:0,endFrame:29},{sceneId:'b',startFrame:30,endFrame:59}];

test('scene transitions are deterministic at fixed frame boundaries',()=>{
  assert.deepEqual(sceneTransitionAtFrame(plan,0,{fadeFrames:10}),{sceneId:'a',phase:'fade-in',overlayOpacity:1,fadeFrames:10,frame:0});
  assert.equal(sceneTransitionAtFrame(plan,10,{fadeFrames:10}).phase,'steady');
  assert.equal(sceneTransitionAtFrame(plan,20,{fadeFrames:10}).phase,'fade-out');
  assert.equal(sceneTransitionAtFrame(plan,29,{fadeFrames:10}).overlayOpacity,1);
  assert.equal(sceneTransitionAtFrame(plan,30,{fadeFrames:10}).phase,'fade-in');
  assert.equal(sceneTransitionAtFrame(plan,45,{fadeFrames:10}).overlayOpacity,0);
});

test('frame outside render plan has no transition state',()=>{
  assert.equal(sceneTransitionAtFrame(plan,60),null);
});
