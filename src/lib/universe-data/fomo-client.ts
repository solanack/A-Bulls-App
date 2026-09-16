import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "../intelligence-origin.ts";

export type FomoTopToken={mint?:string|null;address?:string|null;symbol?:string|null;name?:string|null;reported?:boolean};
export type FomoTrader={rank:number;handle:string;displayName:string;reportedPnlUsd:number|null;reportedVolumeUsd:number|null;reportedTradeCount:number|null;followerCount:number|null;solanaWallet:string|null;evmWallet:string|null;avatarUrl:string|null;coverPhotoUrl?:string|null;thumbhash?:string|null;topTokens:readonly FomoTopToken[];capturedAt:number;source:"fomoapi.io"};
export type FomoGalaxyResponse={ok:boolean;coverage:"fresh"|"empty"|"degraded";items:readonly FomoTrader[];source?:string;capturedAt?:number|null;disclosure:string;error?:string;configuration?:{providerConfigured?:boolean;scheduled?:boolean;lastSuccessAt?:number|null}};
export type FomoPosition={rank:number;mint:string;symbol:string|null;name:string|null;chain?:string|null;networkId?:string|null;sourceKind:"fomo-reported"|"a-bulls-observed"|"fomo-reported+a-bulls-observed";amount?:number|null;priceUsd?:number|null;valueUsd?:number|null;change24h?:number|null;observedNetTokenFlow:number|null;tradeCount:number|null;eventCount:number|null;lastObservedAt:number|null};
export type FomoTrade={signature:string|null;wallet:string;mint:string;side:"buy"|"sell";solAmount:number;tokenAmount:number;priceSol:number|null;priceUsd?:number|null;status?:string|null;realizedPnlUsd?:number|null;unrealizedPnlUsd?:number|null;observedAt:number;source:string;sourceKind?:"fomo-reported-position-event"|"a-bulls-observed"};
export type FomoTraderSystemResponse={ok:boolean;coverage:"partial"|"empty"|"degraded";trader?:FomoTrader;positions:readonly FomoPosition[];latestTrades:readonly FomoTrade[];source?:string;disclosure:string;error?:string};
export type FomoClosedTrade={id:string;tradeId:string;handle:string;displayName:string;rank:number|null;wallet:string;mint:string;symbol:string|null;pnlUsd:number;entryPriceUsd:number|null;exitPriceUsd:number|null;createdAt:number|null;closedAt:number;fromTs:number;toTs:number;observedIndexed:boolean;source:"fomoapi.io"};
export type FomoClosedTradeResultsResponse={ok:boolean;coverage:"partial"|"empty"|"degraded";winners:readonly FomoClosedTrade[];losers:readonly FomoClosedTrade[];replayReadyCount?:number;source?:string;disclosure:string;error?:string};

export const getFomoGalaxy=createServerFn({method:"GET"}).handler(async():Promise<FomoGalaxyResponse>=>{
  try{const response=await fetchIntelligence("/api/intelligence/fomo/galaxy",{headers:{accept:"application/json"},cache:"no-store"});const body=await response.json() as FomoGalaxyResponse;return response.ok?body:{...body,ok:false,items:body.items??[]};}
  catch{return{ok:false,coverage:"degraded",items:[],disclosure:"The cached Fomo Galaxy feed is unavailable. No logged-in fomo.family session was scraped as a fallback.",error:"fomo_galaxy_unavailable"};}
});

export const getFomoTraderSystem=createServerFn({method:"GET"}).validator((input:{handle:string})=>input).handler(async({data}):Promise<FomoTraderSystemResponse>=>{
  try{const response=await fetchIntelligence(`/api/intelligence/fomo/trader?handle=${encodeURIComponent(data.handle)}`,{headers:{accept:"application/json"},cache:"no-store"});const body=await response.json() as FomoTraderSystemResponse;return response.ok?body:{...body,ok:false,positions:body.positions??[],latestTrades:body.latestTrades??[]};}
  catch{return{ok:false,coverage:"degraded",positions:[],latestTrades:[],disclosure:"The cached Fomo trader system is unavailable. No wallet position was invented.",error:"fomo_trader_unavailable"};}
});

export const getFomoClosedTradeResults=createServerFn({method:"GET"}).validator((input:{limit?:number})=>input).handler(async({data}):Promise<FomoClosedTradeResultsResponse>=>{
  try{const limit=Math.max(1,Math.min(20,Math.trunc(Number(data.limit)||8))),response=await fetchIntelligence(`/api/intelligence/fomo/results?limit=${limit}`,{headers:{accept:"application/json"},cache:"no-store"});const body=await response.json() as FomoClosedTradeResultsResponse;return response.ok?body:{...body,ok:false,winners:body.winners??[],losers:body.losers??[]};}
  catch{return{ok:false,coverage:"degraded",winners:[],losers:[],disclosure:"Closed Fomo trade outcomes are unavailable. No PnL or completed trade was invented.",error:"fomo_results_unavailable"};}
});
