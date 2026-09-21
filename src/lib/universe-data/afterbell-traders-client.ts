import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "../intelligence-origin.ts";

export type AfterbellTraderRank = {
  rank:number;
  wallet:string;
  transactionCount:number;
  eventCount:number;
  buyCount:number;
  sellCount:number;
  realizedPnlUsd:number|null;
  realizedPnlSol:number|null;
  lastObservedAt:number;
  sourceKind:"observed"|"provider-reported";
  sources:readonly string[];
};

export type AfterbellTraderWindow = {
  from:number;
  to:number;
  scheduledEnd:number;
  live:boolean;
  timezone:string;
  label:string;
  calendarCoverage:string;
};

export type AfterbellTraderResponse = {
  ok:boolean;
  coverage:"fresh"|"empty"|"degraded";
  mint:string;
  window?:AfterbellTraderWindow;
  items:readonly AfterbellTraderRank[];
  method?:string;
  disclosure:string;
  error?:string;
};

const fallback=(mint:string):AfterbellTraderResponse=>({ok:false,coverage:"degraded",mint,items:[],disclosure:"Afterbell trader evidence is unavailable. No trader ranking or PnL was invented.",error:"afterbell_traders_unavailable"});

export const getAfterbellTraders=createServerFn({method:"GET"})
  .validator((value:{mint:string;limit?:number})=>value)
  .handler(async({data}):Promise<AfterbellTraderResponse>=>{
    const mint=String(data.mint||"").trim(),limit=Math.max(1,Math.min(50,Math.trunc(data.limit??50)));
    try{
      const path="/api/intelligence/afterbell/traders?mint="+encodeURIComponent(mint)+"&limit="+limit;
      const response=await fetchIntelligence(path,{headers:{accept:"application/json"},cache:"no-store"});
      const body=await response.json() as AfterbellTraderResponse;
      return response.ok?body:{...body,ok:false,items:body.items??[]};
    }catch{return fallback(mint);}
  });
