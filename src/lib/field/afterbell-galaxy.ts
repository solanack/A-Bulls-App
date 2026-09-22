import type { FieldParticle, UniverseSnapshot } from "./types";
import { canonicalUniverseId } from "./galaxies.ts";
import type { AfterbellGalaxyData } from "../universe-data/afterbell-client.ts";
import type { AfterbellTraderResponse } from "../universe-data/afterbell-traders-client.ts";

function hashUnit(input:string){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0)/4294967295;}
function starPosition(wallet:string,rank:number):[number,number,number]{const angle=hashUnit(wallet)*Math.PI*2,ring=rank<=10?28:rank<=28?45:62,y=10+hashUnit(wallet+":y")*48+(rank<=10?8:0);return[Math.cos(angle)*ring,y,Math.sin(angle)*ring];}
function clamp01(v:number){return Math.max(.18,Math.min(1,Number.isFinite(v)?v:0));}

export function buildAfterbellGalaxySnapshot(markets:AfterbellGalaxyData,traders:AfterbellTraderResponse):UniverseSnapshot{
  const marketByMint=new Map(markets.planets.map(item=>[item.mint,item] as const));
  const particles:FieldParticle[]=traders.items.slice(0,50).map(item=>{
    const tradedAssets=item.mints.map(mint=>{const market=marketByMint.get(mint);return{mint,symbol:market?.symbol??null,name:market?.name??null,cashSymbol:market?.cashSymbol??null};});
    return{id:canonicalUniverseId("star",item.wallet,"afterbell"),kind:"wallet",cosmicKind:"star",originGalaxyId:"afterbell",verificationState:item.sourceKind==="observed"?"observed":"provider-reported",observedAt:item.lastObservedAt,category:"swap",magnitudeBand:clamp01(.44+Math.log10(1+item.transactionCount)/2.7),position:starPosition(item.wallet,item.rank),source:item.sources[0]??null,metadata:{name:`AFTERBELL #${item.rank}`,wallet:item.wallet,chainKey:"solana",afterbellTrader:true,afterbellRank:item.rank,transactionCount:item.transactionCount,eventCount:item.eventCount,buyCount:item.buyCount,sellCount:item.sellCount,assetCount:item.assetCount,mints:[...item.mints],tradedAssets,latestTrades:item.latestTrades.map(trade=>({...trade})),realizedPnlUsd:item.realizedPnlUsd,realizedPnlSol:item.realizedPnlSol,pnlAvailable:item.realizedPnlUsd!=null||item.realizedPnlSol!=null,sourceKind:item.sourceKind,sources:[...item.sources],windowFrom:traders.window?.from??null,windowTo:traders.window?.to??null,systemRole:"afterbell-trader-star",interactive:true}};
  });
  const times=particles.map(item=>item.observedAt).filter(Number.isFinite),now=Date.now(),sources=[...new Set([...particles.map(item=>item.source),markets.source].filter((value):value is string=>Boolean(value)))];
  return{galaxyId:"afterbell",windowStart:traders.window?.from?traders.window.from*1000:times.length?Math.min(...times):now,windowEnd:traders.window?.to?traders.window.to*1000:times.length?Math.max(...times):now,observedEventCount:traders.items.reduce((sum,item)=>sum+item.eventCount,0),samplingPolicy:"Afterbell Top 50 traders across supported xStocks · unique retained after-close transactions · PnL only from defensible per-asset FIFO receipt basis",coverageStatement:`${traders.disclosure} Market labels are venue-reported context only.`,sources:sources.length?sources:["a-bulls-indexed-solana-evidence"],particles};
}
