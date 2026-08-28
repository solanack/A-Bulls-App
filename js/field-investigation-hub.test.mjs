import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFieldInvestigationHub, relationsFromSnapshot } from './field-investigation-hub.mjs';

const wallet=Object.freeze({id:'wallet-a',kind:'wallet',category:'transfer',verificationState:'verified',position:[1,2,3]});
const tx=Object.freeze({id:'tx-b',kind:'transaction',category:'swap',verificationState:'confirmed',position:[4,5,6]});
const token=Object.freeze({id:'token-c',kind:'token',category:'swap',verificationState:'observed',position:[7,8,9]});

test('requires an exact focused entity id',()=>{
  assert.throws(()=>buildFieldInvestigationHub({focusEntity:{}}),/focusEntity\.id is required/);
});

test('never renders a relationship without an evidence receipt',()=>{
  const hub=buildFieldInvestigationHub({focusEntity:wallet,entities:[wallet,tx],relations:[{sourceId:'wallet-a',targetId:'tx-b'}]});
  assert.equal(hub.state,'focus-only');
  assert.equal(hub.evidenceCount,0);
  assert.deepEqual(hub.edges,[]);
  assert.match(hub.disclosure,/does not mean no activity exists/i);
});

test('includes only loaded evidence-backed relationships touching the focus',()=>{
  const hub=buildFieldInvestigationHub({focusEntity:wallet,entities:[wallet,tx,token],relations:[
    {sourceId:'wallet-a',targetId:'tx-b',signature:'sig-1',observedAt:20},
    {sourceId:'tx-b',targetId:'token-c',signature:'sig-2',observedAt:30},
    {sourceId:'wallet-a',targetId:'missing',signature:'sig-3',observedAt:40}
  ]});
  assert.equal(hub.state,'evidence-backed');
  assert.equal(hub.evidenceCount,1);
  assert.equal(hub.edges[0].evidenceId,'sig-1');
  assert.deepEqual(hub.nodes.map(node=>node.id),['wallet-a','tx-b']);
});

test('deduplicates the same receipt connection deterministically',()=>{
  const hub=buildFieldInvestigationHub({focusEntity:wallet,entities:[wallet,tx],relations:[
    {sourceId:'wallet-a',targetId:'tx-b',evidenceId:'e-1',observedAt:30},
    {sourceId:'wallet-a',targetId:'tx-b',evidenceId:'e-1',observedAt:10}
  ]});
  assert.equal(hub.edges.length,1);
});

test('keeps What If explicitly marked as simulation',()=>{
  const hub=buildFieldInvestigationHub({focusEntity:wallet,entities:[wallet]});
  const action=hub.actions.find(item=>item.id==='what-if');
  assert.equal(action.simulation,true);
});

test('reads supported snapshot relation containers without inventing one',()=>{
  const relations=[{sourceId:'wallet-a',targetId:'tx-b',evidenceId:'e-1'}];
  assert.equal(relationsFromSnapshot({relationships:relations}),relations);
  assert.deepEqual(relationsFromSnapshot({particles:[]}),[]);
});

test('preserves the normalized relation kind without interpreting it',()=>{
  const hub=buildFieldInvestigationHub({focusEntity:wallet,entities:[wallet,tx],relations:[
    {sourceId:'wallet-a',targetId:'tx-b',evidenceId:'e-2',relationKind:'program-invocation'}
  ]});
  assert.equal(hub.edges[0].relationKind,'program-invocation');
  assert.deepEqual(hub.nodes.find(node=>node.id==='tx-b').evidenceIds,['e-2']);
  assert.deepEqual(hub.nodes.find(node=>node.id==='tx-b').relationKinds,['program-invocation']);
});
