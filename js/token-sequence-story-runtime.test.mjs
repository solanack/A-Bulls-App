import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTokenSequenceSceneRuntime } from './token-sequence-story-runtime.mjs';

const manifest={storyType:'token-sequence',evidence:[{id:'e1'}],scenes:[{id:'s1',type:'market-hook'},{id:'s2',type:'market-sequence'},{id:'s3',type:'coverage-summary'}]};
const bundle={replay:{startTime:1000,endTime:5000},replayEvents:[{id:'a',timestamp:1000},{id:'b',timestamp:3000},{id:'c',timestamp:5000}],candles:[],priceSelection:{mode:'time-only',quoteMint:null,bucketSeconds:null}};

test('token sequence uses bounded market motion and evidence close only',()=>{
  const runtime=buildTokenSequenceSceneRuntime(bundle,manifest);
  assert.equal(runtime.length,3);
  assert.equal(runtime[0].mode,'market-window');
  assert.equal(runtime[1].mode,'market-window');
  assert.equal(runtime[2].mode,'evidence-close');
  assert.deepEqual(runtime[1].eventIds,['a','b','c']);
  assert.equal(runtime[1].quoteMint,null);
});

test('price overlay is present only after an explicit quote-pair selection',()=>{
  const runtime=buildTokenSequenceSceneRuntime({...bundle,priceSelection:{mode:'indexed-quote-pair',quoteMint:'So11111111111111111111111111111111111111112',bucketSeconds:300},candles:[{timestamp:1000,close:1}]},manifest);
  assert.equal(runtime[1].quoteMint,'So11111111111111111111111111111111111111112');
  assert.equal(runtime[1].bucketSeconds,300);
  assert.equal(runtime[1].candleCount,1);
});

test('other story families receive no token runtime',()=>{
  assert.deepEqual(buildTokenSequenceSceneRuntime(bundle,{...manifest,storyType:'wallet-timeline'}),[]);
});
