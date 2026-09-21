import assert from "node:assert/strict";
import test from "node:test";
import { buildFomoTraderSystemSnapshot } from "./fomo-trader-system.ts";

const solanaWallet="9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU";
const evmWallet="0x1111111111111111111111111111111111111111";
const solanaMint="5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump";
const baseToken="0x2222222222222222222222222222222222222222";

function response(){return {
  ok:true,coverage:"partial",disclosure:"test",
  trader:{rank:1,handle:"tester",displayName:"Tester",reportedPnlUsd:null,reportedVolumeUsd:null,reportedTradeCount:null,followerCount:null,solanaWallet,evmWallet,avatarUrl:null,topTokens:[],capturedAt:1_789_500_000_000,source:"fomoapi.io"},
  positions:[
    {rank:1,mint:baseToken,symbol:"BASE",name:"Base token",chain:"base",networkId:"base",sourceKind:"fomo-reported",observedNetTokenFlow:null,tradeCount:null,eventCount:null,lastObservedAt:null},
    {rank:2,mint:solanaMint,symbol:"SOLT",name:"Solana token",chain:"solana",networkId:"solana",sourceKind:"fomo-reported",observedNetTokenFlow:null,tradeCount:null,eventCount:null,lastObservedAt:null},
  ],
  latestTrades:[{signature:null,wallet:solanaWallet,mint:baseToken,side:"buy",solAmount:0,tokenAmount:1,priceSol:null,observedAt:1_789_500_100_000,source:"fomoapi.io/trades",sourceKind:"fomo-reported-position-event"}],
} as any;}

test("Fomo position planets use the wallet for their own chain",()=>{
  const snapshot=buildFomoTraderSystemSnapshot(response()),base=snapshot.particles.find(item=>item.cosmicKind==="planet"&&item.metadata?.mint===baseToken),solana=snapshot.particles.find(item=>item.cosmicKind==="planet"&&item.metadata?.mint===solanaMint);
  assert.equal(base?.metadata?.chainKey,"base");
  assert.equal(base?.metadata?.wallet,evmWallet);
  assert.equal(solana?.metadata?.chainKey,"solana");
  assert.equal(solana?.metadata?.wallet,solanaWallet);
});

test("Fomo trade comets repair a mismatched provider wallet from the token chain",()=>{
  const snapshot=buildFomoTraderSystemSnapshot(response()),comet=snapshot.particles.find(item=>item.cosmicKind==="comet"&&item.metadata?.mint===baseToken);
  assert.equal(comet?.metadata?.chainKey,"base");
  assert.equal(comet?.metadata?.wallet,evmWallet);
  assert.notEqual(comet?.metadata?.wallet,solanaWallet);
});
test("Fomo trade comets preserve the provider chain even when the traded token is not in top positions",()=>{
  const data=response();
  data.latestTrades=[{...data.latestTrades[0],mint:"0x3333333333333333333333333333333333333333",chain:"base"}];
  const snapshot=buildFomoTraderSystemSnapshot(data),comet=snapshot.particles.find(item=>item.cosmicKind==="comet");
  assert.equal(comet?.metadata?.chainKey,"base");
  assert.equal(comet?.metadata?.wallet,evmWallet);
});
