import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPonsBlockscoutAddressLogsUrl,buildPonsBlockscoutTokenCountersUrl,ponsBlockscoutSource,__ponsBlockscoutContract } from './intelligence-pons-blockscout.mjs';

const FACTORY='0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e';
const TOKEN='0x0000000000000000000000000000000000000007';

test('Pons Blockscout keeps the per-instance REST path as no-key fallback',()=>{
  const url=new URL(buildPonsBlockscoutAddressLogsUrl({},FACTORY,{block_number:123,index:7,items_count:50}));
  assert.equal(url.hostname,'robinhoodchain.blockscout.com');
  assert.equal(url.pathname,`/api/v2/addresses/${FACTORY}/logs`);
  assert.equal(url.searchParams.get('block_number'),'123');
  assert.equal(url.searchParams.get('index'),'7');
  assert.equal(url.searchParams.get('items_count'),'50');
  assert.equal(url.searchParams.get('apikey'),null);
  assert.equal(ponsBlockscoutSource({}),'blockscout-instance-v2');
});

test('Pons Blockscout switches discovery to authenticated PRO REST when configured',()=>{
  const env={PONS_BLOCKSCOUT_API_KEY:'proapi_test'};
  const url=new URL(buildPonsBlockscoutAddressLogsUrl(env,FACTORY,{block_number:456,index:9,items_count:50}));
  assert.equal(url.hostname,'api.blockscout.com');
  assert.equal(url.pathname,`/${__ponsBlockscoutContract.chainId}/api/v2/addresses/${FACTORY}/logs`);
  assert.equal(url.searchParams.get('apikey'),'proapi_test');
  assert.equal(url.searchParams.get('block_number'),'456');
  assert.equal(ponsBlockscoutSource(env),'blockscout-pro-rest-v2');
});

test('Pons Blockscout routes holder counters through PRO REST too',()=>{
  const env={BLOCKSCOUT_API_KEY:'proapi_test'};
  const url=new URL(buildPonsBlockscoutTokenCountersUrl(env,TOKEN));
  assert.equal(url.hostname,'api.blockscout.com');
  assert.equal(url.pathname,`/${__ponsBlockscoutContract.chainId}/api/v2/tokens/${TOKEN}/counters`);
  assert.equal(url.searchParams.get('apikey'),'proapi_test');
});
