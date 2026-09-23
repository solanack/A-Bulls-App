import test from "node:test";
import assert from "node:assert/strict";
import { buildAfterbellGalaxySnapshot } from "./afterbell-galaxy.ts";
import { createUniverseMapSnapshot } from "./synthetic-universe.ts";
import { GALAXY_ORIGIN_CHIPS } from "./galaxies.ts";
import { selectAfterbellPair, type AfterbellGalaxyData } from "../universe-data/afterbell-client.ts";

test("Afterbell opens as a trader-first Top 50 STAR field across supported xStocks",()=>{
  const data:AfterbellGalaxyData={ok:true,coverage:"fresh",source:"DexScreener venue-reported",disclosure:"fixture",planets:[{mint:"Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",symbol:"NVDAx",name:"NVIDIA",cashSymbol:"NVDA",issuer:"xStocks",priceUsd:123.45,change24h:1.2,volume24h:5_000_000,liquidityUsd:2_000_000,source:"DexScreener venue-reported",observedAt:1_789_000_000_000}]};
  const traders={ok:true,coverage:"fresh" as const,mint:"",mints:data.planets.map(item=>item.mint),window:{from:100,to:200,scheduledEnd:200,live:false,timezone:"America/New_York",label:"AFTER CLOSE",calendarCoverage:"weekday"},items:[{rank:1,wallet:"11111111111111111111111111111111",transactionCount:4,uniqueAfterCloseTxCount:4,eventCount:4,buyCount:3,sellCount:1,displayName:"1111…1111",displayNameSource:"wallet-callsign",assetCount:1,mints:[data.planets[0].mint],holdings:[{mint:data.planets[0].mint,observedNetAmount:2,lastObservedAt:150000,sourceKind:"retained-observed-flow"}],mostTraded:[{mint:data.planets[0].mint,uniqueAfterCloseTxCount:4,eventCount:4,lastObservedAt:150000}],latestTrades:[{mint:data.planets[0].mint,txId:"sig",side:"buy" as const,amount:1,blockTime:150,priceUsd:123,priceSol:null,source:"chain",sourceKind:"observed-fact"}],realizedPnlUsd:null,realizedPnlSol:null,lastObservedAt:150000,sourceKind:"observed" as const,sources:["chain"]}],disclosure:"retained"};
  const snapshot=buildAfterbellGalaxySnapshot(data,traders);assert.equal(snapshot.galaxyId,"afterbell");assert.equal(snapshot.particles.length,1);const star=snapshot.particles[0];assert.equal(star.cosmicKind,"star");assert.equal(star.metadata?.afterbellTrader,true);assert.equal(star.metadata?.afterbellRank,1);assert.equal(star.metadata?.name,"1111…1111");assert.equal(star.metadata?.displayNameSource,"wallet-callsign");assert.equal(star.metadata?.uniqueAfterCloseTxCount,4);assert.equal(star.metadata?.assetCount,1);assert.equal((star.metadata?.tradedAssets as unknown[]).length,1);
  assert.deepEqual(star.position,[0,14,0],"rank-one STAR should remain centered inside the camera-safe composition");
});

test("Afterbell trader STARS use bounded rank rings that remain inside the mobile composition",()=>{
  const mint="Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",markets:AfterbellGalaxyData={ok:true,coverage:"fresh",source:"DexScreener venue-reported",disclosure:"fixture",planets:[{mint,symbol:"NVDAx",name:"NVIDIA",cashSymbol:"NVDA",issuer:"xStocks",priceUsd:123,change24h:null,volume24h:1,liquidityUsd:1,source:"DexScreener venue-reported",observedAt:1}]};
  const items=Array.from({length:50},(_,index)=>({rank:index+1,wallet:`${String(index+1).padStart(32,"1")}`,transactionCount:1,uniqueAfterCloseTxCount:1,eventCount:1,buyCount:1,sellCount:0,displayName:`STAR-${index+1}`,displayNameSource:"fixture",assetCount:1,mints:[mint],holdings:[],mostTraded:[{mint,uniqueAfterCloseTxCount:1,eventCount:1,lastObservedAt:1}],latestTrades:[],realizedPnlUsd:null,realizedPnlSol:null,lastObservedAt:1,sourceKind:"observed" as const,sources:["chain"]}));
  const snapshot=buildAfterbellGalaxySnapshot(markets,{ok:true,coverage:"fresh",mint:"",mints:[mint],window:{from:1,to:2,scheduledEnd:2,live:false,timezone:"America/New_York",label:"AFTER CLOSE",calendarCoverage:"weekday"},items,disclosure:"retained"});
  assert.equal(snapshot.particles.length,50);
  for(const particle of snapshot.particles){const [x,y,z]=particle.position;assert.ok(Math.hypot(x,z)<=38.001,"STAR escaped the portrait-safe label radius");assert.ok(Math.abs(x)<=38.001,"STAR x-position left insufficient horizontal label clearance");assert.ok(y>=-12&&y<=14,`STAR y=${y} escaped the camera-safe vertical band`);}
});

