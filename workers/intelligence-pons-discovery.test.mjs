import test from 'node:test';
import assert from 'node:assert/strict';
import { PONS_FACTORIES } from './intelligence-pons-galaxy.mjs';
import { PONS_DISCOVERY_SPECS,buildFilteredPonsLogsUrl,buildPonsProLogsUrl,fetchPonsDiscoveryRange,parseBlockscoutLogsPayload,__ponsDiscoveryContract } from './intelligence-pons-discovery.mjs';

test('Pons legacy discovery URL remains factory and TokenLaunched topic filtered',()=>{
  const factory=PONS_FACTORIES.find(item=>item.version==='v2');
  const url=new URL(buildFilteredPonsLogsUrl(factory,52_000_000,54_000_000));
  assert.equal(url.hostname,'robinhoodchain.blockscout.com');
  assert.equal(url.searchParams.get('module'),'logs');
  assert.equal(url.searchParams.get('action'),'getLogs');
  assert.equal(url.searchParams.get('address'),factory.address);
  assert.equal(url.searchParams.get('topic0'),factory.topic);
  assert.equal(url.searchParams.get('fromBlock'),'52000000');
  assert.equal(url.searchParams.get('toBlock'),'54000000');
});

test('Pons authenticated Blockscout Pro URL scopes Robinhood Chain and exact event',()=>{
  const factory=PONS_FACTORIES.find(item=>item.version==='v1');
  const url=new URL(buildPonsProLogsUrl(factory,8_900_000,9_000_000,'proapi_test'));
  assert.equal(url.hostname,'api.blockscout.com');
  assert.equal(url.searchParams.get('chain_id'),'4663');
  assert.equal(url.searchParams.get('module'),'logs');
  assert.equal(url.searchParams.get('action'),'getLogs');
  assert.equal(url.searchParams.get('address'),factory.address);
  assert.equal(url.searchParams.get('topic0'),factory.topic);
  assert.equal(url.searchParams.get('apikey'),'proapi_test');
});

test('Pons discovery parses Blockscout RPC log envelopes and honest empties',()=>{
  assert.deepEqual(parseBlockscoutLogsPayload({status:'1',message:'OK',result:[{blockNumber:'0x1'}]}),[{blockNumber:'0x1'}]);
  assert.deepEqual(parseBlockscoutLogsPayload({status:'0',message:'No records found',result:[]}),[]);
  assert.throws(()=>parseBlockscoutLogsPayload({status:'0',message:'NOTOK',result:'rate limit'}),/pons_blockscout_logs/);
});

test('Pons discovery uses bounded chain RPC when no Blockscout key is configured',async()=>{
  const factory=PONS_FACTORIES[0],calls=[];
  const rpcImpl=async(_env,method,params)=>{calls.push({method,params});return[{address:factory.address,topics:[factory.topic],blockNumber:'0x1'}];};
  const result=await fetchPonsDiscoveryRange({},factory,100,200,{rpcImpl});
  assert.equal(result.source,'robinhood-rpc-topic-filtered');
  assert.equal(result.rows.length,1);
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'eth_getLogs');
  assert.equal(calls[0].params[0].address,factory.address);
  assert.deepEqual(calls[0].params[0].topics,[factory.topic]);
});

test('Pons discovery falls back to bounded RPC when Blockscout Pro rejects the Worker',async()=>{
  const factory=PONS_FACTORIES[0];let rpcCalls=0;
  const fetchImpl=async()=>new Response('forbidden',{status:403});
  const rpcImpl=async()=>{rpcCalls+=1;return[];};
  const result=await fetchPonsDiscoveryRange({BLOCKSCOUT_API_KEY:'proapi_test'},factory,100,200,{fetchImpl,rpcImpl});
  assert.equal(result.source,'robinhood-rpc-topic-filtered');
  assert.equal(result.rows.length,0);
  assert.equal(rpcCalls,1);
});

test('historical discovery is resumable and starts before known active factories',()=>{
  assert.ok(PONS_DISCOVERY_SPECS.v1.startBlock<=8_991_118);
  assert.ok(PONS_DISCOVERY_SPECS.v2.startBlock<26_841_846);
  assert.equal(__ponsDiscoveryContract.direction,'newest-to-oldest');
  assert.equal(__ponsDiscoveryContract.source,'blockscout-pro-or-bounded-rpc');
  assert.equal(__ponsDiscoveryContract.chainId,4663);
});
