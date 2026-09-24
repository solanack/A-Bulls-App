import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseExactReplayPool, chooseReplayPrewarmBucket, discoverExactReplayPool, discoverExactReplayPools, normalizeGeckoOhlcvRows, replayMarketProviders, replayPoolsForToken, __replayMarketHydrationContract } from './intelligence-replay-market-hydration.mjs';

const mint='33333333333333333333333333333333';
const quote='44444444444444444444444444444444';
const pool='55555555555555555555555555555555';
const pool2='66666666666666666666666666666666';

const exactPoolPayload=(address=pool)=>({data:[{id:`solana_${address}`,attributes:{address},relationships:{base_token:{data:{id:`solana_${mint}`}},quote_token:{data:{id:`solana_${quote}`}}}}]});

test('selects only an exact Solana base/quote pool for Replay',()=>{
  const payload={data:[
    {id:'solana_77777777777777777777777777777777',attributes:{address:'77777777777777777777777777777777'},relationships:{base_token:{data:{id:`solana_${mint}`}},quote_token:{data:{id:'88888888888888888888888888888888'}}}},
    {id:`solana_${pool}`,attributes:{address:pool},relationships:{base_token:{data:{id:`solana_${quote}`}},quote_token:{data:{id:`solana_${mint}`}}}}
  ]};
  assert.deepEqual(chooseExactReplayPool(payload,mint,quote),{address:pool,base:quote,quote:mint});
  assert.equal(chooseExactReplayPool(payload,mint,'99999999999999999999999999999999'),null);
});

test('paginates bounded GeckoTerminal discovery and keeps exact quote candidates',async()=>{
  const calls=[];
  const fetchImpl=async input=>{
    const url=new URL(String(input));calls.push(url.toString());
    const page=Number(url.searchParams.get('page')||1);
    const data=page===1
      ?[{id:'solana_77777777777777777777777777777777',attributes:{address:'77777777777777777777777777777777'},relationships:{base_token:{data:{id:`solana_${mint}`}},quote_token:{data:{id:'88888888888888888888888888888888'}}}}]
      :page===2?exactPoolPayload().data:[];
    return new Response(JSON.stringify({data}),{headers:{'content-type':'application/json'}});
  };
  const selected=await discoverExactReplayPool({REPLAY_MARKET_POOL_PAGES:'3'},mint,quote,{fetchImpl});
  assert.equal(selected.address,pool);
  assert.equal(selected.provider,'geckoterminal-public');
  assert.equal(calls.length,3);
  assert.match(calls[1],/page=2/);
  assert.match(calls[2],/page=3/);
});

test('collects multiple unique exact pools so historical Replay can try a later market',async()=>{
  const calls=[];
  const fetchImpl=async input=>{
    const url=new URL(String(input));calls.push(url.toString());
    const page=Number(url.searchParams.get('page')||1);
    const data=page===1?exactPoolPayload(pool).data:exactPoolPayload(pool2).data;
    return new Response(JSON.stringify({data}),{headers:{'content-type':'application/json'}});
  };
  const pools=await discoverExactReplayPools({REPLAY_MARKET_POOL_PAGES:'5',REPLAY_MARKET_POOL_CANDIDATES:'2'},mint,quote,{fetchImpl});
  assert.deepEqual(pools.map(item=>item.address),[pool,pool2]);
  assert.equal(calls.length,2);
});

test('retries one transient GeckoTerminal rate limit while preserving bounded discovery',async()=>{
  let calls=0;
  const fetchImpl=async()=>{
    calls+=1;
    if(calls===1)return new Response('rate limited',{status:429,headers:{'retry-after':'0.001'}});
    const data=calls===2?exactPoolPayload().data:[];
    return new Response(JSON.stringify({data}),{headers:{'content-type':'application/json'}});
  };
  const selected=await discoverExactReplayPool({},mint,quote,{fetchImpl});
  assert.equal(selected.address,pool);
  assert.equal(calls,3);
});

test('uses configured CoinGecko Demo onchain authentication before public GeckoTerminal',async()=>{
  const calls=[];
  const fetchImpl=async(input,init={})=>{
    const url=new URL(String(input));
    calls.push({url:url.toString(),headers:init.headers||{}});
    const page=Number(url.searchParams.get('page')||1);
    return new Response(JSON.stringify({data:page===1?exactPoolPayload().data:[]}),{headers:{'content-type':'application/json'}});
  };
  const selected=await discoverExactReplayPool({COINGECKO_API_KEY:'secret-key',COINGECKO_API_MODE:'demo'},mint,quote,{fetchImpl});
  assert.equal(selected.provider,'coingecko-demo-onchain');
  assert.equal(calls.length,2);
  for(const call of calls){
    assert.match(call.url,/api\.coingecko\.com\/api\/v3\/onchain\/networks\/solana/);
    assert.equal(call.headers['x-cg-demo-api-key'],'secret-key');
    assert.equal(Object.hasOwn(call.headers,'x-cg-pro-api-key'),false);
  }
});

