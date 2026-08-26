import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldInvestigationHopRequest } from './field-shell.mjs';

test('builds an exact receipt-backed field hop request',()=>{
  const request=fieldInvestigationHopRequest({id:'tx-exact',kind:'transaction',evidenceIds:['sig-1','sig-2']});
  assert.deepEqual(request,{source:'field-investigation-hop',query:'tx-exact',entityId:'tx-exact',entityKind:'transaction',evidenceIds:['sig-1','sig-2']});
  assert.equal(Object.isFrozen(request),true);
  assert.equal(Object.isFrozen(request.evidenceIds),true);
});

test('refuses navigation without an exact loaded identity and receipt',()=>{
  assert.equal(fieldInvestigationHopRequest({id:'tx-exact',kind:'transaction'}),null);
  assert.equal(fieldInvestigationHopRequest({id:'',kind:'transaction',evidenceIds:['sig-1']}),null);
  assert.equal(fieldInvestigationHopRequest({id:'tx-exact',kind:'',evidenceIds:['sig-1']}),null);
});
