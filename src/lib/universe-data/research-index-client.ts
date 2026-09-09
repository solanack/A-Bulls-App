import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "../intelligence-origin.ts";
import type { MatchedTradeRound, ResearchIndexObject } from "../research-thread";

type CoverageSource={source:string;last_observed_slot?:number|null;last_verified_slot?:number|null;gap_from_slot?:number|null;gap_to_slot?:number|null;status:string;detail?:string|null;updated_at:number};
export type ResearchIndexListResponse={ok:boolean;coverage:"fresh"|"empty"|"degraded";items:readonly ResearchIndexObject[];disclosure:string;error?:string};
export type ResearchIndexDetailResponse={ok:boolean;item?:ResearchIndexObject;graph?:{outbound:readonly Record<string,unknown>[];inbound:readonly Record<string,unknown>[]};disclosure?:string;error?:string};
export type MatchedRoundListResponse={ok:boolean;coverage:"fresh"|"empty"|"degraded";items:readonly MatchedTradeRound[];disclosure?:string;error?:string};
export type ResearchCoverageResponse={ok:boolean;coverage:"fresh"|"degraded";sources:readonly CoverageSource[];disclosure?:string;error?:string};

const qs=(input:Record<string,string|number|null|undefined>)=>{const params=new URLSearchParams();for(const [key,value] of Object.entries(input))if(value!=null&&String(value).trim())params.set(key,String(value));const text=params.toString();return text?`?${text}`:"";};
async function read<T>(path:string,fallback:T):Promise<T>{try{const response=await fetchIntelligence(path,{headers:{accept:"application/json"},cache:"no-store"});const body=await response.json() as T;return body;}catch{return fallback;}}

export const listResearchIndex=createServerFn({method:"GET"}).validator((value:{kind?:string;mint?:string;wallet?:string;galaxy?:string;sourceKind?:string;q?:string;limit?:number})=>value).handler(async({data}):Promise<ResearchIndexListResponse>=>read(`/api/intelligence/research/index${qs(data as Record<string,string|number|null|undefined>)}`,{ok:false,coverage:"degraded",items:[],disclosure:"The research Index is unavailable. No provider fallback was attempted.",error:"research_index_unavailable"}));
export const getResearchIndexObject=createServerFn({method:"GET"}).validator((value:{id:string})=>value).handler(async({data}):Promise<ResearchIndexDetailResponse>=>read(`/api/intelligence/research/index/${encodeURIComponent(data.id)}`,{ok:false,error:"research_object_unavailable"}));
export const listMatchedRounds=createServerFn({method:"GET"}).validator((value:{wallet?:string;mint?:string;status?:string;limit?:number})=>value).handler(async({data}):Promise<MatchedRoundListResponse>=>read(`/api/intelligence/research/rounds${qs(data as Record<string,string|number|null|undefined>)}`,{ok:false,coverage:"degraded",items:[],disclosure:"Matched rounds are unavailable. No cost basis was inferred.",error:"matched_rounds_unavailable"}));
export const getResearchCoverage=createServerFn({method:"GET"}).handler(async():Promise<ResearchCoverageResponse>=>read('/api/intelligence/research/coverage',{ok:false,coverage:"degraded",sources:[],error:"research_coverage_unavailable"}));
