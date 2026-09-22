import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "../intelligence-origin.ts";

export type AfterbellTrade = {
  mint:string; txId:string|null; side:"buy"|"sell"; amount:number; blockTime:number;
  priceUsd:number|null; priceSol:number|null; source:string; sourceKind:string;
};
export type AfterbellTraderRank = {
  rank:number; wallet:string; transactionCount:number; eventCount:number; buyCount:number; sellCount:number;
  assetCount:number; mints:readonly string[]; latestTrades:readonly AfterbellTrade[];
  realizedPnlUsd:number|null; realizedPnlSol:number|null; lastObservedAt:number;
  sourceKind:"observed"|"provider-reported"; sources:readonly string[];
};
export type AfterbellTraderWindow = {from:number;to:number;scheduledEnd:number;live:boolean;timezone:string;label:string;calendarCoverage:string;};
export type AfterbellTraderResponse = {
  ok:boolean; coverage:"fresh"|"empty"|"degraded"; mint:string; mints?:readonly string[];
  window?:AfterbellTraderWindow; items:readonly AfterbellTraderRank[]; method?:string; disclosure:string; error?:string;
};
const fallback=(mints:readonly string[]):AfterbellTraderResponse=>({ok:false,coverage:"degraded",mint:mints.length===1?mints[0]??"":"",mints,items:[],disclosure:"Afterbell trader evidence is unavailable. No trader ranking, trades, or PnL were invented.",error:"afterbell_traders_unavailable"});

export const getAfterbellTraders=createServerFn({method:"GET"})
  .validator((value:{mint?:string;mints?:readonly string[];limit?:number})=>value)
  .handler(async({data}):Promise<AfterbellTraderResponse>=>{
    const mints=[...new Set([...(data.mints??[]),data.mint??""].map(value=>String(value||"").trim()).filter(Boolean))],limit=Math.max(1,Math.min(50,Math.trunc(data.limit??50)));
    try{
      const path="/api/intelligence/afterbell/traders?mints="+encodeURIComponent(mints.join(","))+"&limit="+limit;
      const response=await fetchIntelligence(path,{headers:{accept:"application/json"},cache:"no-store"});
      const body=await response.json() as AfterbellTraderResponse;
      return response.ok?body:{...body,ok:false,items:body.items??[]};
    }catch{return fallback(mints);}
  });
