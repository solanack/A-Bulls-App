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


test("numeric Fomo Solana network ids keep planets and comets on the Solana subject wallet",()=>{
  const data=response();
  data.positions=[{...data.positions[0],chain:"1399811149",networkId:"1399811149"}];
  data.latestTrades=[{...data.latestTrades[0],chain:"1399811149",mint:data.positions[0].mint}];
  const snapshot=buildFomoTraderSystemSnapshot(data),planet=snapshot.particles.find(item=>item.cosmicKind==="planet"),comet=snapshot.particles.find(item=>item.cosmicKind==="comet");
  assert.equal(planet?.metadata?.chainKey,"solana");
  assert.equal(comet?.metadata?.chainKey,"solana");
  assert.equal(comet?.metadata?.wallet,solanaWallet);
});


test("Fomo trader system keeps the STAR at the core and every position PLANET outside radius 40",()=>{
  const snapshot=buildFomoTraderSystemSnapshot(response()),star=snapshot.particles.find(item=>item.cosmicKind==="star"),planets=snapshot.particles.filter(item=>item.cosmicKind==="planet"),comets=snapshot.particles.filter(item=>item.cosmicKind==="comet");
  assert.equal(star?.position[0],0);
  assert.equal(star?.position[2],0);
  for(const planet of planets)assert.ok(Math.hypot(planet.position[0],planet.position[2])>=40,`planet inside empty core: ${planet.position}`);
  for(const comet of comets)assert.ok(Math.hypot(comet.position[0],comet.position[2])>=72,`comet left outer lane: ${comet.position}`);
});

test("Fomo ten-planet trader layout uses full-circle slots with wide same-ring separation",()=>{
  const data=response();
  data.positions=Array.from({length:10},(_,index)=>({rank:index+1,mint:`0x${String(index+1).padStart(40,"0")}`,symbol:`T${index+1}`,name:`Token ${index+1}`,chain:"base",networkId:"base",sourceKind:"fomo-reported",observedNetTokenFlow:null,tradeCount:null,eventCount:null,lastObservedAt:null}));
  data.latestTrades=[];
  const planets=buildFomoTraderSystemSnapshot(data).particles.filter(item=>item.cosmicKind==="planet");
  assert.equal(planets.length,10);
  const angles=planets.map(item=>({r:Math.hypot(item.position[0],item.position[2]),a:Math.atan2(item.position[2],item.position[0])}));
  for(let i=0;i<angles.length;i++)for(let j=i+1;j<angles.length;j++){
    if(Math.abs(angles[i].r-angles[j].r)>1e-6)continue;
    let delta=Math.abs(angles[i].a-angles[j].a);delta=Math.min(delta,Math.PI*2-delta);
    assert.ok(delta>=28*Math.PI/180,`same-ring PLANETS too close: ${delta*180/Math.PI}deg`);
  }
});
