import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventStoryFrameModel } from './event-story-frame-model.mjs';

const manifest={coverage:{statement:'Partial indexed coverage',verifiedPercent:80},evidence:[{id:'e1',source:'rpc'},{id:'e2',source:'archive'}],claims:[{id:'c1',statement:'Observed event.',kind:'observed'}],scenes:[{id:'s1',type:'event-hook',claimIds:['c1']},{id:'s2',type:'market-window-replay',claimIds:[]},{id:'s3',type:'execution-context',claimIds:[]},{id:'s4',type:'evidence-close',claimIds:[]}]};
const renderPlan=[
  {sceneId:'s1',type:'event-hook',startFrame:0,endFrame:9,durationFrames:10,mode:'focus-event',chainTimeFrom:1000,chainTimeTo:1000,focusId:'a',eventIds:['a']},
  {sceneId:'s2',type:'market-window-replay',startFrame:10,endFrame:19,durationFrames:10,mode:'market-window',chainTimeFrom:1000,chainTimeTo:3000,eventIds:['a','b'],quoteMint:'Q',bucketSeconds:60},
  {sceneId:'s3',type:'execution-context',startFrame:20,endFrame:29,durationFrames:10,mode:'route-context',chainTimeFrom:1000,chainTimeTo:2000,routeRows:3},
  {sceneId:'s4',type:'evidence-close',startFrame:30,endFrame:39,durationFrames:10,mode:'evidence-close',chainTimeFrom:null,chainTimeTo:null,evidenceCount:2}
];
const bundle={replayEvents:[{id:'a',timestamp:1000,side:'buy'},{id:'b',timestamp:2500,side:'sell'}],candles:[{timestamp:1000,close:1},{timestamp:2000,close:1.5},{timestamp:3000,close:2}],marketContext:{routes:{venues:[{id:'Jupiter',count:2}],pools:[{id:'pool-a',count:1}]}}};

test('focus frame exposes only the selected event and scene claims',()=>{
  const model=buildEventStoryFrameModel({bundle,manifest,renderPlan},0);
  assert.equal(model.scene.mode,'focus-event');
  assert.deepEqual(model.visibleEvents.map(event=>event.id),['a']);
  assert.deepEqual(model.claims.map(claim=>claim.id),['c1']);
});

test('market frame reveals events and candles only through interpolated chain time',()=>{
  const model=buildEventStoryFrameModel({bundle,manifest,renderPlan},14);
  assert.equal(model.scene.mode,'market-window');
  assert.equal(model.quoteMint,'Q');
  assert.deepEqual(model.visibleEvents.map(event=>event.id),['a']);
  assert.deepEqual(model.visibleCandles.map(candle=>candle.close),[1]);
});

test('route and evidence frames expose summaries without invented replay motion',()=>{
  const route=buildEventStoryFrameModel({bundle,manifest,renderPlan},25);
  assert.equal(route.visibleEvents.length,0);assert.equal(route.routeContext.routeRows,3);assert.equal(route.routeContext.venues[0].id,'Jupiter');
  const close=buildEventStoryFrameModel({bundle,manifest,renderPlan},35);
  assert.equal(close.evidence.count,2);assert.equal(close.evidence.verifiedPercent,80);assert.deepEqual(close.evidence.sources,['rpc','archive']);
});
