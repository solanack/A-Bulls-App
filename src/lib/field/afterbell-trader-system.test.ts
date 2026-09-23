import test from "node:test";
import assert from "node:assert/strict";
import { buildAfterbellTraderSystemSnapshot } from "./afterbell-trader-system.ts";
import type { FieldParticle } from "./types.ts";
import { readFileSync } from "node:fs";

const A="Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",B="XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",C="So11111111111111111111111111111111111111112",WALLET="11111111111111111111111111111111";
function traderStar(overrides:Record<string,unknown>={}):FieldParticle{return{id:`star:afterbell:${WALLET}`,kind:"wallet",cosmicKind:"star",originGalaxyId:"afterbell",verificationState:"observed",observedAt:200000,category:"swap",magnitudeBand:1,position:[0,0,0],source:"chain",metadata:{wallet:WALLET,name:"1111…1111",displayName:"1111…1111",displayNameSource:"wallet-callsign",afterbellTrader:true,afterbellRank:1,uniqueAfterCloseTxCount:5,windowFrom:100,windowTo:200,tradedAssets:[{mint:A,symbol:"NVDAx",name:"NVIDIA",cashSymbol:"NVDA"},{mint:B,symbol:"TSLAx",name:"Tesla",cashSymbol:"TSLA"},{mint:C,symbol:"SOLx",name:"Fixture",cashSymbol:"SOL"}],holdings:[{mint:B,observedNetAmount:4,lastObservedAt:190000,sourceKind:"retained-observed-flow"},{mint:A,observedNetAmount:2,lastObservedAt:180000,sourceKind:"retained-observed-flow"}],mostTraded:[{mint:A,uniqueAfterCloseTxCount:5,eventCount:5,lastObservedAt:195000},{mint:C,uniqueAfterCloseTxCount:3,eventCount:3,lastObservedAt:185000}],latestTrades:[{mint:A,txId:"sig-1",side:"buy",amount:2,blockTime:190,priceUsd:123,priceSol:null,source:"chain",sourceKind:"observed-fact"},{mint:B,txId:"sig-2",side:"sell",amount:1,blockTime:180,priceUsd:222,priceSol:null,source:"chain",sourceKind:"observed-fact"},{mint:A,txId:"sig-3",side:"buy",amount:1,blockTime:170,priceUsd:120,priceSol:null,source:"chain",sourceKind:"observed-fact"},{mint:C,txId:"sig-4",side:"buy",amount:1,blockTime:160,priceUsd:10,priceSol:null,source:"chain",sourceKind:"observed-fact"}],...overrides}};}

test("Afterbell trader descent is holdings-first, then most-traded, deduped to ten PLANETS with three COMETS",()=>{
 const snapshot=buildAfterbellTraderSystemSnapshot(traderStar());
 const planets=snapshot.particles.filter(item=>item.cosmicKind==="planet"),comets=snapshot.particles.filter(item=>item.cosmicKind==="comet");
 assert.equal(snapshot.galaxyId,"afterbell");
 assert.equal(snapshot.particles[0]?.cosmicKind,"star");
 assert.deepEqual(planets.map(item=>item.metadata?.mint),[B,A,C]);
 assert.equal(planets[0]?.metadata?.positionBasis,"retained-holding");
 assert.equal(planets[2]?.metadata?.positionBasis,"most-traded");
 assert.equal(comets.length,3);
 assert.deepEqual(comets.map(item=>item.metadata?.signature),["sig-1","sig-2","sig-3"]);
 assert.equal(snapshot.samplingPolicy.includes("maximum 10"),true);
});

test("Afterbell trader system remains honestly empty when retained activity is unavailable",()=>{
 const snapshot=buildAfterbellTraderSystemSnapshot(traderStar({tradedAssets:[],holdings:[],mostTraded:[],latestTrades:[]}));
 assert.equal(snapshot.particles.length,1);
 assert.equal(snapshot.particles[0]?.cosmicKind,"star");
 assert.equal(snapshot.observedEventCount,0);
 assert.match(snapshot.coverageStatement,/Missing.*remain unavailable/i);
});

test("Afterbell trader system never renders more than ten PLANETS",()=>{
 const assets=Array.from({length:14},(_,index)=>({mint:`Mint${String(index).padStart(40,"1")}`,symbol:`X${index}`}));
 const snapshot=buildAfterbellTraderSystemSnapshot(traderStar({tradedAssets:assets,holdings:assets.map((item,index)=>({...item,observedNetAmount:20-index,lastObservedAt:190000-index,sourceKind:"retained-observed-flow"})),mostTraded:[],latestTrades:[]}));
 assert.equal(snapshot.particles.filter(item=>item.cosmicKind==="planet").length,10);
});


test("Afterbell STAR selection creates a wallet-only thread and mint enters only after PLANET or COMET selection",()=>{
 const fieldOs=readFileSync(new URL("./field-os.ts",import.meta.url),"utf8");
 const start=fieldOs.indexOf("async enterAfterbellTraderSystem");
 const end=fieldOs.indexOf("async enterFomoTraderSystem",start);
 const starMethod=fieldOs.slice(start,end);
 assert.match(starMethod,/createResearchThreadContext\(\{galaxyId:"afterbell",chainKey:"solana",wallet,displayName:label,fromTs:snapshot\.windowStart,toTs:snapshot\.windowEnd,replaySpeed:/);
 assert.doesNotMatch(starMethod,/firstMint|mint:firstMint/);
 assert.match(fieldOs,/particle\.cosmicKind==="planet"&&mint\)\{this\.#selectTraderPlanet\(particle,mint\)/);
 assert.match(fieldOs,/wallet,displayName:section\.trader\?\.identity\?\?section\.label,mint,symbol:/);
 assert.match(fieldOs,/entrySignature:signature/);
});
