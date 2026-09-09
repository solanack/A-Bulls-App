import test from 'node:test';
import assert from 'node:assert/strict';
import { streamCoveragePlan, __fullChainStreamContract } from './intelligence-full-chain-stream.mjs';

test('full-chain bridge is bounded and read-only',()=>{assert.equal(__fullChainStreamContract.readOnly,true);assert.equal(__fullChainStreamContract.providerFetches,false);assert.ok(__fullChainStreamContract.sourceKinds.includes('yellowstone'));assert.ok(__fullChainStreamContract.sourceKinds.includes('carbon'));assert.equal(__fullChainStreamContract.maxEvents,500);});
test('observed batches advance observed slot but never verified slot',()=>{const plan=streamCoveragePlan({last_observed_slot:100,last_verified_slot:90},[{slot:101},{slot:102}],false);assert.equal(plan.lastObservedSlot,102);assert.equal(plan.lastVerifiedSlot,90);assert.equal(plan.gap,null);});
test('verified batches explicitly advance verified-through coverage',()=>{const plan=streamCoveragePlan({last_observed_slot:100,last_verified_slot:90},[{slot:101},{slot:102}],true);assert.equal(plan.lastObservedSlot,102);assert.equal(plan.lastVerifiedSlot,102);});
test('slot discontinuity becomes an explicit repair gap',()=>{const plan=streamCoveragePlan({last_observed_slot:100,last_verified_slot:90},[{slot:105},{slot:106}],false);assert.deepEqual(plan.gap,{from:101,to:104});assert.equal(plan.lastObservedSlot,106);assert.equal(plan.lastVerifiedSlot,90);});
