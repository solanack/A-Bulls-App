import test from 'node:test';
import assert from 'node:assert/strict';
import { publishStoryManifest,fetchStoryShare,storyShareUrl } from './trickster-share-client.mjs';

const jsonResponse=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

test('publishes a validated manifest to the frozen share endpoint',async()=>{
  let request=null;
  const result=await publishStoryManifest({id:'story-1'},{apiBase:'https://example.test/',fetchImpl:async(url,init)=>{request={url,init};return jsonResponse({ok:true,shareId:'abcdef0123456789abcdef01',expiresAt:123,manifest:{id:'story-1'},disclosures:[]});}});
  assert.equal(request.url,'https://example.test/api/intelligence/trickster/share');
  assert.equal(request.init.method,'POST');
  assert.equal(result.shareId,'abcdef0123456789abcdef01');
});

test('fetches a frozen share by exact content id',async()=>{
  const result=await fetchStoryShare('abcdef0123456789abcdef01',{apiBase:'https://example.test',fetchImpl:async url=>{assert.equal(url,'https://example.test/api/intelligence/trickster/share/abcdef0123456789abcdef01');return jsonResponse({ok:true,frozen:true,manifest:{id:'story-1'},disclosures:['bounded'],createdAt:10,expiresAt:20});}});
  assert.equal(result.frozen,true);
  assert.equal(result.manifest.id,'story-1');
});

test('rejects malformed share ids before network access',async()=>{
  await assert.rejects(()=>fetchStoryShare('not-a-share-id',{fetchImpl:async()=>{throw new Error('should_not_fetch');}}),/valid share id is required/);
});

test('builds same-origin read-only share URL',()=>{
  assert.equal(storyShareUrl('abcdef0123456789abcdef01',{origin:'https://abullsapp.com/'}),'https://abullsapp.com/share.html?id=abcdef0123456789abcdef01');
});
