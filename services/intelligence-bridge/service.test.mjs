import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeService } from './service.mjs';

test('service refuses startup with no enabled executors',()=>{
  assert.throws(()=>createBridgeService({env:{INTELLIGENCE_API_BASE:'https://api.example',INTELLIGENCE_MESH_INGEST_TOKEN:'secret'},transports:{}}),/no_historical_bridge_executors_enabled/);
});

test('service derives claim source kinds from enabled configured executors',()=>{
  const service=createBridgeService({
    env:{
      INTELLIGENCE_API_BASE:'https://api.example',
      INTELLIGENCE_MESH_INGEST_TOKEN:'secret',
      INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED:'true',
      INTELLIGENCE_BRIDGE_CLAIM_LIMIT:'3',
      INTELLIGENCE_BRIDGE_LEASE_SECONDS:'180'
    },
    transports:{substreams:async()=>({events:[],from:0,to:0,complete:true})},
    fetchImpl:async()=>new Response(JSON.stringify({ok:true,tasks:[]}),{status:200,headers:{'content-type':'application/json'}})
  });
  assert.deepEqual(service.config.sourceKinds,['substreams']);
  assert.equal(service.config.limit,3);
  assert.equal(service.config.leaseSeconds,180);
});
