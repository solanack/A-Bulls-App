import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseExactReplayPool, discoverExactReplayPool, normalizeGeckoOhlcvRows, replayMarketProviders } from './intelligence-replay-market-hydration.mjs';

const mint='33333333333333333333333333333333';
const quote='44444444444444444444444444444444';
const pool='55555555555555555555555555555555';

const exactPoolPayload=()=>({data:[{id:`solana_${pool}`,attributes:{address:pool},relationships:{base_token:{data:{id:`solana_${mint}`}},quote_token:{data:{id:`solana_${quote}`}}}}]});

test('selects only an exact Solana base/quote pool for Replay',()=>{
  const payload={data:[
    {id:'solana_66666666666666666666666666666666',attributes:{address:'66666666666666666666666666666666'},relationships:{base_token:{data:{id:`solana_${mint}`}},quote_token:{data:{id:'77777777777777777777777777777777'}}}},
    {id:`solana_${pool}`,attributes:{address:pool},relationships:{base_token:{data:{id:`solana_${quote}`}},quote_token:{data:{id:`solana_${mint}`}}}}
  ]};
  assert.deepEqual(chooseExactReplayPool(payload,mint,quote),{address:pool,base:quote,quote:mint});
  assert.equal(chooseExactReplayPool(payload,mint,'88888888888888888888888888888888'),null);
});

test('paginates bounded GeckoTerminal pool discovery until the exact quote market is found',async()=>{
  const calls=[];
  const fetchImpl=async input=>{
    const url=new URL(String(input));calls.push(url.toString());
    const page=Number(url.searchParams.get('page')||1);
    const data=page===1
      ?[{id:'solana_66666666666666666666666666666666',attributes:{address:'66666666666666666666666666666666'},relationships:{base_token:{data:{id:`solana_${mint}`}},quote_token:{data:{id:'77777777777777777777777777777777'}}}}]
      :exactPoolPayload().data;
    return new Response(JSON.stringify({data}),{headers:{'content-type':'application/json'}});
  };
  const selected=await discoverExactReplayPool({REPLAY_MARKET_POOL_PAGES:'3'},mint,quote,{fetchImpl});
  assert.equal(selected.address,pool);
  assert.equal(selected.provider,'geckoterminal-public');
  assert.equal(calls.length,2);
  assert.match(calls[1],/page=2/);
});

test('retries one transient GeckoTerminal rate limit while preserving bounded discovery',async()=>{
  let calls=0;
  const fetchImpl=async()=>{
    calls+=1;
    if(calls===1)return new Response('rate limited',{status:429,headers:{'retry-after':'0.001'}});
    return new Response(JSON.stringify(exactPoolPayload()),{headers:{'content-type':'application/json'}});
  };
  const selected=await discoverExactReplayPool({},mint,quote,{fetchImpl});
  assert.equal(selected.address,pool);
  assert.equal(calls,2);
});

test('uses configured CoinGecko Demo onchain authentication before public GeckoTerminal',async()=>{
  const calls=[];
  const fetchImpl=async(input,init={})=>{
    calls.push({url:String(input),headers:init.headers||{}});
    return new Response(JSON.stringify(exactPoolPayload()),{headers:{'content-type':'application/json'}});
  };
  const selected=await discoverExactReplayPool({COINGECKO_API_KEY:'secret-key',COINGECKO_API_MODE:'demo'},mint,quote,{fetchImpl});
  assert.equal(selected.provider,'coingecko-demo-onchain');
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/api\.coingecko\.com\/api\/v3\/onchain\/networks\/solana/);
  assert.equal(calls[0].headers['x-cg-demo-api-key'],'secret-key');
  assert.equal(Object.hasOwn(calls[0].headers,'x-cg-pro-api-key'),false);
});

test('falls through an invalid Demo key to Pro before keyless public market data',async()=>{
  const calls=[];
  const fetchImpl=async(input,init={})=>{
    const url=new URL(String(input));
    calls.push({url:url.toString(),headers:init.headers||{}});
    if(url.hostname==='api.coingecko.com')return new Response('unauthorized',{status:401});
    return new Response(JSON.stringify(exactPoolPayload()),{headers:{'content-type':'application/json'}});
  };
  const selected=await discoverExactReplayPool({COINGECKO_API_KEY:'secret-key'},mint,quote,{fetchImpl});
  assert.equal(selected.provider,'coingecko-pro-onchain');
  assert.equal(calls.length,2);
  assert.match(calls[1].url,/pro-api\.coingecko\.com/);
  assert.equal(calls[1].headers['x-cg-pro-api-key'],'secret-key');
});

test('provider plan never exposes a configured CoinGecko key in provider metadata',()=>{
  const providers=replayMarketProviders({COINGECKO_API_KEY:'super-secret'});
  assert.deepEqual(providers.map(item=>item.name),['coingecko-demo-onchain','coingecko-pro-onchain','geckoterminal-public']);
  assert.equal(JSON.stringify(providers.map(({name,base})=>({name,base}))).includes('super-secret'),false);
});

test('normalizes only finite positive OHLC rows inside the Replay window',()=>{
  const rows=normalizeGeckoOhlcvRows([
    [90,1,2,.5,1.5,100],
    [120,1,2,.75,1.7,120],
    [120,1.1,2.1,.8,1.8,125],
    [180,1.8,2.2,1.7,2,140],
    [240,0,2,1,1.5,100]
  ],60,100,200);
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0],{bucket_start:120,bucket_seconds:60,open:1.1,high:2.1,low:.8,close:1.8});
  assert.equal(rows[1].bucket_start,180);
});