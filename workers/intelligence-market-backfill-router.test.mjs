import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMarketBackfillPlanRequest } from './intelligence-market-backfill-router.mjs';

test('market backfill planner endpoint fails closed while Playable Data is disabled',async()=>{
  const response=await handleMarketBackfillPlanRequest(new Request('https://api.example/api/intelligence/market-backfill-plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mint:'11111111111111111111111111111111'})}),{PLAYABLE_DATA_ENABLED:'false'});
  assert.equal(response.status,404);
  assert.equal((await response.json()).error,'feature_disabled');
});

test('non-matching paths fall through',async()=>{
  assert.equal(await handleMarketBackfillPlanRequest(new Request('https://api.example/api/intelligence/other',{method:'POST'}),{}),null);
});

test('wrong methods are rejected without touching index state',async()=>{
  const response=await handleMarketBackfillPlanRequest(new Request('https://api.example/api/intelligence/market-backfill-plan'),{PLAYABLE_DATA_ENABLED:'true'});
  assert.equal(response.status,405);
});
