import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PONS_CHAIN_ID,
  PONS_FACTORIES,
  __ponsGalaxyContract,
  decodePonsLaunchLog,
  normalizePonsMarketPairs,
  handlePonsGalaxyRequest
} from './intelligence-pons-galaxy.mjs';

const hash=character=>`0x${character.repeat(64)}`;
const address=character=>`0x${character.repeat(40)}`;
const topicAddress=value=>`0x${'0'.repeat(24)}${value.slice(2)}`;
const wordAddress=value=>`${'0'.repeat(24)}${value.slice(2)}`;
const wordUint=value=>BigInt(value).toString(16).padStart(64,'0');

test('PONS contract is read-only and pinned to Robinhood Chain',()=>{
  assert.equal(PONS_CHAIN_ID,4663);
  assert.equal(__ponsGalaxyContract.readOnly,true);
  assert.deepEqual(PONS_FACTORIES.map(item=>item.version),['v1','v2']);
});

test('decodes V2 TokenLaunched only from the allowlisted factory and topic',()=>{
  const factory=PONS_FACTORIES[1];
  const token=address('1'),curve=address('2'),deployer=address('3'),pairToken=address('4');
  const launch=decodePonsLaunchLog({
    address:factory.address,
    topics:[factory.topic,topicAddress(token),topicAddress(curve),topicAddress(deployer)],
    data:`0x${wordAddress(pairToken)}${wordUint(7)}${wordUint(9000)}`,
    transactionHash:hash('a'),blockHash:hash('b'),blockNumber:'0x123',logIndex:'0x2'
  });
  assert.equal(launch?.token,token);
  assert.equal(launch?.curve,curve);
  assert.equal(launch?.deployer,deployer);
  assert.equal(launch?.pairToken,pairToken);
  assert.equal(launch?.launchConfigId,'7');
  assert.equal(launch?.graduationThreshold,'9000');
  assert.equal(launch?.blockNumber,0x123);
  assert.equal(decodePonsLaunchLog({...launch,address:address('f')}),null);
});

test('decodes V1 TokenLaunched without interpreting its initial buy as a trade',()=>{
  const factory=PONS_FACTORIES[0];
  const token=address('1'),deployer=address('2'),dexFactory=address('3'),pairToken=address('4'),pool=address('5');
  const launch=decodePonsLaunchLog({
    address:factory.address,
    topics:[factory.topic,topicAddress(token),topicAddress(deployer),topicAddress(dexFactory)],
    data:`0x${wordAddress(pairToken)}${wordAddress(pool)}${wordUint(2)}${wordUint(6)}${wordUint(10)}${wordUint(300)}${wordUint(42)}`,
    transactionHash:hash('c'),blockHash:hash('d'),blockNumber:'0x222',logIndex:'0x0'
  });
  assert.equal(launch?.pool,pool);
  assert.equal(launch?.factoryVersion,'v1');
  assert.equal(launch?.initialBuyAmount,'42');
  assert.equal(Object.hasOwn(launch??{},'side'),false);
  assert.equal(Object.hasOwn(launch??{},'volume'),false);
});

test('PONS routes fail closed while the galaxy is disabled',async()=>{
  const response=await handlePonsGalaxyRequest(new Request('https://example.test/api/intelligence/pons/galaxy'),{});
  assert.equal(response.status,404);
  assert.equal((await response.json()).error,'feature_disabled');
});

test('market data can enrich only an already verified launch and never defines origin',()=>{
  const token=address('1');
  const market=normalizePonsMarketPairs(token,[
    {chainId:'base',baseToken:{address:token},liquidity:{usd:999999}},
    {chainId:'robinhood',baseToken:{address:address('9')},liquidity:{usd:999999}},
    {chainId:'robinhood',baseToken:{address:token,symbol:'MEME'},priceUsd:'0.01',liquidity:{usd:1200},volume:{h24:900}}
  ],1234);
  assert.equal(market?.symbol,'MEME');
  assert.equal(market?.liquidityUsd,1200);
  assert.equal(Object.hasOwn(market??{},'originGalaxyId'),false);
});
