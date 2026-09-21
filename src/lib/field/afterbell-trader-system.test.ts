import test from "node:test";
import assert from "node:assert/strict";
import { buildAfterbellTraderSystemSnapshot } from "./afterbell-trader-system.ts";
import type { FieldParticle } from "./types.ts";

const MINT="Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh";
const planet:FieldParticle={id:`planet:solana-core:${MINT}`,kind:"token",cosmicKind:"planet",originGalaxyId:"solana-core",verificationState:"provider-reported",observedAt:1,category:"swap",magnitudeBand:.8,position:[0,0,0],source:"DexScreener venue-reported",metadata:{mint:"Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",symbol:"NVDAx",afterbellEquity:true}};

test("Afterbell empty evidence keeps only the xStock planet",()=>{
  const snapshot=buildAfterbellTraderSystemSnapshot(planet,{ok:true,coverage:"empty",mint:MINT,items:[],disclosure:"No retained xStock wallet trades are indexed in this Afterbell window."});
  assert.equal(snapshot.particles.length,1);
  assert.equal(snapshot.particles[0]?.metadata?.systemRole,"afterbell-xstock-core");
  assert.equal(snapshot.observedEventCount,0);
});

test("Afterbell trader stars preserve transaction rank and unavailable PnL",()=>{
  const snapshot=buildAfterbellTraderSystemSnapshot(planet,{ok:true,coverage:"fresh",mint:MINT,window:{from:100,to:200,scheduledEnd:200,live:false,timezone:"America/New_York",label:"AFTER CLOSE",calendarCoverage:"weekday"},items:[{rank:1,wallet:"11111111111111111111111111111111",transactionCount:9,eventCount:11,buyCount:5,sellCount:6,realizedPnlUsd:null,realizedPnlSol:null,lastObservedAt:200000,sourceKind:"observed",sources:["bull_wallet_events"]}],disclosure:"retained"});
  const star=snapshot.particles[1];
  assert.equal(star?.cosmicKind,"star");
  assert.equal(star?.metadata?.afterbellRank,1);
  assert.equal(star?.metadata?.transactionCount,9);
  assert.equal(star?.metadata?.pnlAvailable,false);
  assert.equal(star?.metadata?.wallet,"11111111111111111111111111111111");
});
