import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTricksterRequest } from './intelligence-trickster-router.mjs';

const endpoint='https://example.test/api/intelligence/trickster/validate';
const validManifest={
  id:'story-1',
  storyType:'transaction-replay',
  subject:{kind:'transaction',id:'sig-1'},
  coverage:{from:100,to:200,verifiedPercent:100,statement:'Selected evidence is verified.'},
  evidence:[{id:'receipt-1',signature:'sig-1',slot:123,blockTime:150,source:'solana-rpc'}],
  claims:[{id:'claim-1',kind:'observed',statement:'The transaction was observed.',evidenceIds:['receipt-1']}],
  scenes:[{id:'scene-1',type:'evidence',durationFrames:60,claimIds:['claim-1']}],
  output:{aspectRatio:'9:16',rendererVersion:'trickster-v1'}
};

const post=(body,env={TRICKSTER_STUDIO_ENABLED:'true'})=>
  handleTricksterRequest(new Request(endpoint,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:typeof body==='string'?body:JSON.stringify(body)
  }),env);

test('Trickster validation is fail-closed',async()=>{
  const response=await post(validManifest,{});
  assert.equal(response.status,404);
  assert.equal((await response.json()).error,'feature_disabled');
});

test('validates evidence-backed manifests without persistence',async()=>{
  const response=await post(validManifest);
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.ok,true);
  assert.equal(body.persisted,false);
  assert.equal(body.manifest.claims[0].evidenceIds[0],'receipt-1');
});

test('rejects unsupported claims and malformed JSON',async()=>{
  const unsupported=structuredClone(validManifest);
  unsupported.claims[0].evidenceIds=['missing'];
  assert.equal((await post(unsupported)).status,400);
  const malformed=await post('{');
  assert.equal(malformed.status,400);
  assert.equal((await malformed.json()).error,'invalid_json');
});

test('does not accept reads or unrelated routes',async()=>{
  const get=await handleTricksterRequest(new Request(endpoint),{TRICKSTER_STUDIO_ENABLED:'true'});
  assert.equal(get.status,405);
  const unrelated=await handleTricksterRequest(new Request('https://example.test/api/other'),{TRICKSTER_STUDIO_ENABLED:'true'});
  assert.equal(unrelated,null);
});
