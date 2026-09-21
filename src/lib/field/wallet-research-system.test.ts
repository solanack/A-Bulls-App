import test from "node:test";
import assert from "node:assert/strict";
import { buildWalletResearchSystemSnapshot } from "./wallet-research-system.ts";

test("queried wallet system keeps an honest empty sky",()=>{
  const snapshot=buildWalletResearchSystemSnapshot({ok:true,coverage:"empty",wallet:"11111111111111111111111111111111",walletKind:"solana",items:[],disclosure:"No retained wallet/token observations are indexed for this public address."});
  assert.equal(snapshot.particles.length,1);
  assert.equal(snapshot.particles[0]?.cosmicKind,"star");
  assert.equal(snapshot.particles[0]?.verificationState,"unavailable");
  assert.equal(snapshot.observedEventCount,0);
});

test("queried wallet system renders retained chain-qualified planets only",()=>{
  const snapshot=buildWalletResearchSystemSnapshot({ok:true,coverage:"fresh",wallet:"0x1111111111111111111111111111111111111111",walletKind:"evm",items:[
    {chainKey:"base",mint:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",eventCount:8,tradeCount:3,firstObservedAt:100,lastObservedAt:200,observedTokenFlow:12,confidence:.8,sourceKind:"provider-reported",sourceKinds:["provider-reported"]},
    {chainKey:"ethereum",mint:"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",eventCount:4,tradeCount:1,firstObservedAt:110,lastObservedAt:210,observedTokenFlow:2,confidence:.9,sourceKind:"observed",sourceKinds:["observed-fact"]},
  ],disclosure:"retained"});
  assert.equal(snapshot.particles.length,3);
  assert.equal(snapshot.particles[1]?.cosmicKind,"planet");
  assert.equal(snapshot.particles[1]?.metadata?.chainKey,"base");
  assert.equal(snapshot.particles[1]?.verificationState,"provider-reported");
  assert.equal(snapshot.particles[2]?.verificationState,"observed");
  assert.equal(snapshot.observedEventCount,12);
});
