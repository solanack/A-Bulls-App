import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBridgeConfig, normalizeExecutorResult, receiptSatisfiesTask, processRetrievalTask, runBridgeOnce } from './runner.mjs';

const task={taskId:7,wallet:'11111111111111111111111111111111',source:'archive-a',sourceKind:'old-faithful',requestedFrom:100,requestedTo:200};
const config=normalizeBridgeConfig({apiBase:'https://api.example/',token:'secret',sourceKinds:['old-faithful'],limit:2,leaseSeconds:90});

test('normalizes fail-closed bridge configuration',()=>{
  assert.equal(config.apiBase,'https://api.example');
  assert.deepEqual(config.sourceKinds,['old-faithful']);
  assert.throws(()=>normalizeBridgeConfig({token:'x',sourceKinds:['substreams']}),/intelligence_api_base_required/);
  assert.throws(()=>normalizeBridgeConfig({apiBase:'https://api.example',sourceKinds:['substreams']}),/intelligence_mesh_ingest_token_required/);
});

test('executor range is verified only with valid explicit coordinates',()=>{
  const good=normalizeExecutorResult({rows:[],searchedFrom:100,searchedTo:200,rangeVerified:true},task);
  assert.equal(good.rangeVerified,true);
  assert.equal(receiptSatisfiesTask(good,task),true);
  const partial=normalizeExecutorResult({rows:[],searchedFrom:120,searchedTo:200,rangeVerified:true},task);
  assert.equal(receiptSatisfiesTask(partial,task),false);
  const bad=normalizeExecutorResult({rows:[],searchedFrom:200,searchedTo:100,rangeVerified:true},task);
  assert.equal(bad.rangeVerified,false);
  assert.equal(bad.searchedFrom,null);
});

test('missing executor retries the exact leased task',async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}});};
  const result=await processRetrievalTask(task,{config,executors:{},fetchImpl});
  assert.equal(result.state,'retry');
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/retrieval-tasks\/finish$/);
  assert.equal(calls[0].body.taskId,7);
  assert.equal(calls[0].body.wallet,task.wallet);
  assert.equal(calls[0].body.sourceKind,'old-faithful');
});

test('unverified or partial retrieval cannot complete a task',async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}});};
  const result=await processRetrievalTask(task,{config,executors:{'old-faithful':async()=>({rows:[{signature:'sig'}],searchedFrom:120,searchedTo:200,rangeVerified:true})},fetchImpl});
  assert.equal(result.state,'retry');
  assert.equal(result.error,'bridge_verified_range_required');
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/retrieval-tasks\/finish$/);
  assert.equal(calls[0].body.state,'retry');
});

test('verified empty retrieval completes with explicit searched-range receipt',async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{const body=JSON.parse(init.body);calls.push({url,body});return new Response(JSON.stringify({ok:true,receipt:{rangeVerified:body.rangeVerified===true}}),{status:200,headers:{'content-type':'application/json'}});};
  const result=await processRetrievalTask(task,{config,executors:{'old-faithful':async()=>({rows:[],searchedFrom:100,searchedTo:200,rangeVerified:true})},fetchImpl});
  assert.equal(result.state,'complete-empty');
  assert.equal(calls[0].body.observedRows,0);
  assert.equal(calls[0].body.rangeVerified,true);
  assert.equal(calls[0].body.searchedFrom,100);
  assert.equal(calls[0].body.searchedTo,200);
});

test('non-empty retrieval posts normalized evidence through matching adapter',async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{const body=JSON.parse(init.body);calls.push({url,body});return new Response(JSON.stringify({ok:true,accepted:1,nftAccepted:0,taskCompletion:{ok:true}}),{status:200,headers:{'content-type':'application/json'}});};
  const result=await processRetrievalTask(task,{config,executors:{'old-faithful':async()=>({rows:[{signature:'sig'}],searchedFrom:100,searchedTo:200,rangeVerified:true})},fetchImpl});
  assert.equal(result.state,'ingested');
  assert.match(calls[0].url,/adapters\/old-faithful$/);
  assert.equal(calls[0].body.taskId,7);
  assert.equal(calls[0].body.rangeVerified,true);
});

test('bridge claim is bounded to configured source kinds and lease',async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{const body=JSON.parse(init.body);calls.push({url,body});return new Response(JSON.stringify({ok:true,tasks:[]}),{status:200,headers:{'content-type':'application/json'}});};
  const result=await runBridgeOnce({config,executors:{},fetchImpl});
  assert.equal(result.claimed,0);
  assert.deepEqual(calls[0].body.sourceKinds,['old-faithful']);
  assert.equal(calls[0].body.limit,2);
  assert.equal(calls[0].body.leaseSeconds,90);
});
