import type { FieldParticle, GalaxyId, UniverseSnapshot } from "./types";
import type { WalletActivityIndex } from "@/lib/universe-data/wallet-system-client";
import { canonicalUniverseId } from "./galaxies";

function hashUnit(input:string){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0)/4294967295;}
function planetPosition(seed:string,index:number):[number,number,number]{const ring=index<10?31:index<28?49:66,angle=hashUnit(`${seed}:${index}`)*Math.PI*2,y=-4+hashUnit(`${seed}:y:${index}`)*25;return[Math.cos(angle)*ring,y,Math.sin(angle)*ring];}
function originFor(chainKey:string,current:GalaxyId):GalaxyId{if(current==="afterbell")return"afterbell";if(chainKey==="solana")return"solana-core";return current==="galaxy-zero"?"fomo":current;}

export function buildWalletSystemSnapshot(index:WalletActivityIndex,currentGalaxy:GalaxyId):UniverseSnapshot{
  const wallet=index.wallet,now=Date.now(),times=index.tokens.flatMap(item=>[item.firstEvent,item.lastEvent]).filter((value):value is number=>Number.isFinite(value)&&Number(value)>0),particles:FieldParticle[]=[{
    id:canonicalUniverseId("star",wallet,currentGalaxy),kind:"wallet",cosmicKind:"star",originGalaxyId:currentGalaxy,verificationState:index.addressKind==="solana"?"observed":"provider-reported",observedAt:times.length?Math.max(...times)*1000:now,category:"transfer",magnitudeBand:1,position:[0,30,0],source:"a-bulls-wallet-token-index",metadata:{name:`WALLET ${wallet.slice(0,5)}…${wallet.slice(-4)}`,wallet,addressKind:index.addressKind,tokenCount:index.tokenCount,systemRole:"focused-wallet-star",interactive:true}
  }];
  for(const [position,item] of index.tokens.slice(0,50).entries()){
    const sourceKinds=item.sourceKinds??[],observed=index.addressKind==="solana"||sourceKinds.includes("observed-fact"),origin=originFor(item.chainKey,currentGalaxy),mint=item.mint;
    particles.push({id:`planet:${origin}:${item.chainKey}:${mint.toLowerCase()}`,kind:"token",cosmicKind:"planet",originGalaxyId:origin,verificationState:observed?"observed":"provider-reported",observedAt:(item.lastEvent??item.firstEvent??Math.floor(now/1000))*1000,category:item.tradeCount>0?"swap":"transfer",magnitudeBand:Math.max(.28,Math.min(.96,Math.log10(1+item.eventCount+item.tradeCount)/2)),position:planetPosition(`${item.chainKey}:${mint}`,position),source:index.addressKind==="solana"?"bull_wallet_events":sourceKinds.join("+")||"intelligence_chain_events_v2",metadata:{mint,wallet,chain:item.chainKey,chainKey:item.chainKey,eventCount:item.eventCount,tradeCount:item.tradeCount,observedTokenFlow:item.observedTokenFlow,maxConfidence:item.maxConfidence,firstObservedAt:item.firstEvent?item.firstEvent*1000:null,lastObservedAt:item.lastEvent?item.lastEvent*1000:null,sourceKinds,systemRole:"wallet-token-planet",interactive:true}});
  }
  return{galaxyId:currentGalaxy,windowStart:times.length?Math.min(...times)*1000:now,windowEnd:times.length?Math.max(...times)*1000:now,observedEventCount:index.tokens.reduce((sum,item)=>sum+item.eventCount,0),samplingPolicy:"wallet STAR with up to 50 chain-qualified PLANETS ordered by retained trade/event activity",coverageStatement:index.disclosure,sources:["a-bulls-wallet-token-index"],particles};
}
