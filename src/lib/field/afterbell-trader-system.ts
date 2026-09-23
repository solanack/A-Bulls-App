import type { FieldParticle, UniverseSnapshot } from "./types";
import { canonicalUniverseId } from "./galaxies.ts";

type AssetMeta={mint:string;symbol?:string|null;name?:string|null;cashSymbol?:string|null};
type HoldingMeta=AssetMeta&{observedNetAmount?:number;lastObservedAt?:number;sourceKind?:string};
type MostTradedMeta=AssetMeta&{uniqueAfterCloseTxCount?:number;eventCount?:number;lastObservedAt?:number};
type TradeMeta={mint:string;txId?:string|null;side:string;amount:number;blockTime:number;priceUsd?:number|null;priceSol?:number|null;source?:string;sourceKind?:string};
const arr=<T>(value:unknown):T[]=>Array.isArray(value)?value as T[]:[];
function planetPos(index:number,count:number):[number,number,number]{const angle=index/Math.max(1,count)*Math.PI*2-Math.PI/2,ring=index<5?29:48;return[Math.cos(angle)*ring,2+Math.sin(angle*2)*5,Math.sin(angle)*ring];}
function stableAssets(traderStar:FieldParticle){
  const traded=arr<AssetMeta>(traderStar.metadata?.tradedAssets).filter(item=>item&&typeof item.mint==="string");
  const holdings=arr<HoldingMeta>(traderStar.metadata?.holdings).filter(item=>item&&typeof item.mint==="string");
  const mostTraded=arr<MostTradedMeta>(traderStar.metadata?.mostTraded).filter(item=>item&&typeof item.mint==="string");
  const trades=arr<TradeMeta>(traderStar.metadata?.latestTrades).filter(item=>item&&typeof item.mint==="string"&&Number.isFinite(item.blockTime)).slice(0,3);
  const labels=new Map(traded.map(item=>[item.mint,item] as const)),ordered:string[]=[];
  for(const item of holdings)if(!ordered.includes(item.mint))ordered.push(item.mint);
  for(const item of mostTraded)if(!ordered.includes(item.mint))ordered.push(item.mint);
  for(const item of trades)if(!ordered.includes(item.mint))ordered.push(item.mint);
  for(const item of traded)if(!ordered.includes(item.mint))ordered.push(item.mint);
  return{trades,holdings,mostTraded,labels,mints:ordered.slice(0,10)};
}

export function buildAfterbellTraderSystemSnapshot(traderStar:FieldParticle):UniverseSnapshot{
  const wallet=typeof traderStar.metadata?.wallet==="string"?traderStar.metadata.wallet.trim():"",activity=stableAssets(traderStar),holdingByMint=new Map(activity.holdings.map(item=>[item.mint,item] as const)),mostByMint=new Map(activity.mostTraded.map(item=>[item.mint,item] as const));
  const particles:FieldParticle[]=[{...traderStar,id:canonicalUniverseId("star",wallet||traderStar.id,"afterbell"),position:[0,28,0],magnitudeBand:1,metadata:{...(traderStar.metadata??{}),systemRole:"focused-afterbell-trader-star"}}];
  for(const [index,mint] of activity.mints.entries()){
    const asset=activity.labels.get(mint),holding=holdingByMint.get(mint),most=mostByMint.get(mint),mintTrades=activity.trades.filter(item=>item.mint===mint),last=Math.max(holding?.lastObservedAt??0,most?.lastObservedAt??0,...mintTrades.map(item=>item.blockTime*1000),traderStar.observedAt);
    const basis=holding?"retained-holding":most?"most-traded":"retained-trade";
    particles.push({id:`afterbell-planet:${mint.toLowerCase()}`,kind:"token",cosmicKind:"planet",originGalaxyId:"solana-core",verificationState:mintTrades.some(item=>item.sourceKind==="observed-fact")||holding?.sourceKind==="retained-observed-flow"?"observed":"provider-reported",observedAt:last,category:"swap",magnitudeBand:Math.max(.46,.9-index*.045),position:planetPos(index,activity.mints.length),source:mintTrades[0]?.source??traderStar.source??null,metadata:{mint,symbol:asset?.symbol??holding?.symbol??most?.symbol??asset?.cashSymbol??null,name:asset?.name??holding?.name??most?.name??null,cashSymbol:asset?.cashSymbol??holding?.cashSymbol??most?.cashSymbol??null,chain:"solana",chainKey:"solana",wallet,traderWallet:wallet,afterbellEquity:true,observedNetAmount:holding?.observedNetAmount??null,uniqueAfterCloseTxCount:most?.uniqueAfterCloseTxCount??mintTrades.length,eventCount:most?.eventCount??mintTrades.length,systemRole:"afterbell-trader-position-planet",positionBasis:basis}});
  }
  for(const [index,trade] of activity.trades.entries()){
    const target=particles.find(p=>p.cosmicKind==="planet"&&p.metadata?.mint===trade.mint),end=(target?.position??[20-index*4,-6,18]) as [number,number,number],position:[number,number,number]=trade.side==="buy"?[end[0]*.55,end[1]+14,end[2]*.55]:[end[0]*1.45,end[1]+13,end[2]*1.45],observedAt=trade.blockTime*1000;
    particles.push({id:`afterbell-comet:${trade.txId??`${wallet}:${trade.blockTime}:${index}`}`,eventId:trade.txId??`afterbell:${wallet}:${trade.blockTime}:${index}`,kind:"trade",cosmicKind:"comet",originGalaxyId:"afterbell",verificationState:trade.sourceKind==="observed-fact"?"observed":"provider-reported",observedAt,category:"swap",magnitudeBand:.94-index*.085,position,source:trade.source??null,metadata:{signature:trade.txId??null,wallet,traderWallet:wallet,mint:trade.mint,chain:"solana",chainKey:"solana",side:trade.side,tokenAmount:trade.amount,priceUsd:trade.priceUsd??null,priceSol:trade.priceSol??null,entryTs:observedAt,sourceKind:trade.sourceKind??null,tradeOrder:index+1,systemRole:"afterbell-trade-comet"}});
  }
  const times=activity.trades.map(item=>item.blockTime*1000).filter(Number.isFinite),windowFrom=Number(traderStar.metadata?.windowFrom),windowTo=Number(traderStar.metadata?.windowTo),sources=[...new Set(activity.trades.map(item=>item.source).filter((value):value is string=>Boolean(value)))];
  return{galaxyId:"afterbell",windowStart:Number.isFinite(windowFrom)&&windowFrom>0?windowFrom*1000:times.length?Math.min(...times):traderStar.observedAt,windowEnd:Number.isFinite(windowTo)&&windowTo>0?windowTo*1000:times.length?Math.max(...times):traderStar.observedAt,observedEventCount:activity.trades.length,samplingPolicy:"selected Afterbell trader · holdings-first then most-traded xStock PLANETS · deduplicated maximum 10 · latest 3 retained after-close trade COMETS",coverageStatement:"Only retained Afterbell wallet/xStock evidence is shown. Holdings are bounded observed net flows, not a complete brokerage portfolio. Missing trades, prices, receipts, cost basis, or holdings remain unavailable.",sources:sources.length?sources:["a-bulls-indexed-solana-evidence"],particles};
}
