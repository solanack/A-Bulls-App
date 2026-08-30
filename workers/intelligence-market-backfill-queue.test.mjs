import assert from 'node:assert/strict';
import { marketBackfillQueueEnabled, queueMarketBackfillCandidates } from './intelligence-mesh-scheduler.mjs';

assert.equal(marketBackfillQueueEnabled({INTELLIGENCE_MESH_ENABLED:'true'}),false);
assert.equal(marketBackfillQueueEnabled({INTELLIGENCE_MESH_ENABLED:'true',MARKET_BACKFILL_QUEUE_ENABLED:'true'}),true);
assert.equal(marketBackfillQueueEnabled({INTELLIGENCE_MESH_ENABLED:'false',MARKET_BACKFILL_QUEUE_ENABLED:'true'}),false);

const disabled=await queueMarketBackfillCandidates({INTELLIGENCE_MESH_ENABLED:'true'},{candidates:[{wallet:'11111111111111111111111111111111'}]});
assert.deepEqual(disabled,{ok:true,enabled:false,queued:0,jobs:[]});

console.log('Market backfill queue guard contract passed');


