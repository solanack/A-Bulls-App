import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTricksterRequest } from './intelligence-trickster-router.mjs';

const endpoint='https://example.test/api/intelligence/trickster/validate';
const shareEndpoint='https://example.test/api/intelligence/trickster/share';
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

const post=(body,env={TRICKSTER_STUDIO_ENABLED:'true'})=>handleTricksterRequest(new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)}),env);
function fakeDb(){const rows=new Map();return{rows,prepare(sql){return{bind(...args){return{async run(){if(/INSERT OR IGNORE INTO trickster_share_manifests/.test(sql)){const[id,manifestJson,disclosuresJson,expiresAt]=args;if(!rows.has(id))rows.set(id,{id,manifest_json:manifestJson,disclosures_json:disclosuresJson,created_at:100,expires_at:expiresAt});return{meta:{changes:1}};}if(/DELETE FROM trickster_share_manifests/.test(sql)){return{meta:{changes:0}};}return{meta:{changes:0}};},async first(){if(/FROM trickster_share_manifests/.test(sql))return rows.get(args[0])||null;return null;}};}};}};}

test('Trickster validation is fail-closed',async()=>{const response=await post(validManifest,{});assert.equal(response.status,404);assert.equal((await response.json()).error,'feature_disabled');});

test('validates evidence-backed manifests without persistence',async()=>{const response=await post(validManifest);const body=await response.json();assert.equal(response.status,200);assert.equal(body.ok,true);assert.equal(body.persisted,false);assert.equal(body.manifest.claims[0].evidenceIds[0],'receipt-1');});

test('rejects unsupported claims and malformed JSON',async()=>{const unsupported=structuredClone(validManifest);unsupported.claims[0].evidenceIds=['missing'];assert.equal((await post(unsupported)).status,400);const malformed=await post('{');assert.equal(malformed.status,400);assert.equal((await malformed.json()).error,'invalid_json');});

test('does not accept reads or unrelated routes',async()=>{const get=await handleTricksterRequest(new Request(endpoint),{TRICKSTER_STUDIO_ENABLED:'true'});assert.equal(get.status,405);const unrelated=await handleTricksterRequest(new Request('https://example.test/api/other'),{TRICKSTER_STUDIO_ENABLED:'true'});assert.equal(unrelated,null);});

test('sharing stays disabled unless separately authorized by feature flag',async()=>{const response=await handleTricksterRequest(new Request(shareEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(validManifest)}),{TRICKSTER_STUDIO_ENABLED:'true'});assert.equal(response.status,404);assert.equal((await response.json()).error,'feature_disabled');});

test('publishes and retrieves the exact frozen validated manifest',async()=>{const db=fakeDb(),env={TRICKSTER_STUDIO_ENABLED:'true',TRICKSTER_SHARE_ENABLED:'true',BULL_INTELLIGENCE_DB:db};const publish=await handleTricksterRequest(new Request(shareEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(validManifest)}),env);assert.equal(publish.status,200);const published=await publish.json();assert.match(published.shareId,/^[a-f0-9]{24}$/);assert.equal(published.frozen,true);assert.equal(db.rows.size,1);const read=await handleTricksterRequest(new Request(`${shareEndpoint}/${published.shareId}`),env);assert.equal(read.status,200);const shared=await read.json();assert.equal(shared.frozen,true);assert.equal(shared.manifest.id,'story-1');assert.equal(shared.manifest.evidence[0].id,'receipt-1');});


