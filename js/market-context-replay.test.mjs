import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarketContextReplay } from './market-context-replay.mjs';
import { marketReplayPriceOptions } from './market-context-player-bridge.mjs';

const token='T'.repeat(32),walletA='A'.repeat(32),walletB='B'.repeat(32),quote='Q'.repeat(32);
const context={subject:{mint:token,signature:'sig-a'},window:{from:900,to:1200},activity:{events:[{signature:'sig-a',wallet:walletA,timestamp:1000000,slot:10,side:'buy',tokenDelta:5,source:'rpc'},{signature:'sig-b',wallet:walletB,timestamp:1100000,slot:11,side:'sell',tokenDelta:-2,source:'archive'}]},pricePairs:[{quoteMint:quote,bucketSeconds:60,candles:[{timestamp:960000,open:1,high:1.2,low:.9,close:1},{timestamp:1020000,open:1,high:1.4,low:1,close:1.3}]}]};

test('builds deterministic bounded market context replay',()=>{
  const replay=buildMarketContextReplay(context,{selectedEvent:{id:'sig-a',signature:'sig-a',wallet:walletA,timestamp:1000000,side:'buy'},token});
  assert.equal(replay.schemaVersion,'market-context-replay-v1');
  assert.equal(replay.timeline.eventCount,2);
  assert.equal(replay.timeline.events[0].metadata.selected,true);
  assert.equal(replay.timeline.events[1].metadata.selected,false);
  assert.equal(replay.timeline.events[0].price,null);
  assert.match(replay.disclosure,/do not imply coordination/i);
});

test('price overlay defaults to time-only and keeps quote pairs explicit',()=>{
  const options=marketReplayPriceOptions(context);
  assert.equal(options[0].id,'time-only');
  assert.equal(options[0].candles.length,0);
  assert.equal(options[1].quoteMint,quote);
  assert.equal(options[1].bucketSeconds,60);
  assert.equal(options[1].candles.length,2);
});

test('adds selected event if context index window does not contain it yet',()=>{
  const replay=buildMarketContextReplay({...context,subject:{mint:token,signature:'missing'},activity:{events:[context.activity.events[1]]}},{selectedEvent:{id:'selected',signature:'missing',wallet:walletA,timestamp:1000000,side:'buy',tokenDelta:7},token});
  assert.equal(replay.timeline.eventCount,2);
  assert.ok(replay.timeline.events.some(event=>event.signature==='missing'&&event.metadata.selected));
});
