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

test('reconstructed scenes focus only the evidence assigned to each beat',()=>{
  const reconstructed={...bundle,marketReplay:{reconstruction:{beats:[
    {id:'opening-event',timestamp:1000,evidenceIds:['a']},
    {id:'participation-expansion',timestamp:3000,evidenceIds:['a','b']},
    {id:'largest-token-delta',timestamp:5000,evidenceIds:['c']},
    {id:'evidence-close',timestamp:5000,evidenceIds:['a','b','c']}
  ]}}};
  const reconstructedManifest={storyType:'token-sequence',evidence:[{id:'e1'}],scenes:[
    {id:'sequence-opening-event',type:'sequence-opening'},
    {id:'sequence-participation-expansion',type:'participation-expansion'},
    {id:'sequence-largest-token-delta',type:'largest-observed-trade'},
    {id:'sequence-evidence-close',type:'evidence-summary'}
  ]};
  const runtime=buildTokenSequenceSceneRuntime(reconstructed,reconstructedManifest);
  assert.equal(runtime[0].mode,'focus-event');
  assert.equal(runtime[0].focusId,'a');
  assert.deepEqual(runtime[1].eventIds,['a','b']);
  assert.equal(runtime[1].to,3000);
  assert.deepEqual(runtime[2].eventIds,['c']);
  assert.equal(runtime[3].mode,'evidence-close');
});

test('selected price-movement scene fails closed without explicit quote selection',()=>{
  const reconstructed={...bundle,marketReplay:{reconstruction:{beats:[{id:'explicit-price-aftermath',timestamp:5000,evidenceIds:[]}]}}};
  const priceManifest={storyType:'token-sequence',evidence:[{id:'e1'}],scenes:[{id:'sequence-explicit-price-aftermath',type:'selected-price-movement'}]};
  assert.equal(buildTokenSequenceSceneRuntime(reconstructed,priceManifest)[0].mode,'evidence-close');
  const withPrice={...reconstructed,priceSelection:{mode:'indexed-quote-pair',quoteMint:'Quote111111111111111111111111111111111',bucketSeconds:60},candles:[{timestamp:1000,close:1},{timestamp:5000,close:2}]};
  assert.equal(buildTokenSequenceSceneRuntime(withPrice,priceManifest)[0].mode,'price-aftermath');
});

test('other story families receive no token runtime',()=>{
  assert.deepEqual(buildTokenSequenceSceneRuntime(bundle,{...manifest,storyType:'wallet-timeline'}),[]);
});
