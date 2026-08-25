import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWalletComparisonFrameModel } from './wallet-comparison-frame-model.mjs';

const manifest={coverage:{verifiedPercent:90,statement:'Indexed comparison coverage.'},evidence:[{id:'e1'}],claims:[{id:'c1',kind:'calculated',statement:'A had more trades.'}],scenes:[{id:'summary',type:'comparison-hook',claimIds:[]},{id:'replay',type:'synchronized-trade-replay',claimIds:[]},{id:'metrics',type:'calculated-differences',claimIds:['c1']}]};
const plan=[{sceneId:'summary',type:'comparison-hook',mode:'comparison-summary',startFrame:0,endFrame:9,durationFrames:10,walletA:'A',walletB:'B',chainTimeFrom:null,chainTimeTo:null},{sceneId:'replay',type:'synchronized-trade-replay',mode:'comparison-replay',startFrame:10,endFrame:19,durationFrames:10,walletA:'A',walletB:'B',chainTimeFrom:1000,chainTimeTo:3000},{sceneId:'metrics',type:'calculated-differences',mode:'comparison-metrics',startFrame:20,endFrame:29,durationFrames:10,walletA:'A',walletB:'B',chainTimeFrom:null,chainTimeTo:null}];
const bundle={replay:{events:[{id:'a1',wallet:'A',timestamp:1000,side:'buy'},{id:'b1',wallet:'B',timestamp:2500,side:'sell'}]},comparison:{walletA:{wallet:'A',tradeCount:2},walletB:{wallet:'B',tradeCount:1},timing:{firstTradeGapMs:1500},disclosure:'Observed window only.'}};

test('comparison replay reveals each wallet lane only through current chain time',()=>{
  const early=buildWalletComparisonFrameModel({bundle,manifest,renderPlan:plan},14);
  assert.deepEqual(early.walletA.events.map(event=>event.id),['a1']);assert.deepEqual(early.walletB.events.map(event=>event.id),[]);
  const late=buildWalletComparisonFrameModel({bundle,manifest,renderPlan:plan},19);
  assert.deepEqual(late.walletB.events.map(event=>event.id),['b1']);
});

test('comparison metrics retain evidence-backed claims without replay motion',()=>{
  const model=buildWalletComparisonFrameModel({bundle,manifest,renderPlan:plan},25);
  assert.equal(model.scene.mode,'comparison-metrics');assert.equal(model.walletA.events.length,0);assert.deepEqual(model.claims.map(claim=>claim.id),['c1']);
});

test('ordinary comparison has no simulation events',()=>{
  const model=buildWalletComparisonFrameModel({bundle,manifest,renderPlan:plan},25);
  assert.equal(model.simulation.active,false);assert.deepEqual(model.simulation.events,[]);
});
