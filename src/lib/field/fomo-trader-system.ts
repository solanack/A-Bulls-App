import type { FieldParticle, GalaxyId, UniverseSnapshot } from "./types";
import type { FomoTraderSystemResponse } from "@/lib/universe-data/fomo-client";
import { canonicalUniverseId } from "./galaxies.ts";

const PLANET_COLLISION_DISTANCE=18;
function planetPos(index:number,count:number,occupied:readonly [number,number,number][]):[number,number,number]{
  const n=Math.max(1,count),angle=index/n*Math.PI*2-Math.PI/2+.21;
  let ring=n<=3?52:index%2===0?44:60;
  const point=(radius:number):[number,number,number]=>[Math.cos(angle)*radius,8+Math.sin(angle*2)*3.5,Math.sin(angle)*radius];
  let position=point(ring);
  while(occupied.some(other=>Math.hypot(other[0]-position[0],other[2]-position[2])<PLANET_COLLISION_DISTANCE)){ring+=16;position=point(ring);}
  return position;
}
function cometPos(index:number,side:string,target:[number,number,number]|null):[number,number,number]{
  const fallback=index/3*Math.PI*2-Math.PI/2+.45,base=target?Math.atan2(target[2],target[0]):fallback,angle=base+(side==="sell"?.28:-.28),ring=78+index*8;
  return[Math.cos(angle)*ring,18+Math.sin(angle*2)*4,Math.sin(angle)*ring];
}
function normalizedChain(chain:string|null|undefined){const value=String(chain??"").trim().toLowerCase().replace(/[_\s:]+/g,"-");if(["sol","svm","solana-mainnet","1399811149"].includes(value))return"solana";if(["bnb","bnb-chain","bnbchain","binance-smart-chain","56"].includes(value))return"bsc";if(["eth","ethereum-mainnet","mainnet","1"].includes(value))return"ethereum";if(["base-mainnet","coinbase-base","8453"].includes(value)||value==="base")return"base";if(["monad-mainnet","143"].includes(value)||value==="monad")return"monad";if(["robinhood-chain","robinhoodchain","hood","4663"].includes(value))return"robinhood";return value||"solana";}
function researchOrigin(chain:string|null|undefined):GalaxyId{return normalizedChain(chain)==="solana"?"solana-core":"fomo";}
function walletForChain(chain:string|null|undefined,solanaWallet:string|null|undefined,evmWallet:string|null|undefined,fallback:string){return normalizedChain(chain)==="solana"?(solanaWallet??evmWallet??fallback):(evmWallet??solanaWallet??fallback);}
function addressMatchesChain(chain:string,value:string|null|undefined){const address=String(value??"").trim();return normalizedChain(chain)==="solana"?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address):/^0x[a-fA-F0-9]{40}$/.test(address);}

