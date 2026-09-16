import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalChainAddress,chainQualifiedId,fomoChainTargets,isValidChainAddress,normalizeChainKey,providerChainConfig,resolveChain,rpcCandidatesForChain,__chainRegistryContract } from './intelligence-chain-registry.mjs';

const EVM='0xAbCdEfabcdefABCDEFabcdefabcdefABCDEFabcd';
const SOL='5AhfPStn66hRYoNNDfJHSDgCH7fBbwMQZUECRrhTo62F';

test('normalizes Fomo chain aliases without collapsing chain identity',()=>{
  assert.equal(normalizeChainKey('BNB Chain'),'bsc');
  assert.equal(normalizeChainKey('Robinhood Chain'),'robinhood');
  assert.equal(normalizeChainKey('SOL'),'solana');
  assert.equal(resolveChain('Base').chainId,8453);
  assert.equal(resolveChain('Monad').chainId,143);
});

test('chain-qualified IDs canonicalize EVM but preserve Solana casing',()=>{
  assert.equal(canonicalChainAddress('base',EVM),EVM.toLowerCase());
  assert.equal(chainQualifiedId('base',EVM),`base:${EVM.toLowerCase()}`);
  assert.equal(chainQualifiedId('solana',SOL),`solana:${SOL}`);
  assert.equal(isValidChainAddress('base',SOL),false);
  assert.equal(isValidChainAddress('solana',EVM),false);
});

test('future EVM chains can route market data without pretending RPC coverage',()=>{
  const dynamic=resolveChain('future-chain',{address:EVM});
  assert.equal(dynamic.key,'future-chain');
  assert.equal(dynamic.kind,'evm');
  assert.equal(providerChainConfig('future-chain',EVM).dexScreenerId,'future-chain');
  assert.deepEqual(rpcCandidatesForChain({},'future-chain',EVM),[]);
});

test('RPC candidates prefer configured endpoints and bound public fallbacks',()=>{
  const configured=rpcCandidatesForChain({BASE_RPC_URL:'https://private.example',MULTICHAIN_PUBLIC_RPC_FALLBACKS:'true'},'base',EVM);
  assert.equal(configured[0].url,'https://private.example');
  assert.ok(configured.some(item=>item.url.includes('publicnode.com')));
  const robinhood=rpcCandidatesForChain({PONS_RPC_URL:'https://robinhood.example'},'robinhood',EVM);
  assert.equal(robinhood.length,1);
  assert.equal(robinhood[0].url,'https://robinhood.example');
});

test('registry includes current Fomo coverage targets and remains read only',()=>{
  for(const chain of ['solana','base','bsc','monad','robinhood','arc'])assert.ok(fomoChainTargets().includes(chain));
  assert.equal(__chainRegistryContract.readOnly,true);
  assert.equal(__chainRegistryContract.noCrossChainIdentityInference,true);
});
