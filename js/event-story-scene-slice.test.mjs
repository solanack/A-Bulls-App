import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventStorySceneSlice } from './event-story-scene-slice.mjs';

const bundle={
  replayEvents:[
    {id:'a',signature:'sig-a',timestamp:1000},
    {id:'b',signature:'sig-b',timestamp:2000},
    {id:'c',signature:'sig-c',timestamp:3000}
  ],
  candles:[
    {timestamp:1000,close:1},
    {timestamp:2000,close:2},
    {timestamp:3000,close:3}
  ]
};

test('focus scene returns only explicitly selected event and no price candles',()=>{
  const slice=buildEventStorySceneSlice(bundle,{mode:'focus-event',from:500,to:1500,focusId:'a',eventIds:['a']});
  assert.deepEqual(slice.events.map(event=>event.id),['a']);
  assert.equal(slice.candles.length,0);
});

test('market window scene preserves bounded events and candles',()=>{
  const slice=buildEventStorySceneSlice(bundle,{mode:'market-window',from:900,to:2100,eventIds:['a','b'],quoteMint:'Q',bucketSeconds:60});
  assert.deepEqual(slice.events.map(event=>event.id),['a','b']);
  assert.deepEqual(slice.candles.map(candle=>candle.close),[1,2]);
  assert.equal(slice.quoteMint,'Q');
});

test('price aftermath scene returns candles only and route/evidence scenes do not invent motion',()=>{
  const aftermath=buildEventStorySceneSlice(bundle,{mode:'price-aftermath',from:1500,to:3100,quoteMint:'Q',bucketSeconds:60});
  assert.equal(aftermath.events.length,0);
  assert.deepEqual(aftermath.candles.map(candle=>candle.close),[2,3]);
  const route=buildEventStorySceneSlice(bundle,{mode:'route-context',from:900,to:2100,routeRows:4});
  assert.equal(route.events.length,0);assert.equal(route.candles.length,0);assert.equal(route.routeRows,4);
  const close=buildEventStorySceneSlice(bundle,{mode:'evidence-close',evidenceCount:7});
  assert.equal(close.events.length,0);assert.equal(close.candles.length,0);assert.equal(close.evidenceCount,7);
});