export function buildFomoTraderSystemSnapshot(data:FomoTraderSystemResponse):UniverseSnapshot{
  const trader=data.trader,now=Math.max(Date.now(),...(data.latestTrades.map(item=>item.observedAt||0)));if(!trader)return{galaxyId:"fomo",windowStart:now-1,windowEnd:now,observedEventCount:0,samplingPolicy:"empty Fomo trader system",coverageStatement:data.disclosure,sources:["fomoapi.io","a-bulls-indexed-public-chain"],particles:[]};
  const wallet=trader.solanaWallet??trader.evmWallet??trader.handle,particles:FieldParticle[]=[{id:canonicalUniverseId("star",wallet,"fomo"),kind:"wallet",cosmicKind:"star",originGalaxyId:"fomo",verificationState:"provider-reported",observedAt:trader.capturedAt,category:"swap",magnitudeBand:1,position:[0,28,0],source:"fomoapi.io",metadata:{name:trader.displayName,displayName:trader.displayName,wallet,solanaWallet:trader.solanaWallet,evmWallet:trader.evmWallet,fomoTrader:true,fomoHandle:trader.handle,fomoRank:trader.rank,reportedPnlUsd:trader.reportedPnlUsd,avatarUrl:trader.avatarUrl,systemRole:"focused-trader-star"}}];
  const planetPositions:[number,number,number][]=[];
  for(const [index,item] of data.positions.slice(0,10).entries()){
    const chain=normalizedChain(item.chain),origin=researchOrigin(chain),subjectWallet=walletForChain(chain,trader.solanaWallet,trader.evmWallet,trader.handle);
    const position=planetPos(index,Math.min(10,data.positions.length),planetPositions),latestSide=data.latestTrades.find(trade=>trade.mint.toLowerCase()===item.mint.toLowerCase())?.side??null;planetPositions.push(position);
    particles.push({id:`planet:${origin}:${chain}:${item.mint.toLowerCase()}`,kind:"token",cosmicKind:"planet",originGalaxyId:origin,verificationState:item.sourceKind.includes("a-bulls-observed")?"observed":"provider-reported",observedAt:item.lastObservedAt??trader.capturedAt,category:"swap",magnitudeBand:.88-index*.045,position,source:item.sourceKind,metadata:{mint:item.mint,symbol:item.symbol,name:item.name,chain,chainKey:chain,networkId:item.networkId??null,traderWallet:subjectWallet,traderHandle:trader.handle,wallet:subjectWallet,positionRank:item.rank??index+1,positionSource:item.sourceKind,latestTradeSide:latestSide,amount:item.amount??null,priceUsd:item.priceUsd??null,valueUsd:item.valueUsd??null,change24h:item.change24h??null,observedNetTokenFlow:item.observedNetTokenFlow,tradeCount:item.tradeCount,eventCount:item.eventCount,lastObservedAt:item.lastObservedAt,launchOriginUnknown:origin==="fomo",systemRole:"trader-position-planet"}});
  }
  for(const [index,trade] of data.latestTrades.slice(0,3).entries()){
    const target=particles.find(p=>p.cosmicKind==="planet"&&String(p.metadata?.mint??"").toLowerCase()===trade.mint.toLowerCase()),chain=normalizedChain(trade.chain??(typeof target?.metadata?.chain==="string"?target.metadata.chain:null)),subjectWallet=addressMatchesChain(chain,trade.wallet)?trade.wallet:walletForChain(chain,trader.solanaWallet,trader.evmWallet,trader.handle),end=(target?.position??null) as [number,number,number]|null,position=cometPos(index,trade.side,end);
    particles.push({id:`fomo-comet:${trade.signature??`${trader.handle}:${trade.observedAt}:${index}`}`,eventId:trade.signature??`fomo:${trader.handle}:trade:${trade.observedAt}:${index}`,kind:"trade",cosmicKind:"comet",originGalaxyId:"fomo",verificationState:trade.sourceKind==="a-bulls-observed"?"observed":"provider-reported",observedAt:trade.observedAt,category:"swap",magnitudeBand:.92-index*.1,position,source:trade.source,metadata:{signature:trade.signature,wallet:subjectWallet,traderWallet:subjectWallet,mint:trade.mint,chain,chainKey:chain,side:trade.side,solAmount:trade.solAmount,tokenAmount:trade.tokenAmount,priceSol:trade.priceSol,priceUsd:trade.priceUsd??null,status:trade.status??null,realizedPnlUsd:trade.realizedPnlUsd??null,unrealizedPnlUsd:trade.unrealizedPnlUsd??null,sourceKind:trade.sourceKind??null,traderHandle:trader.handle,tradeOrder:index+1,systemRole:"latest-trade-comet"}});
  }
  const times=data.latestTrades.map(item=>item.observedAt).filter(Number.isFinite);return{galaxyId:"fomo",windowStart:times.length?Math.min(...times):trader.capturedAt,windowEnd:Math.max(now,trader.capturedAt),observedEventCount:data.latestTrades.length,samplingPolicy:"Fomo-reported holdings + retained A Bulls App public-chain observations · chain-qualified wallets · top 10 planets · latest 3 sourced trade/position events",coverageStatement:data.disclosure,sources:["fomoapi.io","a-bulls-indexed-public-chain"],particles};
}