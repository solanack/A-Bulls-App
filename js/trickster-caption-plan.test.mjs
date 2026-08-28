import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTricksterCaptionPlan, captionAtFrame } from './trickster-caption-plan.mjs';

const manifest={claims:[{id:'obs',kind:'observed',statement:'Trade observed.',evidenceIds:['e']},{id:'sim',kind:'inferred',statement:'Mirrored timing.',evidenceIds:['e'],disclosure:'Simulation only.'}],scenes:[{id:'a',type:'transaction-focus',claimIds:['obs']},{id:'b',type:'what-if-replay',claimIds:['sim']}]};
const timeline={scenes:[{id:'a',type:'transaction-focus',startFrame:0,endFrame:9},{id:'b',type:'what-if-replay',startFrame:10,endFrame:19}]};

test('caption plan labels claim provenance from manifest',()=>{const plan=buildTricksterCaptionPlan(manifest,timeline);assert.equal(plan[0].label,'OBSERVED ON CHAIN');assert.equal(plan[0].text,'Trade observed.');assert.equal(plan[1].label,'SIMULATION');assert.equal(plan[1].disclosure,'Simulation only.');});
test('captionAtFrame returns exact scene caption',()=>{const plan=buildTricksterCaptionPlan(manifest,timeline);assert.equal(captionAtFrame(plan,12).sceneId,'b');assert.equal(captionAtFrame(plan,20),null);});
