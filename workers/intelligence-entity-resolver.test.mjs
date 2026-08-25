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

test('resolves transaction signatures through getTransaction',async()=>{
  const signature='5'.repeat(72);
  const result=await resolvePublicChainEntity(signature,{env,fetchImpl:response({slot:42,blockTime:123,meta:{err:null,fee:5000}})});
  assert.equal(result.label,'transaction');
  assert.equal(result.slot,42);
  assert.equal(result.failed,false);
});
