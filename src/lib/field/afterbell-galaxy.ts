import type { FieldParticle, UniverseSnapshot } from "./types";
import { canonicalUniverseId } from "./galaxies.ts";
import { afterbellFactLine } from "./trader-sheet.ts";
import type { AfterbellGalaxyData } from "../universe-data/afterbell-client.ts";
import type { AfterbellTraderResponse } from "../universe-data/afterbell-traders-client.ts";

function starPosition(wallet:string,rank:number):[number,number,number]{
  if(rank===1)return[0,14,0];
  // The narrow portrait frustum leaves less horizontal room than the desktop
  // view. Reserve that room for the STAR label, not just the glowing point.
  const inner=rank<=10,ring=inner?18:rank<=28?28:38,count=inner?9:18,start=inner?2:11;
  const rankAngle=((rank-start)/count)*Math.PI*2-Math.PI/2;
  // A small wallet-derived phase prevents rigid rows without allowing random
  // clustering to push the evidence STARS outside the mobile camera frame.
  let h=2166136261;for(let i=0;i<wallet.length;i++){h^=wallet.charCodeAt(i);h=Math.imul(h,16777619);}
  const phase=(h>>>0)/4294967295-.5,angle=rankAngle+phase*.16,y=(inner?2:-7)+Math.sin(angle*2)*5;
  return[Math.cos(angle)*ring,y,Math.sin(angle)*ring];
}
function walletCallsign(wallet:string){return wallet.length>=8?`${wallet.slice(0,4)}…${wallet.slice(-4)}`:wallet;}
function clamp01(v:number){return Math.max(.18,Math.min(1,Number.isFinite(v)?v:0));}

export function buildAfterbellGalaxySnapshot(markets:AfterbellGalaxyData,traders:AfterbellTraderResponse):UniverseSnapshot{
  const marketByMint=new Map(markets.planets.map(item=>[item.mint,item] as const));
  const particles:FieldParticle[]=traders.items.slice(0,50).map(item=>{
    const tradedAssets=item.mints.map(mint=>{const market=marketByMint.get(mint);return{mint,symbol:market?.symbol??null,name:market?.name??null,cashSymbol:market?.cashSymbol??null};});
    const holdings=item.holdings.map(row=>{const market=marketByMint.get(row.mint);return{...row,symbol:market?.symbol??null,name:market?.name??null,cashSymbol:market?.cashSymbol??null};});
    const mostTraded=item.mostTraded.map(row=>{const market=marketByMint.get(row.mint);return{...row,symbol:market?.symbol??null,name:market?.name??null,cashSymbol:market?.cashSymbol??null};});
    const displayName=(item.displayName||walletCallsign(item.wallet)).trim();
    const particle:FieldParticle={id:canonicalUniverseId("star",item.wallet,"afterbell"),kind:"wallet",cosmicKind:"star",originGalaxyId:"afterbell",verificationState:item.sourceKind==="observed"?"observed":"provider-reported",observedAt:item.lastObservedAt,category:"swap",magnitudeBand:clamp01(.44+Math.log10(1+item.uniqueAfterCloseTxCount)/2.7),position:starPosition(item.wallet,item.rank),source:item.sources[0]??null,metadata:{name:displayName,displayName,displayNameSource:item.displayNameSource||"wallet-callsign",wallet:item.wallet,chainKey:"solana",afterbellTrader:true,afterbellRank:item.rank,transactionCount:item.transactionCount,uniqueAfterCloseTxCount:item.uniqueAfterCloseTxCount,eventCount:item.eventCount,buyCount:item.buyCount,sellCount:item.sellCount,assetCount:item.assetCount,mints:[...item.mints],tradedAssets,holdings,mostTraded,latestTrades:item.latestTrades.slice(0,3).map(trade=>({...trade})),realizedPnlUsd:item.realizedPnlUsd,realizedPnlSol:item.realizedPnlSol,pnlAvailable:item.realizedPnlUsd!=null||item.realizedPnlSol!=null,sourceKind:item.sourceKind,sources:[...item.sources],windowFrom:traders.window?.from??null,windowTo:traders.window?.to??null,windowLabel:traders.window?.label??null,calendarCoverage:traders.window?.calendarCoverage??null,systemRole:"afterbell-trader-star",interactive:true}};
    particle.metadata={...particle.metadata,factLine:afterbellFactLine(particle.metadata)};
    return particle;
  });
  const times=particles.map(item=>item.observedAt).filter(Number.isFinite),now=Date.now(),sources=[...new Set([...particles.map(item=>item.source),markets.source].filter((value):value is string=>Boolean(value)))];
  return{galaxyId:"afterbell",windowStart:traders.window?.from?traders.window.from*1000:times.length?Math.min(...times):now,windowEnd:traders.window?.to?traders.window.to*1000:times.length?Math.max(...times):now,observedEventCount:traders.items.reduce((sum,item)=>sum+item.eventCount,0),samplingPolicy:"Afterbell Top 50 public-wallet traders across supported xStocks · ranked only by unique retained after-close transactions · identity labels are retained-source aliases or deterministic wallet callsigns",coverageStatement:`${traders.disclosure} Market labels are venue-reported context only.`,sources:sources.length?sources:["a-bulls-indexed-solana-evidence"],particles};
}
