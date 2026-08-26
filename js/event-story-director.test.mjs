import test from 'node:test';
import assert from 'node:assert/strict';
import { directEventStoryBeats, eventStoryScenePlan, summarizeEventStoryDirection } from './event-story-director.mjs';

const bundle={claims:[{id:'selected-event-observed'},{id:'market-window-activity'},{id:'route-window-context'},{id:'price-after-300'},{id:'price-after-900'}],marketContext:{activity:{eventCount:12},routes:{routeRows:4}}};

test('directs event story from available evidence only',()=>{
  const beats=directEventStoryBeats(bundle);
  assert.deepEqual(beats.map(beat=>beat.id),['event-hook','market-window','execution-context','what-happened-next','evidence-close']);
  assert.deepEqual(beats.find(beat=>beat.id==='what-happened-next').claimIds,['price-after-300','price-after-900']);
});

test('turns evidence-directed beats into the actual Trickster scene plan',()=>{
  const scenes=eventStoryScenePlan(bundle);
  assert.deepEqual(scenes.map(scene=>scene.type),['event-hook','market-window-replay','execution-context','market-aftermath','evidence-close']);
  assert.deepEqual(scenes[3].claimIds,['price-after-300','price-after-900']);
  assert.ok(scenes.every(scene=>scene.durationFrames>0));
});

test('degrades gracefully when market context is unavailable',()=>{
  const direction=summarizeEventStoryDirection({claims:[{id:'selected-event-observed'}]});
  assert.deepEqual(direction.beats.map(beat=>beat.id),['event-hook','evidence-close']);
  assert.equal(direction.hasMarketWindow,false);
  assert.match(direction.disclosure,/do not infer/i);
  assert.deepEqual(eventStoryScenePlan({claims:[{id:'selected-event-observed'}]}).map(scene=>scene.type),['event-hook','evidence-close']);
});
