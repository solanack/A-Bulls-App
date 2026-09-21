import type { FieldParticle, UniverseSnapshot } from "./types";
import type { WalletResearchSystemResponse } from "@/lib/universe-data/research-index-client";

const ms=(value:number|null)=>value==null?Date.now():value>=1_000_000_000_000?value:value*1000;
const ringPosition=(index:number,count:number):[number,number,number]=>{const angle=index/Math.max(1,count)*Math.PI*2-Math.PI/2,ring=index<5?30:50;return[Math.cos(angle)*ring,3+Math.sin(angle*2)*5,Math.sin(angle)*ring];};
const uniq=(values:string[])=>[...new Set(values.map(value=>value.trim()).filter(Boolean))];

export function buildWalletResearchSystemSnapshot(data:WalletResearchSystemResponse):UniverseSnapshot{
  const wallet=data.wallet.trim(),items=[...data.items].slice(0,10),times=items.map(item=>item.lastObservedAt).filter((value):value is number=>value!=null&&Number.isFinite(value)),observedAt=times.length?ms(Math.max(...times)):Date.now(),hasObserved=items.some(item=>item.sourceKind==="observed"),sources=uniq(items.flatMap(item=>item.sourceKinds));
  const particles:FieldParticle[]=[{
    id:`star:wallet-system:${wallet}`,kind:"wallet",cosmicKind:"star",originGalaxyId:"galaxy-zero",verificationState:hasObserved?"observed":items.length?"provider-reported":"unavailable",observedAt,category:"transfer",magnitudeBand:1,position:[0,26,0],source:sources[0]??null,metadata:{wallet,queriedWallet:true,walletKind:data.walletKind??null,systemRole:"queried-wallet-star",indexedPlanetCount:items.length}
  }];
  for(const [index,item] of items.entries()){
    const source=item.sourceKinds[0]??(item.sourceKind==="observed"?"a-bulls-indexed-evidence":"provider-reported");
    particles.push({id:`wallet-planet:${item.chainKey}:${item.mint.toLowerCase()}`,kind:"token",cosmicKind:"planet",originGalaxyId:"galaxy-zero",verificationState:item.sourceKind,observedAt:ms(item.lastObservedAt),category:item.tradeCount>0?"swap":"transfer",magnitudeBand:Math.max(.36,.9-index*.05),position:ringPosition(index,items.length),source,metadata:{mint:item.mint,wallet,chainKey:item.chainKey,eventCount:item.eventCount,tradeCount:item.tradeCount,firstObservedAt:item.firstObservedAt,lastObservedAt:item.lastObservedAt,observedTokenFlow:item.observedTokenFlow,confidence:item.confidence,sourceKind:item.sourceKind,sourceKinds:[...item.sourceKinds],launchOriginUnknown:true,systemRole:"wallet-observed-planet"}});
  }
  const eventCount=items.reduce((sum,item)=>sum+item.eventCount,0),startTimes=items.map(item=>item.firstObservedAt).filter((value):value is number=>value!=null&&Number.isFinite(value));
  return{galaxyId:"galaxy-zero",windowStart:startTimes.length?ms(Math.min(...startTimes)):observedAt,windowEnd:observedAt,observedEventCount:eventCount,samplingPolicy:"bounded retained wallet/token evidence · top 10 by indexed trade/event activity",coverageStatement:data.disclosure,sources:sources.length?sources:["a-bulls-research-index"],particles};
}
