import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplayTimeline, TemporalReplayController, replayEffectForEvent, eventsBetween } from './temporal-replay-engine.mjs';

const events=[
  {id:'a',timestamp:1000,side:'buy',wallet:'A',token:'T',valueUsd:500,signature:'sig-a'},
  {id:'b',timestamp:2000,side:'sell',wallet:'A',token:'T',valueUsd:5000,signature:'sig-b'},
  {id:'c',timestamp:3000,side:'buy',wallet:'B',token:'T',valueUsd:10000,signature:'sig-c'}
];

test('timeline sorts and bounds events',()=>{
  const timeline=createReplayTimeline({events:[events[2],events[0],events[1]],startTime:1000,endTime:3000});
  assert.deepEqual(timeline.events.map((event)=>event.id),['a','b','c']);
  assert.equal(timeline.durationMs,2000);
});

test('controller plays, changes speed, seeks and steps events deterministically',()=>{
  const timeline=createReplayTimeline({events,startTime:1000,endTime:3000});
  const controller=new TemporalReplayController(timeline,{rate:2});
  controller.play();
  const tick=controller.tick(500);
  assert.equal(tick.snapshot.playheadMs,1000);
  assert.deepEqual(tick.events.map((event)=>event.id),['b']);
  controller.setRate(8);
  assert.equal(controller.snapshot().rate,8);
  controller.seekProgress(0.25);
  assert.equal(controller.snapshot().playheadMs,500);
  controller.stepEvent(1);
  assert.equal(controller.snapshot().chainTime,2000);
  controller.stepEvent(-1);
  assert.equal(controller.snapshot().chainTime,1000);
});

test('eventsBetween supports rewind order',()=>{
  const timeline=createReplayTimeline({events,startTime:1000,endTime:3000});
  assert.deepEqual(eventsBetween(timeline,0,2000).map((event)=>event.id),['b','c']);
  assert.deepEqual(eventsBetween(timeline,2000,0).map((event)=>event.id),['b','a']);
});

test('buy and sell effects are semantic and intensity is bounded',()=>{
  const buy=replayEffectForEvent(events[0]);
  const sell=replayEffectForEvent(events[1]);
  assert.equal(buy.kind,'lightning');
  assert.equal(buy.hue,'green');
  assert.equal(sell.kind,'lightning');
  assert.equal(sell.hue,'red');
  assert.ok(buy.intensity>=0.2&&buy.intensity<=1);
  assert.ok(sell.intensity>=buy.intensity);
});
