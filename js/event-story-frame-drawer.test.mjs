import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventStoryCinematicFrameDrawer } from './event-story-frame-drawer.mjs';

function fakeContext(){let fills=0;return{canvas:{width:1080,height:1920},get fills(){return fills;},save(){},restore(){},fillRect(){fills+=1;},beginPath(){},arc(){},stroke(){},fill(){},moveTo(){},lineTo(){},rect(){},roundRect(){},measureText(value){return{width:String(value).length*10};},fillText(){},set fillStyle(v){this._fillStyle=v;},set strokeStyle(v){this._strokeStyle=v;},set lineWidth(v){this._lineWidth=v;},set globalAlpha(v){this._globalAlpha=v;},set font(v){this._font=v;},set textAlign(v){this._textAlign=v;},set textBaseline(v){this._textBaseline=v;}};}

const manifest={coverage:{statement:'Verified',verifiedPercent:100},evidence:[{id:'e1',source:'rpc'}],claims:[],scenes:[{id:'s1',type:'evidence-close',claimIds:[]}]};
const renderPlan=[{sceneId:'s1',type:'evidence-close',startFrame:0,endFrame:19,durationFrames:20,mode:'evidence-close',evidenceCount:1}];

test('cinematic drawer returns evidence model plus deterministic transition state',async()=>{
  const ctx=fakeContext(),draw=createEventStoryCinematicFrameDrawer({bundle:{},manifest,renderPlan,fadeFrames:5});
  const first=await draw(ctx,0);assert.equal(first.model.scene.mode,'evidence-close');assert.equal(first.transition.phase,'fade-in');assert.equal(first.transition.overlayOpacity,1);
  const middle=await draw(ctx,10);assert.equal(middle.transition.phase,'steady');assert.equal(middle.transition.overlayOpacity,0);
  assert.ok(ctx.fills>=3);
});
