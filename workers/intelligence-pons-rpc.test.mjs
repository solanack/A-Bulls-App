import test from 'node:test';
import assert from 'node:assert/strict';
import { ponsRpc,ponsRpcEndpoints,__ponsRpcContract } from './intelligence-pons-rpc.mjs';

test('Pons RPC endpoints keep configured providers ahead of the official public fallback',()=>{
  const endpoints=ponsRpcEndpoints({
    PONS_RPC_URL:'https://primary.example/rpc',
    PONS_RPC_FALLBACK_URLS:'https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public,https://rpc.mainnet.chain.robinhood.com'
  });
  assert.deepEqual(endpoints,[
    'https://primary.example/rpc',
    'https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public',
    'https://rpc.mainnet.chain.robinhood.com'
  ]);
  assert.equal(__ponsRpcContract.chainId,4663);
  assert.equal(__ponsRpcContract.readOnly,true);
  assert.equal(__ponsRpcContract.failover,true);
});

test('Pons RPC fails over after a rate-limited provider without retry amplification',async()=>{
  const calls=[];
  const fetchImpl=async(input,init)=>{
    calls.push({url:String(input),body:JSON.parse(init.body)});
    if(String(input)==='https://primary.example/rpc')return new Response('rate limited',{status:429});
    return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:'0x1237'}),{headers:{'content-type':'application/json'}});
  };
  const result=await ponsRpc({
    PONS_RPC_URL:'https://primary.example/rpc',
    PONS_RPC_FALLBACK_URLS:'https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public'
  },'eth_chainId',[],fetchImpl);
  assert.equal(result,'0x1237');
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,'https://primary.example/rpc');
  assert.equal(calls[1].url,'https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public');
  assert.equal(calls[0].body.method,'eth_chainId');
  assert.equal(calls[1].body.method,'eth_chainId');
});
