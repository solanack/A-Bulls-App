import assert from 'node:assert/strict';
import { handleMarketBackfillRequest } from './intelligence-market-backfill-request.mjs';

const other=await handleMarketBackfillRequest(new Request('https://api.example/api/other',{method:'POST'}),{});
assert.equal(other,null);

const disabled=await handleMarketBackfillRequest(new Request('https://api.example/api/intelligence/market-backfill-request',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),{PLAYABLE_DATA_ENABLED:'false'});
assert.equal(disabled.status,404);
assert.equal((await disabled.json()).error,'feature_disabled');

const method=await handleMarketBackfillRequest(new Request('https://api.example/api/intelligence/market-backfill-request',{method:'GET'}),{PLAYABLE_DATA_ENABLED:'true'});
assert.equal(method.status,405);
assert.equal((await method.json()).error,'method_not_allowed');

console.log('Market backfill request boundary passed');


