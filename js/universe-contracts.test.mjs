import test from 'node:test';
import assert from 'node:assert/strict';
import { destinationForEntity, normalizeUniverseSnapshot } from './universe-contracts.mjs';

const particle={id:'signature-1',kind:'transaction',verificationState:'confirmed',observedAt:1005,category:'swap',magnitudeBand:.5,position:[1,2,3]};
const wallet={id:'wallet-1',kind:'wallet',verificationState:'verified',observedAt:1005,category:'transfer',magnitudeBand:.2,position:[4,5,6]};
const base={windowStart:1000,windowEnd:1010,observedEventCount:20,samplingPolicy:'top activity plus uniform sample',coverageStatement:'20 observed; 2 rendered',sources:['yellowstone'],particles:[particle,wallet]};

test('normalizes a bounded and sourced snapshot',()=>{const result=normalizeUniverseSnapshot(base);assert.equal(result.renderedParticleCount,2);assert.equal(result.particles[0].verificationState,'confirmed');assert.equal(Object.isFrozen(result),true);assert.deepEqual(result.relations,[]);});

test('preserves only loaded relationships with an evidence receipt',()=>{const result=normalizeUniverseSnapshot({...base,relations:[{sourceId:'signature-1',targetId:'wallet-1',evidenceId:'receipt-1',kind:'counterparty',observedAt:1005,verificationState:'verified'},{sourceId:'signature-1',targetId:'missing',evidenceId:'receipt-2'},{sourceId:'signature-1',targetId:'wallet-1'}]});assert.equal(result.relations.length,1);assert.equal(result.relations[0].evidenceId,'receipt-1');assert.equal(result.relations[0].relationKind,'counterparty');assert.equal(result.relations[0].verificationState,'verified');});

test('rejects misleading particle counts',()=>{assert.throws(()=>normalizeUniverseSnapshot({windowStart:1000,windowEnd:1010,observedEventCount:0,samplingPolicy:'none',coverageStatement:'empty',sources:['rpc'],particles:[particle]}),/cannot exceed/);});

test('routes selections without interpreting data',()=>{assert.deepEqual(destinationForEntity(particle),{destination:'transaction',entityKind:'transaction',entityId:'signature-1',verificationState:'confirmed'});});
