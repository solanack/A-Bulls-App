import test from 'node:test';
import assert from 'node:assert/strict';
import {FieldInvestigationTrail} from './field-investigation-trail.mjs';

test('moves backward and forward through exact field focus history',()=>{
  const trail=new FieldInvestigationTrail();
  trail.visit({focusId:'wallet-a',focusKind:'wallet'});trail.visit({focusId:'tx-b',focusKind:'transaction'});trail.visit({focusId:'token-c',focusKind:'token'});
  assert.deepEqual(trail.back(),{focusId:'tx-b',focusKind:'transaction'});
  assert.deepEqual(trail.back(),{focusId:'wallet-a',focusKind:'wallet'});
  assert.equal(trail.back(),null);
  assert.deepEqual(trail.forward(),{focusId:'tx-b',focusKind:'transaction'});
});

test('a new visit after back discards the abandoned forward path',()=>{
  const trail=new FieldInvestigationTrail();trail.visit({focusId:'a'});trail.visit({focusId:'b'});trail.back();trail.visit({focusId:'c'});
  assert.equal(trail.forward(),null);assert.equal(trail.state().depth,2);assert.equal(trail.current().focusId,'c');
});

test('deduplicates the current focus and bounds retained navigation state',()=>{
  const trail=new FieldInvestigationTrail({limit:2});trail.visit({focusId:'a'});trail.visit({focusId:'a'});trail.visit({focusId:'b'});trail.visit({focusId:'c'});
  assert.equal(trail.state().depth,2);assert.deepEqual(trail.back(),{focusId:'b',focusKind:'entity'});
});
