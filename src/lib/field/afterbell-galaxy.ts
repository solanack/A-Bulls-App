import type { FieldParticle, UniverseSnapshot } from "./types";
import { canonicalUniverseId } from "./galaxies.ts";
import type { AfterbellGalaxyData } from "../universe-data/afterbell-client.ts";

const POSITIONS:readonly [number,number,number][]=[[-34,2,-8],[-23,9,17],[-9,-2,-25],[8,7,24],[23,-4,-15],[35,6,7],[-5,16,4],[14,-13,2]];
const finitePositive=(value:number|null)=>value!=null&&Number.isFinite(value)&&value>0;
export function buildAfterbellGalaxySnapshot(data:AfterbellGalaxyData):UniverseSnapshot{
  const particles:FieldParticle[]=data.planets.filter(item=>item.mint&&finitePositive(item.priceUsd)).slice(0,POSITIONS.length).map((item,index)=>({id:canonicalUniverseId("planet",item.mint,"solana-core"),kind:"token",cosmicKind:"planet",originGalaxyId:"solana-core",verificationState:"provider-reported",observedAt:item.observedAt,category:"swap",magnitudeBand:Math.max(.38,Math.min(1,.5+Math.log10(Math.max(1,item.liquidityUsd??1))/14)),position:POSITIONS[index],source:item.source,metadata:{mint:item.mint,symbol:item.symbol,name:item.name,cashSymbol:item.cashSymbol,issuer:item.issuer,priceUsd:item.priceUsd,change24h:item.change24h,volume24h:item.volume24h,liquidityUsd:item.liquidityUsd,afterbellEquity:true,providerReported:true,researchGalaxyId:"afterbell",afterbellDeepLink:"/afterbell/"}}));
  const times=particles.map(item=>item.observedAt).filter(Number.isFinite),windowEnd=times.length?Math.max(...times):Date.now(),windowStart=times.length?Math.min(...times):windowEnd;
  return{galaxyId:"afterbell",windowStart,windowEnd,observedEventCount:0,samplingPolicy:"bounded xStock venue snapshot; provider-reported market context only",coverageStatement:data.disclosure,sources:[data.source],particles};
}
