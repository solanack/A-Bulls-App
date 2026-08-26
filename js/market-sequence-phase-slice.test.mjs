import test from 'node:test';
import assert from 'node:assert/strict';
import { sliceMarketReplayToPhase } from './market-sequence-phase-slice.mjs';

const bundle={
  window:{from:1,to:10,startTime:1000,endTime:10000},
  activity:{totalEvents:4,returnedEvents:4,walletCount:3,buyCount:2,sellCount:2,truncated:false},
  events:[
    {id:'a',timestamp:1000,wallet:'W1',side:'buy'},
    {id:'b',timestamp:2000,wallet:'W2',side:'sell'},
    {id:'c',timestamp:5000,wallet:'W3',side:'buy'},
    {id:'d',timestamp:9000,wallet:'W1',side:'sell'}
  ],
  candles:[{timestamp:1000,close:1},{timestamp:2000,close:2},{timestamp:5000,close:3}]
};

test('phase slice preserves exact time and evidence membership',()=>{
  const result=sliceMarketReplayToPhase(bundle,{id:'phase-1',label:'PHASE 1',from:1000,to:2000,evidenceIds:['a','b']});
  assert.deepEqual(result.events.map(event=>event.id),['a','b']);
  assert.deepEqual(result.candles.map(item=>item.timestamp),[1000,2000]);
  assert.equal(result.window.startTime,1000);
  assert.equal(result.window.endTime,2000);
  assert.equal(result.activity.walletCount,2);
  assert.equal(result.activity.buyCount,1);
  assert.equal(result.activity.sellCount,1);
  assert.equal(result.selectedPhase.id,'phase-1');
});

test('phase evidence IDs prevent unrelated same-window events from leaking in',()=>{
  const result=sliceMarketReplayToPhase({...bundle,events:[...bundle.events,{id:'x',timestamp:1500,wallet:'WX',side:'buy'}]},{id:'phase-1',from:1000,to:2000,evidenceIds:['a','b']});
  assert.deepEqual(result.events.map(event=>event.id),['a','b']);
});

test('invalid phase windows fail closed',()=>{
  assert.throws(()=>sliceMarketReplayToPhase(bundle,{from:5000,to:1000}),/valid phase window/);
  assert.throws(()=>sliceMarketReplayToPhase(bundle,{from:null,to:1000}),/valid phase window/);
});
