import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicChainEntity } from './intelligence-entity-resolver.mjs';

const env={INTELLIGENCE_RPC_URL:'https://rpc.example.test'};
const response=result=>async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,result}),{status:200,headers:{'content-type':'application/json'}});

test('resolves executable accounts as programs',async()=>{
  const address='11111111111111111111111111111111';
  const result=await resolvePublicChainEntity(address,{env,fetchImpl:response({value:{owner:'BPFLoaderUpgradeab1e11111111111111111111111',executable:true,lamports:123,data:['','base64']}})});
  assert.equal(result.label,'program');
  assert.equal(result.readOnly,true);
});

test('resolves parsed token mints without calling them wallets',async()=>{
  const address='So11111111111111111111111111111111111111112';
  const result=await resolvePublicChainEntity(address,{env,fetchImpl:response({value:{owner:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',executable:false,lamports:1,data:{parsed:{type:'mint',info:{decimals:9}}}}})});
  assert.equal(result.label,'token-mint');
  assert.equal(result.parsedType,'mint');
});

test('system-owned accounts remain conservatively labeled',async()=>{
  const address='11111111111111111111111111111111';
  const result=await resolvePublicChainEntity(address,{env,fetchImpl:response({value:{owner:'11111111111111111111111111111111',executable:false,lamports:1,data:['','base64']}})});
  assert.equal(result.label,'system-account');
  assert.match(result.disclosure,/may be wallets or other account forms/);
});

test('resolves transaction signatures with investigation context',async()=>{
  const signature='5'.repeat(72);
  const signer='7'.repeat(32);
  const mintA='8'.repeat(32);
  const mintB='9'.repeat(32);
  const tx={
    slot:42,
    blockTime:123,
    meta:{err:null,fee:5000,preTokenBalances:[{mint:mintA,owner:signer}],postTokenBalances:[{mint:mintB,owner:signer}]},
    transaction:{message:{accountKeys:[{pubkey:signer,signer:true,writable:true},{pubkey:'6'.repeat(32),signer:false,writable:true}],instructions:[{},{}]}}
  };
  const result=await resolvePublicChainEntity(signature,{env,fetchImpl:response(tx)});
  assert.equal(result.label,'transaction');
  assert.equal(result.slot,42);
  assert.equal(result.failed,false);
  assert.deepEqual(result.context.signers,[signer]);
  assert.deepEqual(result.context.tokenMints,[mintA,mintB]);
  assert.equal(result.context.instructionCount,2);
  assert.match(result.disclosure,/not claims of identity/);
});



test('routes EVM contracts to Robinhood token intelligence instead of Solana RPC',async()=>{
  const address='0x1111111111111111111111111111111111111111';
  const fetchImpl=async(input,init={})=>{
    const url=String(input);
    if(url==='https://robinhood-rpc.test')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:'0x6000'}));
    if(url.includes('dexscreener'))return new Response(JSON.stringify([{baseToken:{address,symbol:'PONZ'},liquidity:{usd:50000},marketCap:750000,volume:{h24:25000}}]));
    const query=JSON.parse(init.body).query;
    if(query.includes('RobinhoodTokenHolders'))return new Response(JSON.stringify({data:{EVM:{Top:[],Stats:[{holders:10,total:'1000'}]}}}));
    return new Response(JSON.stringify({data:{Trading:{Tokens:[{Token:{Address:address,Symbol:'PONZ',Name:'Ponz Token'},Price:{Ohlc:{Close:0.001}},Supply:{MarketCap:750000,TotalSupply:1000}}]}}}));
  };
  const result=await resolvePublicChainEntity(address,{env:{INTELLIGENCE_RPC_URL:'https://solana-rpc.invalid',PONS_RPC_URL:'https://robinhood-rpc.test',PONS_BITQUERY_TOKEN:'secret'},fetchImpl});
  assert.equal(result.kind,'evm-token');
  assert.equal(result.network,'Robinhood Chain');
  assert.equal(result.market.marketCapUsd,750000);
});
