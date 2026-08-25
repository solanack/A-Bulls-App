import test from 'node:test';
import assert from 'node:assert/strict';
import { replayEventLanePoint } from './trade-replay-player.mjs';

const timeline={startTime:1000,endTime:5000,durationMs:4000};

test('time-only event lane preserves chain-time x position without inventing price',()=>{
  const buy=replayEventLanePoint({timestamp:2000,side:'buy'},timeline,1000,400,40);
  const sell=replayEventLanePoint({timestamp:4000,side:'sell'},timeline,1000,400,40);
  assert.equal(Math.round(buy.x),270);
  assert.equal(Math.round(sell.x),730);
  assert.ok(buy.y<sell.y);
});

test('overlay lane stays inside chart bounds',()=>{
  const point=replayEventLanePoint({timestamp:5000,side:'event'},timeline,320,230,28,{overlay:true});
  assert.ok(point.x<=292&&point.x>=28);
  assert.ok(point.y<=202&&point.y>=70);
});
