import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceDependencyAssets,loadMediabunny,loadThree } from './experience-dependencies.mjs';

test('experience dependency paths are version-pinned and local',()=>{
  assert.deepEqual(experienceDependencyAssets(),{
    three:'../vendor/experience/three-0.185.0.module.min.js',
    mediabunny:'../vendor/experience/mediabunny-1.55.2.min.mjs'
  });
});

test('dependency loaders use injected imports and fail closed',async()=>{
  const calls=[];
  const three=await loadThree(async path=>{calls.push(path);return {WebGLRenderer:class {}};});
  assert.equal(typeof three.WebGLRenderer,'function');
  assert.match(calls[0],/three-0\.185\.0/);
  assert.equal(await loadMediabunny(async()=>{throw new Error('missing');}),null);
});
