import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActiveTimeMap, activeTimeForTimestamp, timestampForActiveTime } from './temporal-active-time.mjs';

test('compresses only long inactive gaps while preserving order and original timestamps',()=>{
  const map=buildActiveTimeMap([
    {id:'a',timestamp:0},{id:'b',timestamp:1000},{id:'c',timestamp:61000},{id:'d',timestamp:62000}
  ],{gapThresholdMs:30000,compressedGapMs:3000});
  assert.equal(map.compressedGapCount,1);
  assert.equal(map.originalDurationMs,62000);
  assert.equal(map.activeDurationMs,5000);
  assert.deepEqual(map.points.map(point=>point.timestamp),[0,1000,61000,62000]);
  assert.deepEqual(map.points.map(point=>point.activeTimeMs),[0,1000,4000,5000]);
  assert.match(map.disclosure,/original chain timestamps remain attached/i);
});

test('interpolates timestamps inside compressed gaps without rewriting source time',()=>{
  const map=buildActiveTimeMap([{id:'a',timestamp:0},{id:'b',timestamp:60000}],{gapThresholdMs:30000,compressedGapMs:3000});
  assert.equal(activeTimeForTimestamp(map,30000),1500);
  assert.equal(timestampForActiveTime(map,1500),30000);
  assert.equal(map.points[1].timestamp,60000);
});

test('active-time mapping round trips event timestamps',()=>{
  const map=buildActiveTimeMap([{id:'a',timestamp:1000},{id:'b',timestamp:2000},{id:'c',timestamp:62000},{id:'d',timestamp:63000}],{gapThresholdMs:30000,compressedGapMs:3000});
  for(const point of map.points)assert.equal(timestampForActiveTime(map,activeTimeForTimestamp(map,point.timestamp)),point.timestamp);
});

test('short gaps remain uncompressed',()=>{
  const map=buildActiveTimeMap([{id:'a',timestamp:0},{id:'b',timestamp:10000}],{gapThresholdMs:30000,compressedGapMs:3000});
  assert.equal(map.compressedGapCount,0);
  assert.equal(map.activeDurationMs,10000);
});
