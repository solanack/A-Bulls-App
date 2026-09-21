import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "../intelligence-origin.ts";

export type TrendingCutItem={
  shareId:string;
  viewCount:number;
  shareCount:number;
  createdAt:number;
  lastActivityAt:number;
  expiresAt:number;
  verifyUrl:string;
  manifest:Record<string,unknown>;
};

export type TrendingCutsResponse={
  ok:boolean;
  coverage:"fresh"|"empty"|"degraded";
  windowDays?:number;
  items:readonly TrendingCutItem[];
  disclosure:string;
  error?:string;
};

export type CutActivityResponse={ok:boolean;shareId?:string;kind?:string;error?:string};

async function json<T>(path:string,init:RequestInit,fallback:T):Promise<T>{
  try{const response=await fetchIntelligence(path,init);return await response.json() as T;}catch{return fallback;}
}

export const getTrendingCuts=createServerFn({method:"GET"})
  .validator((value:{days?:number;limit?:number})=>value)
  .handler(async({data}):Promise<TrendingCutsResponse>=>{
    const days=Math.max(1,Math.min(30,Math.trunc(data.days??7))),limit=Math.max(1,Math.min(24,Math.trunc(data.limit??12)));
    return json(`/api/intelligence/trickster/trending?days=${days}&limit=${limit}`,{headers:{accept:"application/json"},cache:"no-store"},{ok:false,coverage:"degraded",items:[],disclosure:"Trending Cut activity is unavailable. No Cut was promoted without retained activity.",error:"trending_cuts_unavailable"});
  });

export const recordCutActivity=createServerFn({method:"POST"})
  .validator((value:{shareId:string;kind:"view"|"share"})=>value)
  .handler(async({data}):Promise<CutActivityResponse>=>json("/api/intelligence/trickster/activity",{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({shareId:data.shareId,kind:data.kind}),cache:"no-store"},{ok:false,error:"cut_activity_unavailable"}));
