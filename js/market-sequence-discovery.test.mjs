import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverMarketSequences, sliceMarketReplayToSequence } from './market-sequence-discovery.mjs';

const mint='11111111111111111111111111111111';
const base=1_700_000_000_000;
const events=[
  {id:'a',timestamp:base+10_000,wallet:'w1',side:'buy',tokenDelta:1},
  {id:'b',timestamp:base+20_000,wallet:'w2',side:'sell',tokenDelta:-2},
  {id:'c',timestamp:base+310_000,wallet:'w1',side:'buy',tokenDelta:3},
  {id:'d',timestamp:base+320_000,wallet:'w2',side:'buy',tokenDelta:4},
  {id:'e',timestamp:base+330_000,wallet:'w3',side:'sell',tokenDelta:-5},
  {id:'f',timestamp:base+340_000,wallet:'w4',side:'buy',tokenDelta:100},
  {id:'g',timestamp:base+350_000,wallet:'w5',side:'sell',tokenDelta:null}
];
const bundle={subject:{kind:'token-market',mint,quoteMint:null},window:{from:base/1000,to:(base+3_600_000)/1000,startTime:base,endTime:base+3_600_000,bucketSeconds:60},activity:{totalEvents:events.length,returnedEvents:events.length,walletCount:5,buyCount:4,sellCount:3,truncated:false},events,candles:[]};

test('discovers deterministic evidence-backed non-price sequences from time-only replay',()=>{
  const sequences=discoverMarketSequences(bundle,{limit:10});
  assert.ok(sequences.some(item=>item.kind==='activity-surge'));
  assert.ok(sequences.some(item=>item.kind==='wallet-concentration'));
  assert.ok(sequences.some(item=>item.kind==='large-observed-trade'));
  assert.equal(sequences.some(item=>item.kind==='indexed-price-move'),false);
  assert.ok(sequences.every(item=>item.evidenceIds.length>0));
  assert.ok(sequences.every(item=>/does not establish coordination/.test(item.disclosure)));
});

test('price movement requires an explicit quote market and indexed candles',()=>{
  const candles=[
    {timestamp:base+300_000,close:1},
    {timestamp:base+360_000,close:1.02}
  ];
  const timeOnly=discoverMarketSequences({...bundle,candles});
  assert.equal(timeOnly.some(item=>item.kind==='indexed-price-move'),false);
  const explicit=discoverMarketSequences({...bundle,subject:{...bundle.subject,quoteMint:'So11111111111111111111111111111111111111112'},candles},{limit:12});
  assert.ok(explicit.some(item=>item.kind==='indexed-price-move'));
});

test('sequence slicing remains bounded and recalculates local activity without inventing values',()=>{
  const sequence=discoverMarketSequences(bundle,{limit:10}).find(item=>item.kind==='activity-surge');
  const sliced=sliceMarketReplayToSequence(bundle,sequence);
  assert.equal(sliced.window.startTime,sequence.from);
  assert.equal(sliced.window.endTime,sequence.to);
  assert.equal(sliced.activity.returnedEvents,sliced.events.length);
  assert.equal(sliced.activity.totalEvents,sliced.events.length);
  assert.equal(sliced.activity.truncated,false);
  assert.ok(sliced.events.some(event=>event.tokenDelta===null));
  assert.equal(sliced.selectedSequence.id,sequence.id);
});
