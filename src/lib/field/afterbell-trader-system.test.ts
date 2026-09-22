import test from "node:test";
import assert from "node:assert/strict";
import { buildAfterbellTraderSystemSnapshot } from "./afterbell-trader-system.ts";
import type { FieldParticle } from "./types.ts";

const MINT="Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",WALLET="11111111111111111111111111111111";
const star:FieldParticle={id:`star:afterbell:${WALLET}`,kind:"wallet",cosmicKind:"star",originGalaxyId:"afterbell",verificationState:"observed",observedAt:200000,category:"swap",magnitudeBand:1,position:[0,0,0],source:"chain",metadata:{wallet:WALLET,afterbellTrader:true,afterbellRank:1,windowFrom:100,windowTo:200,tradedAssets:[{mint:MINT,symbol:"NVDAx",name:"NVIDIA",cashSymbol:"NVDA"}],latestTrades:[{mint:MINT,txId:"sig-1",side:"buy",amount:2,blockTime:150,priceUsd:123,priceSol:null,source:"chain",sourceKind:"observed-fact"}]}};

test("Afterbell trader descent centers the trader and exposes traded stock PLANETS plus trade COMETS",()=>{
 const snapshot=buildAfterbellTraderSystemSnapshot(star);assert.equal(snapshot.galaxyId,"afterbell");assert.equal(snapshot.particles[0]?.cosmicKind,"star");assert.equal(snapshot.particles.filter(item=>item.cosmicKind==="planet").length,1);assert.equal(snapshot.particles.filter(item=>item.cosmicKind==="comet").length,1);const comet=snapshot.particles.find(item=>item.cosmicKind==="comet");assert.equal(comet?.metadata?.wallet,WALLET);assert.equal(comet?.metadata?.mint,MINT);assert.equal(comet?.metadata?.entryTs,150000);
});
