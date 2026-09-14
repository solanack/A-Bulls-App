import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchSolanaDexMarket,normalizeGeckoTerminalToken,normalizeLargestAccounts,normalizeSolanaDexPairs,resolveSolanaToken,summarizeTradingPressure} from './intelligence-solana-token-resolver.mjs';

const mint='So11111111111111111111111111111111111111112';

test('normalizes market, valuation, momentum, and liquidity ratio',()=>{
  const market=normalizeSolanaDexPairs(mint,[{chainId:'solana',baseToken:{address:mint,symbol:'WSOL',name:'Wrapped SOL'},dexId:'pumpswap',pairAddress:'pair',pairCreatedAt:1000,priceUsd:'150',marketCap:90000000000,fdv:100000000000,liquidity:{usd:900000000},volume:{m5:10,h1:20,h6:30,h24:40},priceChange:{h1:2.5},txns:{h1:{buys:30,sells:20}}}]);
  assert.equal(market.symbol,'WSOL');
  assert.equal(market.fdvUsd,100000000000);
  assert.equal(market.liquidityToMarketCapPct,1);
  assert.equal(market.transactions.h1.buys,30);
});

test('falls back to DexScreener token lookup when the primary market endpoint is unavailable',async()=>{
  const calls=[];
  const fetchImpl=async input=>{
    const url=String(input);calls.push(url);
    if(url.includes('/token-pairs/v1/solana/'))return new Response('upstream unavailable',{status:503});
    if(url.includes('/latest/dex/tokens/'))return new Response(JSON.stringify({pairs:[{chainId:'solana',baseToken:{address:mint,symbol:'SOL',name:'Wrapped SOL'},dexId:'raydium',pairAddress:'pair',priceUsd:'101.39',marketCap:100000000000,liquidity:{usd:30000000},volume:{h24:300000000},txns:{h24:{buys:100,sells:90}}}]}),{headers:{'content-type':'application/json'}});
    throw new Error('unexpected request');
  };
  const market=await fetchSolanaDexMarket(mint,fetchImpl);
  assert.equal(calls.length,2);
  assert.equal(market.priceUsd,101.39);
  assert.equal(market.source,'dexscreener-token-lookup');
});

test('normalizes GeckoTerminal token data without inventing unavailable tape fields',()=>{
  const market=normalizeGeckoTerminalToken(mint,{data:{id:`solana_${mint}`,attributes:{address:mint,name:'Wrapped SOL',symbol:'SOL',price_usd:'101.42',market_cap_usd:'100000000000',fdv_usd:'100000000000',total_reserve_in_usd:'32000000',volume_usd:{h24:'310000000'}}}});
  assert.equal(market.priceUsd,101.42);
  assert.equal(market.volumeUsd.h24,310000000);
  assert.equal(market.transactions.h24.buys,null);
  assert.equal(market.source,'geckoterminal-token');
});

test('uses GeckoTerminal when both DexScreener routes are unavailable',async()=>{
  const calls=[];
  const fetchImpl=async input=>{
    const url=String(input);calls.push(url);
    if(url.includes('dexscreener'))return new Response('blocked',{status:403});
    if(url.includes('geckoterminal'))return new Response(JSON.stringify({data:{id:`solana_${mint}`,attributes:{address:mint,name:'Wrapped SOL',symbol:'SOL',price_usd:'101.55',market_cap_usd:'100000000000',fdv_usd:'100000000000',total_reserve_in_usd:'32000000',volume_usd:{h24:'300000000'}}}}),{headers:{'content-type':'application/json'}});
    throw new Error('unexpected request');
  };
  const market=await fetchSolanaDexMarket(mint,fetchImpl);
  assert.equal(calls.length,3);
  assert.equal(market.priceUsd,101.55);
  assert.equal(market.source,'geckoterminal-token');
});

test('computes factual buy pressure without predicting direction',()=>{
  const pressure=summarizeTradingPressure({h1:{buys:30,sells:20}});
  assert.equal(pressure.h1.buySharePct,60);
  assert.equal(pressure.h1.buySellRatio,1.5);
});

test('computes raw largest-account concentration',()=>{
  const holders=normalizeLargestAccounts({value:[{uiAmountString:'40'},{uiAmountString:'10'}]},100);
  assert.equal(holders.top10Pct,50);
  assert.match(holders.method,/raw largest token accounts/);
});

test('resolves an enriched read-only Solana trader snapshot',async()=>{
  const account={owner:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',lamports:1,data:{parsed:{type:'mint',info:{supply:'1000000000',decimals:6,mintAuthority:null,freezeAuthority:'Freeze111111111111111111111111111111111'}}}};
  const source={name:'helius-standard-rpc',url:'https://helius.test'};
  const fetchImpl=async(input,init={})=>{
    if(String(input).includes('dexscreener'))return new Response(JSON.stringify([{chainId:'solana',baseToken:{address:mint,symbol:'MEME',name:'Meme'},dexId:'pumpfun',priceUsd:'0.01',marketCap:1000000,fdv:10000000,liquidity:{usd:50000},volume:{h1:10000},priceChange:{h1:5},txns:{h1:{buys:12,sells:8}}}]));
    if(String(input).includes('geckoterminal'))throw new Error('unexpected gecko fallback');
    const method=JSON.parse(init.body).method;
    if(method==='getTokenLargestAccounts')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{value:[{uiAmountString:'400'}]}}));
    if(method==='getTokenAccounts')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{total:321,token_accounts:[]}}));
    throw new Error('unexpected call');
  };
  const result=await resolveSolanaToken(mint,{env:{},source,account,fetchImpl});
  assert.equal(result.kind,'solana-token');
  assert.equal(result.market.marketCapUsd,1000000);
  assert.equal(result.activity.pressure.h1.buySharePct,60);
  assert.equal(result.holders.count,321);
  assert.equal(result.token.mintAuthorityRevoked,true);
  assert.equal(result.token.freezeAuthorityRevoked,false);
  assert.equal(result.launchpad.name,'Pump.fun');
  assert.equal(result.smartMoney.coverage,'unavailable');
  assert.equal(result.readOnly,true);
});