test("Afterbell pair selection rejects other chains and ranks exact-symbol Solana venues by liquidity",()=>{
  const pair=selectAfterbellPair("NVDAx",[{chainId:"base",baseToken:{symbol:"NVDAx",address:"base"},priceUsd:"10",liquidity:{usd:9999999}},{chainId:"solana",baseToken:{symbol:"OTHER",address:"bad"},priceUsd:"10",liquidity:{usd:9999999}},{chainId:"solana",baseToken:{symbol:"NVDAx",address:"low"},priceUsd:"100",liquidity:{usd:100}},{chainId:"solana",baseToken:{symbol:"NVDAx",address:"high"},priceUsd:"101",liquidity:{usd:1000}}]);
  assert.equal(pair?.mint,"high");assert.equal(pair?.priceUsd,101);
});


test("Galaxy Zero exposes Fomo and Afterbell as sibling portals and public navigation origins",()=>{
  const snapshot=createUniverseMapSnapshot(800,861);
  const targets=[...new Set(snapshot.particles.map(particle=>particle.metadata?.targetGalaxyId).filter(Boolean))].sort();
  assert.deepEqual(targets,["afterbell","fomo"]);
  assert.deepEqual(GALAXY_ORIGIN_CHIPS.map(item=>item.label),["FIELD","FOMO","AFTERBELL"]);
  const afterbell=snapshot.particles.find(particle=>particle.metadata?.targetGalaxyId==="afterbell"&&particle.metadata?.galaxyRole==="core");
  assert.ok(afterbell,"Galaxy Zero is missing its Afterbell core portal");
  assert.equal(afterbell?.cosmicKind,"galaxy");
  assert.equal(afterbell?.originGalaxyId,"galaxy-zero");
});


test("Afterbell STAR identities never fall back to numeric rank labels",()=>{
  const mint="Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",markets:AfterbellGalaxyData={ok:true,coverage:"fresh",source:"DexScreener venue-reported",disclosure:"fixture",planets:[{mint,symbol:"NVDAx",name:"NVIDIA",cashSymbol:"NVDA",issuer:"xStocks",priceUsd:123,change24h:null,volume24h:1,liquidityUsd:1,source:"DexScreener venue-reported",observedAt:1}]};
  const wallet="9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU",traders={ok:true,coverage:"fresh" as const,mint:"",mints:[mint],window:{from:1,to:2,scheduledEnd:2,live:false,timezone:"America/New_York",label:"AFTER CLOSE",calendarCoverage:"weekday"},items:[{rank:7,wallet,transactionCount:2,uniqueAfterCloseTxCount:2,eventCount:2,buyCount:1,sellCount:1,displayName:"9P6E…7pfU",displayNameSource:"wallet-callsign",assetCount:1,mints:[mint],holdings:[],mostTraded:[{mint,uniqueAfterCloseTxCount:2,eventCount:2,lastObservedAt:1}],latestTrades:[],realizedPnlUsd:null,realizedPnlSol:null,lastObservedAt:1,sourceKind:"observed" as const,sources:["chain"]}],disclosure:"retained"};
  const star=buildAfterbellGalaxySnapshot(markets,traders).particles[0];
  assert.equal(star.metadata?.name,"9P6E…7pfU");
  assert.doesNotMatch(String(star.metadata?.name),/AFTERBELL\s*#/i);
});
