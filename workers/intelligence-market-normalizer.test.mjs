import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDexScreenerPairs } from './intelligence-market-normalizer.mjs';

const BASE='0xAbCdEfabcdefABCDEFabcdefabcdefABCDEFabcd';
const OTHER='0x0000000000000000000000000000000000000001';

test('normalizes Base market observations with chain-qualified identity',()=>{
  const market=normalizeDexScreenerPairs('Base',BASE,[
    {chainId:'base',baseToken:{address:BASE.toLowerCase(),symbol:'BULL',name:'Bull'},priceUsd:'1.25',marketCap:'1000000',fdv:'1200000',liquidity:{usd:'50000'},volume:{m5:'100',h1:'200',h6:'300',h24:'400'},priceChange:{h24:'5'},txns:{h24:{buys:11,sells:7}},pairAddress:OTHER,dexId:'uniswap',pairCreatedAt:123}
  ]);
  assert.equal(market.chainKey,'base');
  assert.equal(market.assetAddress,BASE.toLowerCase());
  assert.equal(market.priceUsd,1.25);
  assert.equal(market.liquidityToMarketCapPct,5);
  assert.deepEqual(market.transactions.h24,{buys:11,sells:7});
});

test('selects the deepest exact base-token market and rejects wrong chains',()=>{
  const rows=[
    {chainId:'base',baseToken:{address:BASE},liquidity:{usd:10},priceUsd:'1'},
    {chainId:'base',baseToken:{address:BASE},liquidity:{usd:100},priceUsd:'2'},
    {chainId:'bsc',baseToken:{address:BASE},liquidity:{usd:999},priceUsd:'9'}
  ];
  assert.equal(normalizeDexScreenerPairs('base',BASE,rows).priceUsd,2);
  assert.equal(normalizeDexScreenerPairs('bsc',OTHER,rows),null);
});
