import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWalletComparisonRenderPlan, walletComparisonRenderStateAtFrame } from './wallet-comparison-render-plan.mjs';

const timeline={scenes:[{id:'hook',type:'comparison-hook',startFrame:0,endFrame:9,durationFrames:10},{id:'replay',type:'synchronized-trade-replay',startFrame:10,endFrame:19,durationFrames:10}]};
const runtime=[{sceneId:'hook',mode:'comparison-summary',walletA:'A',walletB:'B'},{sceneId:'replay',mode:'comparison-replay',walletA:'A',walletB:'B',startTime:1000,endTime:2000,eventIds:['a','b']}];

test('comparison render plan preserves scene frames and identities',()=>{
  const plan=buildWalletComparisonRenderPlan(timeline,runtime);
  assert.equal(plan[1].walletA,'A');assert.equal(plan[1].walletB,'B');assert.deepEqual(plan[1].eventIds,['a','b']);
});

test('comparison render state interpolates chain time deterministically',()=>{
  const plan=buildWalletComparisonRenderPlan(timeline,runtime),state=walletComparisonRenderStateAtFrame(plan,14);
  assert.equal(state.mode,'comparison-replay');assert.equal(state.progress,4/9);assert.ok(state.chainTime>1400&&state.chainTime<1500);
});
