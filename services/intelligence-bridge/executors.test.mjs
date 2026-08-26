import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubstreamsExecutor, normalizeSubstreamsTransportResult } from './substreams-executor.mjs';
import { createOldFaithfulExecutor, normalizeOldFaithfulTransportResult } from './old-faithful-executor.mjs';
import { buildBridgeExecutors, bridgeSourceKinds } from './bootstrap.mjs';

const subTask={taskId:1,wallet:'11111111111111111111111111111111',source:'substreams-a',sourceKind:'substreams',requestedFrom:100,requestedTo:200};
const oldTask={...subTask,taskId:2,source:'archive-a',sourceKind:'old-faithful'};

test('Substreams shell requires explicit complete searched range',async()=>{
  assert.throws(()=>normalizeSubstreamsTransportResult({rows:[],from:100,to:200},subTask),/substreams_complete_range_required/);
  const executor=createSubstreamsExecutor({transport:async()=>({events:[{signature:'sig'}],from:90,to:210,complete:true})});
  const result=await executor(subTask);
  assert.equal(result.rangeVerified,true);
  assert.equal(result.rows.length,1);
  assert.equal(result.searchedFrom,90);
  assert.equal(result.searchedTo,210);
});

test('Old Faithful shell preserves archive reference and requires complete range',async()=>{
  assert.throws(()=>normalizeOldFaithfulTransportResult({transactions:[],from:100,to:200},oldTask),/old_faithful_complete_range_required/);
  const executor=createOldFaithfulExecutor({transport:async()=>({transactions:[{signature:'sig',cid:'bafy-test'}],from:100,to:200,complete:true})});
  const result=await executor(oldTask);
  assert.equal(result.rows[0].archiveRef,'bafy-test');
  assert.equal(result.rangeVerified,true);
});

test('bootstrap enables only explicitly configured historical sources',()=>{
  const none=buildBridgeExecutors({env:{},transports:{}});
  assert.deepEqual(bridgeSourceKinds(none),[]);
  const one=buildBridgeExecutors({env:{INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED:'true'},transports:{substreams:async()=>({events:[],from:0,to:0,complete:true})}});
  assert.deepEqual(bridgeSourceKinds(one),['substreams']);
});

test('bootstrap refuses enabled source without matching transport',()=>{
  assert.throws(()=>buildBridgeExecutors({env:{INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED:'true'},transports:{}}),/substreams_transport_not_configured/);
  assert.throws(()=>buildBridgeExecutors({env:{INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED:'true'},transports:{}}),/old_faithful_transport_not_configured/);
});
