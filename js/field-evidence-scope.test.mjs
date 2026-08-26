import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldEvidenceScope,matchFieldEvidenceScope} from './field-evidence-scope.mjs';

test('normalizes exact field evidence without losing simulation state',()=>{
  const scope=fieldEvidenceScope({destination:'what-if',entityId:'wallet-a',entityKind:'wallet',verificationState:'verified',simulation:true,evidenceIds:['sig-1','sig-1','sig-2']});
  assert.deepEqual(scope.evidenceIds,['sig-1','sig-2']);
  assert.equal(scope.simulation,true);
  assert.equal(scope.active,true);
});

test('matches receipts by exact normalized event identity',()=>{
  const scope=fieldEvidenceScope({evidenceIds:['sig-1','event-2']});
  const result=matchFieldEvidenceScope([{id:'event-1',signature:'sig-1'},{id:'event-2'},{id:'sig'}],scope);
  assert.equal(result.state,'matched');
  assert.deepEqual(result.matched,['sig-1','event-2']);
  assert.equal(result.matchedEvents.length,2);
});

test('missing receipts describe bounded bundle coverage, never no activity',()=>{
  const result=matchFieldEvidenceScope([{id:'event-1'}],fieldEvidenceScope({evidenceIds:['missing']}));
  assert.equal(result.state,'not-in-bundle');
  assert.deepEqual(result.missing,['missing']);
  assert.match(result.disclosure,/does not mean no activity exists/i);
});
