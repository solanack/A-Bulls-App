import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBlockscoutHolderCount,normalizePonsFamilyLiveMarket,__ponsFamilyLiveContract } from './intelligence-ponsfamily-live.mjs';
const TOKEN='0x0000000000000000000000000000000000000007';

test('PonsFamily no longer needs a private holder provider to qualify tokens',()=>{assert.equal(__ponsFamilyLiveContract.selfPopulating,true);assert.equal(__ponsFamilyLiveContract.holderSource,'robinhood-blockscout');assert.equal(__ponsFamilyLiveContract.marketCapFloorUsd,75000);assert.equal(__ponsFamilyLiveContract.minimumHolders,750);assert.equal(__ponsFamilyLiveContract.entryCycles,1);assert.equal(__ponsFamilyLiveContract.maximumMembers,50);});
test('Blockscout token counters parse holder count',()=>{assert.equal(parseBlockscoutHolderCount({token_holders_count:'801'}),801);assert.equal(parseBlockscoutHolderCount({tokenHoldersCount:999}),999);assert.equal(parseBlockscoutHolderCount({}),null);});
test('DexScreener market and Blockscout holders normalize together',()=>{const pairs=[{chainId:'robinhood',baseToken:{address:TOKEN,symbol:'P7',name:'Pons Seven'},marketCap:90000,fdv:100000,priceUsd:'0.01',volume:{h24:5500},liquidity:{usd:21000},pairAddress:'0x0000000000000000000000000000000000000008',dexId:'test'}];const value=normalizePonsFamilyLiveMarket(TOKEN,pairs,801,2_000_000_000);assert.equal(value?.marketCapUsd,90000);assert.equal(value?.volumeH24Usd,5500);assert.equal(value?.holderCount,801);assert.match(value?.source??'',/blockscout/);});
test('missing holder evidence never gets invented',()=>{const pairs=[{chainId:'robinhood',baseToken:{address:TOKEN},marketCap:90000,volume:{h24:5500},liquidity:{usd:1}}];assert.equal(normalizePonsFamilyLiveMarket(TOKEN,pairs,null,2_000_000_000),null);});
