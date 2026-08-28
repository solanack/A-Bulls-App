import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenSequenceScenePlan, summarizeTokenSequenceDirection } from './token-sequence-director.mjs';

const bundle={storyType:'token-sequence',claims:[
  {id:'sequence-first-event'},{id:'sequence-phase-1'},{id:'sequence-phase-transition-1'},{id:'sequence-largest-token-delta'},{id:'sequence-direction-mix'}
],marketReplay:{reconstruction:{disclosure:'evidence only',beats:[
  {id:'opening-event',title:'First observed event',statement:'first'},
  {id:'phase-1',title:'PHASE 1',statement:'phase one'},
  {id:'phase-transition-1',title:'PHASE 1 → PHASE 2',statement:'transition'},
  {id:'largest-token-delta',title:'Largest observed token delta',statement:'largest'},
  {id:'explicit-price-aftermath',title:'Selected quote-market movement',statement:'price'},
  {id:'direction-mix',title:'Observed direction mix',statement:'mix'},
  {id:'evidence-close',title:'Evidence close',statement:'close'}
]}}};

test('scene plan includes only reconstruction beats with supported claims',()=>{
  const plan=tokenSequenceScenePlan(bundle);
  assert.deepEqual(plan.map(scene=>scene.type),['sequence-opening','market-phase','phase-transition','largest-observed-trade','direction-mix','evidence-summary']);
  assert.equal(plan.find(scene=>scene.type==='market-phase').claimIds[0],'sequence-phase-1');
  assert.equal(plan.find(scene=>scene.type==='phase-transition').claimIds[0],'sequence-phase-transition-1');
  assert.equal(plan.some(scene=>scene.type==='selected-price-movement'),false);
});

test('direction summary preserves ordered reconstruction and dynamic phase claims',()=>{
  const summary=summarizeTokenSequenceDirection(bundle);
  assert.equal(summary.title,'RECONSTRUCTED MARKET SEQUENCE');
  assert.equal(summary.beats[0].title,'First observed event');
  assert.deepEqual(summary.beats.find(beat=>beat.id==='phase-1').claimIds,['sequence-phase-1']);
  assert.deepEqual(summary.beats.find(beat=>beat.id==='phase-transition-1').claimIds,['sequence-phase-transition-1']);
  assert.equal(summary.disclosure,'evidence only');
});
