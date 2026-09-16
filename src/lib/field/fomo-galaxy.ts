import type { FieldParticle, UniverseSnapshot } from "./types";
import type { FomoGalaxyResponse } from "@/lib/universe-data/fomo-client";
import { canonicalUniverseId } from "./galaxies";
import { fomoStarLabel } from "./fomo-star-label";

function clamp01(value:number){return Math.max(0,Math.min(1,Number.isFinite(value)?value:0));}
function positionForRank(rank:number):[number,number,number]{if(rank===1)return[0,34,0];const ring=rank<=10?25:rank<=28?44:64,count=rank<=10?9:rank<=28?18:22,start=rank<=10?2:rank<=28?11:29,angle=((rank-start)/count)*Math.PI*2-Math.PI/2,y=10+(rank<=10?18:rank<=28?8:0)+Math.sin(angle*2)*4;return[Math.cos(angle)*ring,y,Math.sin(angle)*ring];}
export function buildFomoGalaxySnapshot(data:FomoGalaxyResponse):UniverseSnapshot{
  const now=data.capturedAt??Date.now(),particles:FieldParticle[]=data.items.slice(0,50).flatMap(item=>{const wallet=item.solanaWallet??item.evmWallet;if(!wallet)return[];return[{id:canonicalUniverseId("star",wallet,"fomo"),kind:"wallet",cosmicKind:"star",originGalaxyId:"fomo",verificationState:"provider-reported",observedAt:item.capturedAt||now,category:"swap",magnitudeBand:clamp01(1-(item.rank-1)/58),position:positionForRank(item.rank),source:"fomoapi.io",metadata:{name:fomoStarLabel(item),displayName:item.displayName,traderDisplayName:item.displayName,wallet,solanaWallet:item.solanaWallet,evmWallet:item.evmWallet,fomoTrader:true,fomoHandle:item.handle,fomoRank:item.rank,reportedPnlUsd:item.reportedPnlUsd,reportedVolumeUsd:item.reportedVolumeUsd,reportedTradeCount:item.reportedTradeCount,followerCount:item.followerCount,avatarUrl:item.avatarUrl,fomoCapturedAt:item.capturedAt,rankingWindow:"ALL",skyRole:"live",systemRole:"fomo-trader-star",interactive:true}}]});
  return{galaxyId:"fomo",windowStart:now-1000,windowEnd:now,observedEventCount:particles.length,samplingPolicy:"fomo all-time, as reported · cached D1 · maximum 50 trader stars",coverageStatement:data.disclosure,sources:["fomoapi.io"],particles};
}
