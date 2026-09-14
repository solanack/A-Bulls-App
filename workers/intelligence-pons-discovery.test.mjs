import test from 'node:test';
import assert from 'node:assert/strict';
import { PONS_FACTORIES } from './intelligence-pons-galaxy.mjs';
import { PONS_DISCOVERY_SPECS,buildFilteredPonsLogsUrl,parseBlockscoutLogsPayload,__ponsDiscoveryContract } from './intelligence-pons-discovery.mjs';

test('Pons discovery asks Blockscout for factory TokenLaunched topic only',()=>{
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

test('Pons discovery parses Blockscout RPC log envelopes and honest empties',()=>{
  assert.deepEqual(parseBlockscoutLogsPayload({status:'1',message:'OK',result:[{blockNumber:'0x1'}]}),[{blockNumber:'0x1'}]);
  assert.deepEqual(parseBlockscoutLogsPayload({status:'0',message:'No records found',result:[]}),[]);
  assert.throws(()=>parseBlockscoutLogsPayload({status:'0',message:'NOTOK',result:'rate limit'}),/pons_blockscout_logs/);
});

test('historical discovery is resumable and starts before known active factories',()=>{
  assert.ok(PONS_DISCOVERY_SPECS.v1.startBlock<=8_991_118);
  assert.ok(PONS_DISCOVERY_SPECS.v2.startBlock<26_841_846);
  assert.equal(__ponsDiscoveryContract.direction,'newest-to-oldest');
  assert.equal(__ponsDiscoveryContract.source,'blockscout-filtered-tokenlaunched');
});
