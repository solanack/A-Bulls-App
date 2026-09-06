import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRobinhoodHoldersQuery,buildRobinhoodTokenMarketQuery,isRobinhoodContractAddress,resolveRobinhoodToken,summarizeRobinhoodPressure} from './intelligence-pons-token-resolver.mjs';

const address='0x1111111111111111111111111111111111111111';

test('recognizes only complete EVM addresses',()=>{
  assert.equal(isRobinhoodContractAddress(address),true);
  assert.equal(isRobinhoodContractAddress('0x1234'),false);
});

test('queries are pinned to the contract and Robinhood network',()=>{
  assert.match(buildRobinhoodTokenMarketQuery(address),/bid:robinhood/);
  assert.match(buildRobinhoodTokenMarketQuery(address),new RegExp(address));
  assert.match(buildRobinhoodHoldersQuery(address),/network: robinhood/);
  assert.match(buildRobinhoodHoldersQuery(address),/count: 20/);
});

test('a valid contract resolves even without a populated galaxy',async()=>{
  const fetchImpl=async(input,init={})=>{
    const url=String(input);
    if(url==='https://rpc.test')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:'0x6000'}));
    if(url.includes('dexscreener'))return new Response(JSON.stringify([{chainId:'robinhood',baseToken:{address,symbol:'PONZ',name:'Ponz Token'},pairAddress:'0x2222222222222222222222222222222222222222',liquidity:{usd:100000},priceUsd:'0.01',marketCap:1000000,volume:{m5:10,h1:20,h6:30,h24:40},txns:{h24:{buys:3,sells:2}}}]));
    const query=JSON.parse(init.body).query;
    if(query.includes('RobinhoodTokenHolders'))return new Response(JSON.stringify({data:{EVM:{Top:[{Holder:{Address:'0x3'},Balance:{Amount:'100'}}],Stats:[{holders:5,total:'1000'}]}}}));
    return new Response(JSON.stringify({data:{Trading:{Tokens:[{Block:{Time:'2026-09-06T12:00:00Z'},Token:{Address:address,Symbol:'PONZ',Name:'Ponz Token'},Price:{Ohlc:{Close:0.01}},Supply:{MarketCap:1000000,FullyDilutedValuationUsd:1000000,CirculatingSupply:1000,TotalSupply:1000}}]}}}));
  };
  const result=await resolveRobinhoodToken(address,{env:{PONS_RPC_URL:'https://rpc.test',PONS_BITQUERY_TOKEN:'secret'},fetchImpl});
  assert.equal(result.ok,true);
  assert.equal(result.kind,'evm-token');
  assert.equal(result.market.marketCapUsd,1000000);
  assert.equal(result.market.volumeUsd.h24,40);
  assert.equal(result.market.liquidityToMarketCapPct,10);
  assert.equal(result.activity.pressure.h24.buySharePct,60);
  assert.equal(result.holders.count,5);
  assert.equal(result.pons.verified,false);
  assert.equal(result.risk.level,'insufficient-evidence');
});

test('an address without contract code is honestly not found',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:'0x'}));
  const result=await resolveRobinhoodToken(address,{env:{PONS_RPC_URL:'https://rpc.test'},fetchImpl});
  assert.equal(result.state,'not-found');
});


test('summarizes Robinhood buy and sell pressure factually',()=>{
  const pressure=summarizeRobinhoodPressure({h1:{buys:9,sells:3}});
  assert.equal(pressure.h1.buySharePct,75);
  assert.equal(pressure.h1.buySellRatio,3);
});
