import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceDependencyAssets,experienceDependencyFallbackAssets,loadMediabunny,loadThree } from './experience-dependencies.mjs';

test('experience dependency paths are version-pinned and local-first',()=>{
  assert.deepEqual(experienceDependencyAssets(),{
    three:'../vendor/experience/three-0.185.0.module.min.js',
    mediabunny:'../vendor/experience/mediabunny-1.55.2.min.mjs'
  });
  assert.deepEqual(experienceDependencyFallbackAssets(),{
    three:'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.min.js',
    mediabunny:'https://cdn.jsdelivr.net/npm/mediabunny@1.55.2/dist/bundles/mediabunny.min.mjs'
  });
});

test('dependency loaders prefer local assets and fall back to pinned CDN assets',async()=>{
  const localCalls=[];
  const three=await loadThree(async path=>{localCalls.push(path);return {WebGLRenderer:class {}};});
  assert.equal(typeof three.WebGLRenderer,'function');
  assert.match(localCalls[0],/three-0\.185\.0/);
  assert.equal(localCalls.length,1);

  const fallbackCalls=[];
  const recovered=await loadThree(async path=>{fallbackCalls.push(path);if(path.startsWith('..'))throw new Error('local missing');return {WebGLRenderer:class {}};});
  assert.equal(typeof recovered.WebGLRenderer,'function');
  assert.equal(fallbackCalls.length,2);
  assert.match(fallbackCalls[1],/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.185\.0/);

  assert.equal(await loadMediabunny(async()=>{throw new Error('missing');}),null);
});
