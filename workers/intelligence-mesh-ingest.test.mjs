import test from 'node:test';
import assert from 'node:assert/strict';
import { universeObservationsForEvents } from './intelligence-mesh-ingest.mjs';

test('live normalized events become explicit receipt-backed field entities',()=>{
  const observations=universeObservationsForEvents([{
    signature:'sig-1',wallet:'11111111111111111111111111111111',mint:'22222222222222222222222222222222',programId:'33333333333333333333333333333333',
    blockTime:100,slot:9,eventClass:'swap-like',tokenDelta:42,source:'yellowstone'
  }]);
  assert.deepEqual(new Set(observations.map(item=>item.entityKind)),new Set(['transaction','wallet','token','program']));
  assert.equal(observations.every(item=>item.evidence.signature==='sig-1'),true);
  const relations=observations[0].evidence.relations;
  assert.equal(relations.length,3);
  assert.equal(relations.every(item=>item.sourceId==='sig-1'&&item.evidenceId==='sig-1'),true);
});

test('events without chain time or receipt do not enter the live field',()=>{
  assert.deepEqual(universeObservationsForEvents([{wallet:'wallet-1',source:'rpc'}]),[]);
});

test('verified ingest preserves verified relation presentation state',()=>{
  const [observation]=universeObservationsForEvents([{signature:'sig-2',wallet:'11111111111111111111111111111111',blockTime:101,source:'old-faithful'}],{verified:true});
  assert.equal(observation.commitment,'verified');
  assert.equal(observation.evidence.relations[0].verificationState,'verified');
});


