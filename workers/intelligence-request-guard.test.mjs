import test from 'node:test';
import assert from 'node:assert/strict';
import {guardIntelligenceRequest,__intelligenceRequestGuardContract} from './intelligence-request-guard.mjs';

test('ignores non-intelligence routes',async()=>{
  assert.equal(await guardIntelligenceRequest(new Request('https://example.com/api/health')),null);
});

test('rejects oversized declared Intelligence bodies',async()=>{
  const request=new Request('https://example.com/api/intelligence/replay-bundle',{method:'POST',headers:{'content-length':String(__intelligenceRequestGuardContract.maxBodyBytes+1)}});
  const response=await guardIntelligenceRequest(request,{});
  assert.equal(response.status,413);
  assert.equal((await response.json()).error,'request_body_too_large');
});

test('returns retryable 429 when the configured Cloudflare limiter denies a request',async()=>{
  const env={RATE_LIMITER:{limit:async()=>({success:false})}};
  const response=await guardIntelligenceRequest(new Request('https://example.com/api/intelligence/mesh-status'),env);
  assert.equal(response.status,429);
  assert.equal(response.headers.get('retry-after'),'60');
});

test('allows bounded requests when the configured limiter succeeds',async()=>{
  const env={RATE_LIMITER:{limit:async()=>({success:true})}};
  assert.equal(await guardIntelligenceRequest(new Request('https://example.com/api/intelligence/mesh-status'),env),null);
});


