import assert from 'node:assert/strict';
import test from 'node:test';
import { annotateReasonCodes, configureProviderFetch, honestEmpty, providerFailureReason, providerFetch, providerFetchPolicy, PROVIDER_REASON } from './intelligence-fetch.mjs';

test('provider fetch policy supports provider-specific env overrides',()=>{
  const policy=providerFetchPolicy({PROVIDER_FETCH_TIMEOUT_MS:'6000',FOMOAPI_FETCH_TIMEOUT_MS:'9000',FOMOAPI_FETCH_RETRIES:'2',FOMOAPI_FETCH_BACKOFF_MS:'75'},'fomoapi');
  assert.equal(policy.timeoutMs,9000);
  assert.equal(policy.retries,2);
  assert.equal(policy.backoffMs,75);
});

test('configured provider fetch retries 429 once before succeeding',async()=>{
  const original=globalThis.fetch;let calls=0;
  configureProviderFetch({FOMOAPI_FETCH_TIMEOUT_MS:'1000',FOMOAPI_FETCH_RETRIES:'1',FOMOAPI_FETCH_BACKOFF_MS:'50'});
  globalThis.fetch=async()=>{calls+=1;return calls===1?new Response('{}',{status:429,headers:{'retry-after':'0'}}):new Response('{"ok":true}',{status:200,headers:{'content-type':'application/json'}});};
  try{
    const response=await providerFetch('https://api.fomoapi.io/v2/test');
    assert.equal(response.status,200);
    assert.equal(calls,2);
  }finally{globalThis.fetch=original;configureProviderFetch({});}
});

test('provider failure reasons distinguish empty, timeout, failure, and budget',()=>{
  assert.equal(providerFailureReason('no_exact_quote_market'),PROVIDER_REASON.NO_EVIDENCE);
  assert.equal(providerFailureReason(Object.assign(new Error('timed out'),{name:'TimeoutError'})),PROVIDER_REASON.PROVIDER_TIMEOUT);
  assert.equal(providerFailureReason('fomoapi_http_503'),PROVIDER_REASON.PROVIDER_FAILURE);
  assert.equal(providerFailureReason('fomoapi_budget_blocked'),PROVIDER_REASON.PROVIDER_BUDGET_EXHAUSTED);
  assert.equal(honestEmpty(PROVIDER_REASON.NO_EVIDENCE).available,false);
});

test('reason annotation preserves calm disclosure while adding machine-readable cause',()=>{
  const payload={ok:true,coverage:'empty',items:[],disclosure:'No retained evidence is available yet.',marketHydration:{state:'unavailable',reason:'market_source_error',disclosure:'Historical market hydration is temporarily unavailable.'},budget:{available:false,error:'fomoapi_budget_blocked',disclosure:'This source is temporarily unavailable.'},validation:{coverage:'empty',error:'invalid_token',disclosure:'A valid token is required.'}};
  const normalized=annotateReasonCodes(payload);
  assert.equal(normalized.reason,PROVIDER_REASON.NO_EVIDENCE);
  assert.equal(normalized.disclosure,payload.disclosure);
  assert.equal(normalized.marketHydration.reason,PROVIDER_REASON.PROVIDER_FAILURE);
  assert.equal(normalized.marketHydration.reasonDetail,'market_source_error');
  assert.equal(normalized.budget.reason,PROVIDER_REASON.PROVIDER_BUDGET_EXHAUSTED);
  assert.equal(normalized.validation.reason,undefined);
});
