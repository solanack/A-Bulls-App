import test from 'node:test';
import assert from 'node:assert/strict';
import {ponsRpc,ponsRpcEndpoints} from './intelligence-pons-rpc.mjs';

test('PONS RPC failover deduplicates configured and public endpoints',()=>{
  assert.deepEqual(ponsRpcEndpoints({PONS_RPC_URL:'https://primary.test',PONS_RPC_FALLBACK_URLS:'https://backup.test, https://primary.test'}),['https://primary.test','https://backup.test','https://rpc.mainnet.chain.robinhood.com']);
});

test('PONS RPC continues past a 429 response',async()=>{
  const calls=[];
  const result=await ponsRpc({PONS_RPC_URL:'https://primary.test',PONS_RPC_FALLBACK_URLS:'https://backup.test'},'eth_getCode',['0x1','latest'],async input=>{
    calls.push(String(input));
    if(String(input)==='https://primary.test')return new Response('rate limited',{status:429});
    return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:'0x6000'}),{headers:{'content-type':'application/json'}});
  });
  assert.equal(result,'0x6000');
  assert.deepEqual(calls,['https://primary.test','https://backup.test']);
});
