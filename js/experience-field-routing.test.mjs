import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldCommandRequest } from './experience-bootstrap.mjs';

const wallet='11111111111111111111111111111111';
const hub=Object.freeze({focusId:wallet,focusKind:'wallet',nodes:Object.freeze([{id:wallet,verificationState:'verified'}]),edges:Object.freeze([{evidenceId:'sig-a'},{evidenceId:'sig-b'}])});

test('wallet investigation actions retain exact focus and evidence membership',()=>{
  const request=fieldCommandRequest('replay',{investigationHub:hub,focusId:wallet,focusKind:'wallet'});
  assert.equal(request.destination,'replay');
  assert.equal(request.query,wallet);
  assert.equal(request.entityId,wallet);
  assert.equal(request.entityKind,'wallet');
  assert.equal(request.kind,'solana-address');
  assert.equal(request.verificationState,'verified');
  assert.deepEqual(request.evidenceIds,['sig-a','sig-b']);
});

test('transaction focus is routed as an exact signature rather than guessed address',()=>{
  const request=fieldCommandRequest('evidence',{focusId:'transaction-signature-value',focusKind:'transaction'});
  assert.equal(request.kind,'transaction-signature');
  assert.equal(request.entityKind,'transaction');
});

test('What If remains structurally marked as simulation',()=>{
  const request=fieldCommandRequest('what-if',{investigationHub:hub});
  assert.equal(request.simulation,true);
});

test('unknown non-address field entities do not masquerade as Solana addresses',()=>{
  const request=fieldCommandRequest('compare',{focusId:'cluster:bounded-1',focusKind:'cluster'});
  assert.equal(request.kind,'field-entity');
});
