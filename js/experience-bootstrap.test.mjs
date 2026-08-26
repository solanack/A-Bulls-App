import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldCommandRequest } from './experience-bootstrap.mjs';

const hub=Object.freeze({
  focusId:'wallet-a',
  focusKind:'wallet',
  nodes:Object.freeze([{id:'wallet-a',verificationState:'verified'}]),
  edges:Object.freeze([{evidenceId:'sig-1'},{evidenceId:'sig-2'},{evidenceId:''}])
});

test('field investigation actions preserve exact focus and receipts',()=>{
  assert.deepEqual(fieldCommandRequest('replay',{investigationHub:hub,focusId:'wallet-a'}),{
    destination:'replay',query:'wallet-a',entityId:'wallet-a',entityKind:'wallet',
    verificationState:'verified',evidenceIds:['sig-1','sig-2']
  });
});

test('What If context remains explicitly simulated',()=>{
  const request=fieldCommandRequest('what-if',{investigationHub:hub,simulation:true});
  assert.equal(request.destination,'what-if');
  assert.equal(request.simulation,true);
});

test('ordinary field commands do not invent entity context',()=>{
  assert.deepEqual(fieldCommandRequest('sequences'),{destination:'market-sequence'});
});
