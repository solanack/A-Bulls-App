import test from 'node:test';
import assert from 'node:assert/strict';
import { externalRetrievalEnabled, externalRetrievalMaxAttempts, normalizeRetrievalTaskInput, normalizeRetrievalReceipt } from './intelligence-retrieval-tasks.mjs';

test('external retrieval requires both mesh and external retrieval flags',()=>{
  assert.equal(externalRetrievalEnabled({INTELLIGENCE_MESH_ENABLED:'true',INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED:'true'}),true);
  assert.equal(externalRetrievalEnabled({INTELLIGENCE_MESH_ENABLED:'true'}),false);
  assert.equal(externalRetrievalEnabled({INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED:'true'}),false);
});

test('external retry budget is bounded and defaults conservatively',()=>{
  assert.equal(externalRetrievalMaxAttempts({}),4);
  assert.equal(externalRetrievalMaxAttempts({INTELLIGENCE_EXTERNAL_RETRIEVAL_MAX_ATTEMPTS:'2'}),2);
  assert.equal(externalRetrievalMaxAttempts({INTELLIGENCE_EXTERNAL_RETRIEVAL_MAX_ATTEMPTS:'99'}),10);
  assert.equal(externalRetrievalMaxAttempts({INTELLIGENCE_EXTERNAL_RETRIEVAL_MAX_ATTEMPTS:'0'}),4);
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

test('only a verified searched range covering the request satisfies the bounded window',()=>{
  const task={requested_from:100,requested_to:200};
  const full=normalizeRetrievalReceipt({searchedFrom:90,searchedTo:210,rangeVerified:true,observedRows:0},task);
  assert.equal(full.requestedWindowSatisfied,true);
  assert.equal(full.observedRows,0);
  const partial=normalizeRetrievalReceipt({searchedFrom:120,searchedTo:210,rangeVerified:true,observedRows:8},task);
  assert.equal(partial.requestedWindowSatisfied,false);
  const unverified=normalizeRetrievalReceipt({searchedFrom:90,searchedTo:210,rangeVerified:false,observedRows:8},task);
  assert.equal(unverified.requestedWindowSatisfied,false);
});

test('invalid receipt ranges fail closed',()=>{
  const receipt=normalizeRetrievalReceipt({searchedFrom:300,searchedTo:200,rangeVerified:true}, {requestedFrom:100,requestedTo:200});
  assert.equal(receipt.rangeVerified,false);
  assert.equal(receipt.requestedWindowSatisfied,false);
  assert.equal(receipt.searchedFrom,null);
  assert.equal(receipt.searchedTo,null);
});
