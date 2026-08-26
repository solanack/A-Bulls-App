import test from 'node:test';
import assert from 'node:assert/strict';
import { externalRetrievalEnabled, normalizeRetrievalTaskInput } from './intelligence-retrieval-tasks.mjs';

test('external retrieval requires both mesh and external retrieval flags',()=>{
  assert.equal(externalRetrievalEnabled({INTELLIGENCE_MESH_ENABLED:'true',INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED:'true'}),true);
  assert.equal(externalRetrievalEnabled({INTELLIGENCE_MESH_ENABLED:'true'}),false);
  assert.equal(externalRetrievalEnabled({INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED:'true'}),false);
});

test('normalizes bounded public-wallet retrieval coordinates',()=>{
  const task=normalizeRetrievalTaskInput({
    wallet:'11111111111111111111111111111111',
    source:'archive-a',sourceKind:'old-faithful',requestedFrom:100,requestedTo:200,indexJobId:7
  });
  assert.deepEqual(task,{wallet:'11111111111111111111111111111111',source:'archive-a',sourceKind:'old-faithful',requestedFrom:100,requestedTo:200,indexJobId:7});
  assert.equal(Object.isFrozen(task),true);
});

test('rejects unsupported transport kinds and invalid windows',()=>{
  assert.throws(()=>normalizeRetrievalTaskInput({wallet:'11111111111111111111111111111111',sourceKind:'rpc',from:100,to:200}),/unsupported_source_kind/);
  assert.throws(()=>normalizeRetrievalTaskInput({wallet:'11111111111111111111111111111111',sourceKind:'substreams',from:200,to:100}),/valid_requested_window_required/);
});
