import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventStoryFrameDrawer, drawEventStoryFrame } from './event-story-frame-renderer.mjs';

function fakeContext(){const texts=[];return{canvas:{width:1080,height:1920},texts,save(){},restore(){},fillRect(){},beginPath(){},arc(){},stroke(){},fill(){},moveTo(){},lineTo(){},rect(){},roundRect(){},measureText(value){return{width:String(value).length*12};},fillText(value){texts.push(String(value));},set fillStyle(v){this._fillStyle=v;},get fillStyle(){return this._fillStyle;},set strokeStyle(v){this._strokeStyle=v;},set lineWidth(v){this._lineWidth=v;},set font(v){this._font=v;},set textAlign(v){this._textAlign=v;},set textBaseline(v){this._textBaseline=v;}};}

const manifest={coverage:{statement:'Indexed evidence coverage.',verifiedPercent:100},evidence:[{id:'e1',source:'rpc'}],claims:[{id:'c1',statement:'Observed trade on chain.',kind:'observed'}],scenes:[{id:'s1',type:'event-hook',claimIds:['c1']},{id:'s2',type:'execution-context',claimIds:[]},{id:'s3',type:'evidence-close',claimIds:[]}]};
const renderPlan=[
  {sceneId:'s1',type:'event-hook',startFrame:0,endFrame:9,durationFrames:10,mode:'focus-event',chainTimeFrom:1000,chainTimeTo:1000,focusId:'a',eventIds:['a']},
  {sceneId:'s2',type:'execution-context',startFrame:10,endFrame:19,durationFrames:10,mode:'route-context',chainTimeFrom:1000,chainTimeTo:2000,routeRows:2},
  {sceneId:'s3',type:'evidence-close',startFrame:20,endFrame:29,durationFrames:10,mode:'evidence-close',evidenceCount:1}
];
const bundle={replayEvents:[{id:'a',signature:'sig-a',timestamp:1000,side:'buy',tokenDelta:5}],candles:[],marketContext:{routes:{venues:[{id:'Jupiter',count:2}],pools:[{id:'pool-a',count:1}]}}};

test('draws selected-event frame from deterministic frame model',async()=>{
  const ctx=fakeContext(),draw=createEventStoryFrameDrawer({bundle,manifest,renderPlan});
  const model=await draw(ctx,0);
  assert.equal(model.scene.mode,'focus-event');
  assert.ok(ctx.texts.some(text=>text.includes('BUY')));
  assert.ok(ctx.texts.some(text=>text.includes('sig-a')));
});

test('draws route and evidence summaries without requiring replay motion',async()=>{
  const draw=createEventStoryFrameDrawer({bundle,manifest,renderPlan});
  const route=fakeContext();await draw(route,15);assert.ok(route.texts.some(text=>text.includes('2 INDEXED ROUTE ROWS')));assert.ok(route.texts.some(text=>text.includes('Jupiter')));
  const close=fakeContext();await draw(close,25);assert.ok(close.texts.some(text=>text.includes('1 FROZEN EVIDENCE RECEIPTS')));assert.ok(close.texts.some(text=>text.includes('100%')));
});

test('drawEventStoryFrame rejects missing model',()=>{assert.throws(()=>drawEventStoryFrame(fakeContext(),null),/frame model/);});
