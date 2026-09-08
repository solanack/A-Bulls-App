import test from 'node:test';
import assert from 'node:assert/strict';
import { __fieldCompatibilityContract,handleFieldCompatibilityRequest,toFieldSnapshot } from './intelligence-field-compat.mjs';

test('compatibility layer reuses the rich Intelligence database',()=>{
  assert.equal(__fieldCompatibilityContract.usesExistingIntelligenceDb,true);
  assert.equal(__fieldCompatibilityContract.passiveSnapshotsUseIndexedDataOnly,true);
  assert.equal(__fieldCompatibilityContract.queryCacheTable,'bull_intelligence_cache');
  assert.deepEqual(__fieldCompatibilityContract.galaxyMap,{'solana-core':'solana','pump-fun':'pump-fun'});
});

test('backend particles are converted to the Field OS contract without changing origin',()=>{
  const snapshot=toFieldSnapshot('pump-fun',{windowStart:10,windowEnd:20,observedEventCount:1,sources:['helius-pump'],particles:[{id:'mint-a',kind:'token',category:'trade',verificationState:'confirmed',observedAt:15,magnitudeBand:2,position:[1,2,3]}]});
  assert.equal(snapshot.galaxyId,'pump-fun');
  assert.equal(snapshot.particles[0].originGalaxyId,'pump-fun');
  assert.equal(snapshot.particles[0].cosmicKind,'star');
  assert.equal(snapshot.particles[0].category,'swap');
  assert.equal(snapshot.particles[0].magnitudeBand,1);
  assert.equal(snapshot.windowEnd-snapshot.windowStart,10_000);
  assert.equal(snapshot.particles[0].observedAt,15_000);
});

test('millisecond field timestamps are not multiplied again',()=>{
  const now=1_788_842_769_000;
  const snapshot=toFieldSnapshot('solana-core',{windowStart:now-300_000,windowEnd:now,particles:[{observedAt:now}]});
  assert.equal(snapshot.windowEnd-snapshot.windowStart,300_000);
  assert.equal(snapshot.particles[0].observedAt,now);
});

test('field routes remain disabled with the Universe subsystem',async()=>{
  const response=await handleFieldCompatibilityRequest(new Request('https://example.test/api/intelligence/field/snapshot'),{});
  assert.equal(response.status,404);
  assert.equal((await response.json()).error,'feature_disabled');
});

test('unknown galaxies fail closed',async()=>{
  const response=await handleFieldCompatibilityRequest(new Request('https://example.test/api/intelligence/field/snapshot?galaxy=made-up'),{UNIVERSE_ENABLED:'true'});
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'unknown_galaxy');
});
