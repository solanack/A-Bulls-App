import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventStorySceneRuntime } from './event-story-scene-runtime.mjs';

const bundle={
  storyType:'transaction-replay',subject:{id:'sig-a'},
  replay:{startTime:900000,endTime:2100000},
  replayEvents:[{id:'event-a',signature:'sig-a',timestamp:1000000},{id:'event-b',signature:'sig-b',timestamp:1200000}],
  evidence:[{id:'sig-a'}],
  candles:[{timestamp:960000,close:1},{timestamp:1320000,close:1.2}],
  priceSelection:{mode:'indexed-quote-pair',quoteMint:'Q'.repeat(32),bucketSeconds:60},
  marketContext:{subject:{signature:'sig-a',eventTime:1000000},routes:{routeRows:3},selectedPricePair:{after:[{sampleTime:1320}]}}
};
const manifest={scenes:[
  {id:'s1',type:'event-hook'},
  {id:'s2',type:'market-window-replay'},
  {id:'s3',type:'execution-context'},
  {id:'s4',type:'market-aftermath'},
  {id:'s5',type:'evidence-close'}
]};

test('builds deterministic scene-specific playback directives',()=>{
  const runtime=buildEventStorySceneRuntime(bundle,manifest);
  assert.deepEqual(runtime.map(item=>item.mode),['focus-event','market-window','route-context','price-aftermath','evidence-close']);
  assert.equal(runtime[0].focusId,'event-a');
  assert.deepEqual(runtime[0].eventIds,['event-a']);
  assert.deepEqual(runtime[1].eventIds,['event-a','event-b']);
  assert.equal(runtime[1].quoteMint,bundle.priceSelection.quoteMint);
  assert.equal(runtime[2].routeRows,3);
  assert.equal(runtime[3].to,1320000);
  assert.equal(runtime[3].candleCount,2);
  assert.equal(runtime[4].evidenceCount,1);
});

test('non-transaction stories do not receive Event Story runtime directives',()=>{
  assert.deepEqual(buildEventStorySceneRuntime({storyType:'wallet-comparison'},manifest),[]);
});
