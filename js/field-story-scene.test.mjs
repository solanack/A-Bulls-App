import test from 'node:test';
import assert from 'node:assert/strict';
import {storySceneFieldState} from './field-story-scene.mjs';

test('focus scene moves camera closer without changing evidence ids',()=>{const state=storySceneFieldState({sceneId:'focus',mode:'focus-event',eventIds:['sig-a']},{claimIds:['claim-a']});assert.equal(state.sceneId,'focus');assert.equal(state.camera.distance<100,true);assert.deepEqual(state.eventIds,['sig-a']);assert.equal(state.simulation,false);});
test('comparison simulation remains explicitly disclosed and spatially ghosted',()=>{const state=storySceneFieldState({sceneId:'what-if',mode:'comparison-simulation',eventIds:['whatif-1']},{claimIds:[]});assert.equal(state.simulation,true);assert.equal(state.field.ghostOffset,18);assert.match(state.disclosure,/Simulation scene/);});
test('field intensity is bounded for very large scenes',()=>{const state=storySceneFieldState({mode:'market-window',eventIds:Array.from({length:10000},(_,i)=>String(i))},{claimIds:Array.from({length:100},(_,i)=>String(i))});assert.ok(state.field.intensity<=1.38);assert.ok(state.field.scale<=1.14);assert.ok(state.camera.distance>=76);});
test('story spatial disclosure forbids semantic inference from position',()=>{const state=storySceneFieldState({mode:'market-window'},{claimIds:[]});assert.match(state.disclosure,/does not imply identity, ownership, coordination, intent, causation, or future behavior/);});
