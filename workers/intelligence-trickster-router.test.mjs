import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTricksterRequest } from './intelligence-trickster-router.mjs';

const endpoint='https://example.test/api/intelligence/trickster/validate';
const shareEndpoint='https://example.test/api/intelligence/trickster/share';
const activityEndpoint='https://example.test/api/intelligence/trickster/activity';
const trendingEndpoint='https://example.test/api/intelligence/trickster/trending';
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
function fakeDb(){
  const rows=new Map(),indexRows=new Map(),activity=[];
  return{rows,indexRows,activity,prepare(sql){return{bind(...args){return{
    async run(){
      if(/INSERT OR IGNORE INTO trickster_share_manifests/.test(sql)){const[id,manifestJson,disclosuresJson,expiresAt]=args;if(!rows.has(id))rows.set(id,{id,manifest_json:manifestJson,disclosures_json:disclosuresJson,created_at:100,expires_at:expiresAt});return{meta:{changes:1}};}
      if(/INSERT INTO research_index_objects/.test(sql)){indexRows.set(args[0],{id:args[0],kind:args[1],source_kind:args[7],source_ref:args[8]});return{meta:{changes:1}};}
      if(/INSERT INTO trickster_cut_activity/.test(sql)){activity.push({cut_id:args[0],event_kind:args[1],occurred_at:200});return{meta:{changes:1}};}
      if(/DELETE FROM trickster_share_manifests/.test(sql))return{meta:{changes:0}};
      return{meta:{changes:0}};
    },
    async first(){if(/SELECT id FROM trickster_share_manifests/.test(sql)||/FROM trickster_share_manifests/.test(sql))return rows.get(args[0])||null;return null;},
    async all(){
      if(/JOIN trickster_cut_activity/.test(sql)){const out=[];for(const row of rows.values()){const events=activity.filter(item=>item.cut_id===row.id),views=events.filter(item=>item.event_kind==='view').length,shares=events.filter(item=>item.event_kind==='share').length;if(!events.length)continue;out.push({...row,view_count:views,share_count:shares,last_activity_at:Math.max(...events.map(item=>item.occurred_at))});}out.sort((a,b)=>b.share_count-a.share_count||b.view_count-a.view_count||b.last_activity_at-a.last_activity_at);return{results:out.slice(0,args.at(-1)??12)};}
      return{results:[]};
    }
  };}};}};
}

test('Trickster validation is fail-closed',async()=>{const response=await post(validManifest,{});assert.equal(response.status,404);assert.equal((await response.json()).error,'feature_disabled');});

test('validates evidence-backed manifests without persistence',async()=>{const response=await post(validManifest);const body=await response.json();assert.equal(response.status,200);assert.equal(body.ok,true);assert.equal(body.persisted,false);assert.equal(body.manifest.claims[0].evidenceIds[0],'receipt-1');});

test('rejects unsupported claims and malformed JSON',async()=>{const unsupported=structuredClone(validManifest);unsupported.claims[0].evidenceIds=['missing'];assert.equal((await post(unsupported)).status,400);const malformed=await post('{');assert.equal(malformed.status,400);assert.equal((await malformed.json()).error,'invalid_json');});

test('does not accept reads or unrelated routes',async()=>{const get=await handleTricksterRequest(new Request(endpoint),{TRICKSTER_STUDIO_ENABLED:'true'});assert.equal(get.status,405);const unrelated=await handleTricksterRequest(new Request('https://example.test/api/other'),{TRICKSTER_STUDIO_ENABLED:'true'});assert.equal(unrelated,null);});

test('sharing stays disabled unless separately authorized by feature flag',async()=>{const response=await handleTricksterRequest(new Request(shareEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(validManifest)}),{TRICKSTER_STUDIO_ENABLED:'true'});assert.equal(response.status,404);assert.equal((await response.json()).error,'feature_disabled');});

test('publishes and retrieves the exact frozen validated manifest',async()=>{const db=fakeDb(),env={TRICKSTER_STUDIO_ENABLED:'true',TRICKSTER_SHARE_ENABLED:'true',INTELLIGENCE_DB:db};const publish=await handleTricksterRequest(new Request(shareEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(validManifest)}),env);assert.equal(publish.status,200);const published=await publish.json();assert.match(published.shareId,/^[a-f0-9]{24}$/);assert.equal(published.frozen,true);assert.equal(published.shareUrl,`/?cut=${published.shareId}`);assert.equal(published.verifyUrl,published.shareUrl);assert.equal(db.rows.size,1);assert.equal(db.indexRows.get(`cut:${published.shareId}`)?.kind,'cut');const read=await handleTricksterRequest(new Request(`${shareEndpoint}/${published.shareId}`),env);assert.equal(read.status,200);const shared=await read.json();assert.equal(shared.frozen,true);assert.equal(shared.manifest.id,'story-1');assert.equal(shared.manifest.evidence[0].id,'receipt-1');assert.equal(shared.verifyUrl,`/?cut=${published.shareId}`);});


test('records anonymous Cut activity and returns deterministic trending counts',async()=>{
  const db=fakeDb(),env={TRICKSTER_STUDIO_ENABLED:'true',TRICKSTER_SHARE_ENABLED:'true',INTELLIGENCE_DB:db};
  const publish=await handleTricksterRequest(new Request(shareEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(validManifest)}),env);
  const frozen=await publish.json();
  for(const kind of ['view','view','share']){
    const response=await handleTricksterRequest(new Request(activityEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shareId:frozen.shareId,kind})}),env);
    assert.equal(response.status,200);
  }
  assert.equal(db.activity.length,3);
  const trending=await handleTricksterRequest(new Request(trendingEndpoint),env),body=await trending.json();
  assert.equal(trending.status,200);
  assert.equal(body.items.length,1);
  assert.equal(body.items[0].shareCount,1);
  assert.equal(body.items[0].viewCount,2);
  assert.equal(body.items[0].verifyUrl,`/?cut=${frozen.shareId}`);
});

test('Trending Cuts stays honestly empty without retained activity',async()=>{
  const db=fakeDb(),env={TRICKSTER_STUDIO_ENABLED:'true',TRICKSTER_SHARE_ENABLED:'true',INTELLIGENCE_DB:db};
  const response=await handleTricksterRequest(new Request(trendingEndpoint),env),body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.coverage,'empty');
  assert.deepEqual(body.items,[]);
  assert.match(body.disclosure,/Nothing was promoted as trending/);
});

test('Cut activity rejects unsupported kinds and unknown share ids',async()=>{
  const db=fakeDb(),env={TRICKSTER_STUDIO_ENABLED:'true',TRICKSTER_SHARE_ENABLED:'true',INTELLIGENCE_DB:db};
  let response=await handleTricksterRequest(new Request(activityEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shareId:'a'.repeat(24),kind:'like'})}),env);
  assert.equal(response.status,400);
  response=await handleTricksterRequest(new Request(activityEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shareId:'a'.repeat(24),kind:'view'})}),env);
  assert.equal(response.status,404);
});
