import test from 'node:test';
import assert from 'node:assert/strict';
import { walletComparisonScenePlan, buildWalletComparisonSceneRuntime } from './wallet-comparison-story-runtime.mjs';

const base={storyType:'wallet-comparison',claims:[{id:'observed',kind:'observed'},{id:'calc',kind:'calculated'}],replay:{startTime:1000,endTime:4000,events:[{id:'a',timestamp:1000},{id:'b',timestamp:3000}]},comparison:{walletA:{wallet:'A'},walletB:{wallet:'B'}}};

test('comparison scene plan omits what-if without explicit simulation evidence',()=>{
  assert.deepEqual(walletComparisonScenePlan(base).map(scene=>scene.type),['comparison-hook','synchronized-trade-replay','calculated-differences']);
});

test('comparison scene plan includes what-if only when explicit simulation payload exists',()=>{
  const withSimulation={...base,whatIf:{events:[{id:'what-1'}],disclosure:'Simulation only.'},claims:[...base.claims,{id:'sim',kind:'inferred'}]};
  const plan=walletComparisonScenePlan(withSimulation);
  assert.equal(plan.at(-1).type,'what-if-replay');
  assert.deepEqual(plan.at(-1).claimIds,['sim']);
});

test('runtime preserves wallet identities and synchronized replay range',()=>{
  const manifest={scenes:walletComparisonScenePlan(base)};
  const runtime=buildWalletComparisonSceneRuntime(base,manifest);
  const replay=runtime.find(item=>item.mode==='comparison-replay');
  assert.equal(replay.walletA,'A');assert.equal(replay.walletB,'B');assert.equal(replay.startTime,1000);assert.equal(replay.endTime,4000);assert.deepEqual(replay.eventIds,['a','b']);
});
