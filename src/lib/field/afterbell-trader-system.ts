import type { FieldParticle, UniverseSnapshot } from "./types";
import { canonicalUniverseId } from "./galaxies.ts";

type AssetMeta={mint:string;symbol?:string|null;name?:string|null;cashSymbol?:string|null};
type HoldingMeta={mint:string;observedNetAmount:number;lastObservedAt:number;sourceKind?:string;symbol?:string|null;name?:string|null;cashSymbol?:string|null};
type MostTradedMeta={mint:string;uniqueAfterCloseTxCount:number;eventCount:number;lastObservedAt:number;symbol?:string|null;name?:string|null;cashSymbol?:string|null};
type TradeMeta={mint:string;txId?:string|null;side:string;amount:number;blockTime:number;priceUsd?:number|null;priceSol?:number|null;source?:string;sourceKind?:string};
const arr=<T>(value:unknown):T[]=>Array.isArray(value)?value as T[]:[];
function planetPos(index:number,count:number):[number,number,number]{const angle=index/Math.max(1,count)*Math.PI*2-Math.PI/2,ring=index<5?29:48;return[Math.cos(angle)*ring,2+Math.sin(angle*2)*5,Math.sin(angle)*ring];}

export function buildAfterbellTraderSystemSnapshot(traderStar:FieldParticle):UniverseSnapshot{
  const wallet=typeof traderStar.metadata?.wallet==="string"?traderStar.metadata.wallet.trim():"";
  const assets=arr<AssetMeta>(traderStar.metadata?.tradedAssets).filter(item=>item&&typeof item.mint==="string");
  const holdings=arr<HoldingMeta>(traderStar.metadata?.holdings).filter(item=>item&&typeof item.mint==="string"&&Number(item.observedNetAmount)>0);
  const mostTraded=arr<MostTradedMeta>(traderStar.metadata?.mostTraded).filter(item=>item&&typeof item.mint==="string");
  const trades=arr<TradeMeta>(traderStar.metadata?.latestTrades).filter(item=>item&&typeof item.mint==="string"&&Number.isFinite(item.blockTime)).slice(0,3);
  const assetMap=new Map(assets.map(item=>[item.mint,item] as const));
  const holdingMap=new Map(holdings.map(item=>[item.mint,item] as const));
  const tradedMap=new Map(mostTraded.map(item=>[item.mint,item] as const));
  const orderedMints:string[]=[];
  for(const item of holdings)if(!orderedMints.includes(item.mint))orderedMints.push(item.mint);
  for(const item of mostTraded)if(!orderedMints.includes(item.mint))orderedMints.push(item.mint);
  const uniqueMints=orderedMints.slice(0,10);
  const particles:FieldParticle[]=[{...traderStar,id:canonicalUniverseId("star",wallet||traderStar.id,"afterbell"),position:[0,28,0],magnitudeBand:1,metadata:{...(traderStar.metadata??{}),systemRole:"focused-afterbell-trader-star"}}];

  for(const [index,mint] of uniqueMints.entries()){
    const asset=assetMap.get(mint),holding=holdingMap.get(mint),traded=tradedMap.get(mint),mintTrades=trades.filter(item=>item.mint===mint);
    const last=Math.max(holding?.lastObservedAt??0,traded?.lastObservedAt??0,...mintTrades.map(item=>item.blockTime*1000),traderStar.observedAt);
    const sourceKind=holding?"observed":mintTrades.some(item=>item.sourceKind==="observed-fact")?"observed":"provider-reported";
    particles.push({
      id:`afterbell-planet:${mint.toLowerCase()}`,kind:"token",cosmicKind:"planet",originGalaxyId:"solana-core",verificationState:sourceKind,observedAt:last,category:"swap",
      magnitudeBand:.9-index*.05,position:planetPos(index,uniqueMints.length),source:mintTrades[0]?.source??traderStar.source??null,
      metadata:{mint,symbol:holding?.symbol??traded?.symbol??asset?.symbol??asset?.cashSymbol??null,name:holding?.name??traded?.name??asset?.name??null,cashSymbol:holding?.cashSymbol??traded?.cashSymbol??asset?.cashSymbol??null,chain:"solana",chainKey:"solana",wallet,traderWallet:wallet,afterbellEquity:true,positionBasis:holding?"retained-holding":"most-traded",observedNetAmount:holding?.observedNetAmount??null,holdingSourceKind:holding?.sourceKind??null,uniqueAfterCloseTxCount:traded?.uniqueAfterCloseTxCount??0,eventCount:traded?.eventCount??0,tradeCount:mintTrades.length,systemRole:"afterbell-trader-position-planet"}
    });
  }

  for(const [index,trade] of trades.entries()){
    const target=particles.find(p=>p.cosmicKind==="planet"&&p.metadata?.mint===trade.mint),end=(target?.position??[20-index*4,-6,18]) as [number,number,number],position:[number,number,number]=trade.side==="buy"?[end[0]*.55,end[1]+14,end[2]*.55]:[end[0]*1.45,end[1]+13,end[2]*1.45],observedAt=trade.blockTime*1000;
    particles.push({id:`afterbell-comet:${trade.txId??`${wallet}:${trade.blockTime}:${index}`}`,eventId:trade.txId??`afterbell:${wallet}:${trade.blockTime}:${index}`,kind:"trade",cosmicKind:"comet",originGalaxyId:"afterbell",verificationState:trade.sourceKind==="observed-fact"?"observed":"provider-reported",observedAt,category:"swap",magnitudeBand:.94-index*.055,position,source:trade.source??null,metadata:{signature:trade.txId??null,wallet,traderWallet:wallet,mint:trade.mint,chain:"solana",chainKey:"solana",side:trade.side,tokenAmount:trade.amount,priceUsd:trade.priceUsd??null,priceSol:trade.priceSol??null,entryTs:observedAt,sourceKind:trade.sourceKind??null,tradeOrder:index+1,systemRole:"afterbell-trade-comet"}});
  }

  const times=trades.map(item=>item.blockTime*1000).filter(Number.isFinite),windowFrom=Number(traderStar.metadata?.windowFrom),windowTo=Number(traderStar.metadata?.windowTo),sources=[...new Set(trades.map(item=>item.source).filter((value):value is string=>Boolean(value)))];
  return{galaxyId:"afterbell",windowStart:Number.isFinite(windowFrom)&&windowFrom>0?windowFrom*1000:times.length?Math.min(...times):traderStar.observedAt,windowEnd:Number.isFinite(windowTo)&&windowTo>0?windowTo*1000:times.length?Math.max(...times):traderStar.observedAt,observedEventCount:trades.length,samplingPolicy:"selected Afterbell trader · holdings-first then most-traded xStock PLANETS · maximum 10 PLANETS · latest 3 retained after-close trade COMETS",coverageStatement:"Only retained holdings, after-close transaction relationships, and retained trade receipts attached to this ranked public wallet are shown. Missing holdings, trades, prices, receipts, or PnL remain unavailable.",sources:sources.length?sources:["a-bulls-indexed-solana-evidence"],particles};
}