test('falls through an invalid Demo key to Pro before keyless public market data',async()=>{
  const calls=[];
  const fetchImpl=async(input,init={})=>{
    const url=new URL(String(input));
    calls.push({url:url.toString(),headers:init.headers||{}});
    if(url.hostname==='api.coingecko.com')return new Response('unauthorized',{status:401});
    const page=Number(url.searchParams.get('page')||1);
    return new Response(JSON.stringify({data:page===1?exactPoolPayload().data:[]}),{headers:{'content-type':'application/json'}});
  };
  const selected=await discoverExactReplayPool({COINGECKO_API_KEY:'secret-key'},mint,quote,{fetchImpl});
  assert.equal(selected.provider,'coingecko-pro-onchain');
  assert.equal(calls.length,3);
  assert.match(calls[0].url,/api\.coingecko\.com/);
  assert.match(calls[1].url,/pro-api\.coingecko\.com/);
  assert.match(calls[2].url,/pro-api\.coingecko\.com/);
  assert.equal(calls[1].headers['x-cg-pro-api-key'],'secret-key');
  assert.equal(calls.some(call=>call.url.includes('api.geckoterminal.com')),false);
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
test('auto quote discovery keeps the actual paired token and prefers the most liquid observed pool',()=>{
  const other='77777777777777777777777777777777';
  const payload={data:[
    {id:`solana_${pool}`,attributes:{address:pool,reserve_in_usd:'100',volume_usd:{h24:'50'}},relationships:{base_token:{data:{id:`solana_${mint}`}},quote_token:{data:{id:`solana_${quote}`}}}},
    {id:`solana_${pool2}`,attributes:{address:pool2,reserve_in_usd:'500',volume_usd:{h24:'10'}},relationships:{base_token:{data:{id:`solana_${other}`}},quote_token:{data:{id:`solana_${mint}`}}}}
  ]};
  const pools=replayPoolsForToken(payload,mint);
  assert.equal(pools.length,2);
  assert.equal(pools[0].address,pool2);
  assert.equal(pools[0].quoteMint,other);
  assert.equal(pools[1].quoteMint,quote);
});


test('accepts bytes32 Robinhood pool ids used by public GeckoTerminal markets',()=>{
  const token='0x89da5167eb1a0067f9b3e39a544ef8d4b9c41e18';
  const ai='0x2e800d0c64f7de2feaf3b7f6148468bdc61c1e18';
  const bytes32Pool='0x6d6e25a50843dad7cd400f43ea3f4ab52d1c0d4871e9adf6d4cae58645f31d07';
  const payload={data:[{id:`robinhood_${bytes32Pool}`,attributes:{address:bytes32Pool,reserve_in_usd:'639477',volume_usd:{h24:'268800'}},relationships:{base_token:{data:{id:`robinhood_${token}`}},quote_token:{data:{id:`robinhood_${ai}`}}}}]};
  const pools=replayPoolsForToken(payload,token,'robinhood','robinhood');
  assert.equal(pools.length,1);
  assert.equal(pools[0].address,bytes32Pool);
  assert.equal(pools[0].quoteMint,ai);
});


test('scheduled Fomo prewarm chooses bounded candle buckets instead of flooding minute history',()=>{
  assert.equal(chooseReplayPrewarmBucket(0,3600,240),60);
  assert.equal(chooseReplayPrewarmBucket(0,7*86400,240),3600);
  assert.equal(chooseReplayPrewarmBucket(0,90*86400,240),43200);
  assert.equal(__replayMarketHydrationContract.scheduledFomoPrewarm,true);
  assert.equal(__replayMarketHydrationContract.supportsEvmBytes32PoolIds,true);
  assert.equal(__replayMarketHydrationContract.prewarmSkipsReadyMarkets,true);
  assert.equal(__replayMarketHydrationContract.prewarmFailureCooldownHours,6);
});

test('EVM auto-quote Replay hydrates USD OHLC from the deepest pool, not a token-quoted pair',async()=>{
  const { hydrateReplayMarketCandles, USD_QUOTE }=await import('./intelligence-replay-market-hydration.mjs');
  const token='0xfe189e97832da1573e4e4ff034f4ffc3a15c7777',spcxb='0x1111111111111111111111111111111111111111',poolAddr='0x2222222222222222222222222222222222222222',written=[],urls=[];
  const stmt=(sql)=>({bind:(...args)=>({sql,args,first:async()=>sql.includes('COUNT(*)')?{count:0}:null,run:async()=>({}),all:async()=>({results:[]})})});
  const db={prepare:stmt,batch:async list=>{for(const item of list)if(item.sql.includes('intelligence_price_candles_v2'))written.push(item.args);}};
  const fetchImpl=async url=>{urls.push(url);if(url.includes('/pools?'))return{ok:true,status:200,json:async()=>({data:[{id:`bsc_${poolAddr}`,attributes:{address:poolAddr,reserve_in_usd:'1700000'},relationships:{base_token:{data:{id:`bsc_${token}`}},quote_token:{data:{id:`bsc_${spcxb}`}}}}]})};return{ok:true,status:200,json:async()=>({data:{attributes:{ohlcv_list:[[1_785_000_000,0.11,0.12,0.1,0.111,5]]}}})};};
  const result=await hydrateReplayMarketCandles({INTELLIGENCE_DB:db},{chain:'bsc',mint:token,from:1_784_900_000,to:1_785_100_000,bucketSeconds:3600},{fetchImpl});
  assert.equal(result.state,'ready');
  assert.equal(result.quoteMint,USD_QUOTE);
  assert.ok(urls.some(url=>url.includes('/ohlcv/')&&url.includes('currency=usd')));
  assert.equal(urls.some(url=>url.includes('currency=token')),false);
  assert.equal(written[0][2],USD_QUOTE);
  assert.equal(__replayMarketHydrationContract.evmAutoQuoteIsUsd,true);
});
