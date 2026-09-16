/* Unified Fomo page-read handler.
 * Merges cached FomoAPI enrichment with the legacy provider-top-token fallback
 * so a trader with mapped provider token context does not become falsely empty
 * merely because only trades (or only some holdings) have been enriched so far.
 * All inputs are D1-only page reads; no provider request is made here.
 */
import { handleFomoGalaxyRequest } from './intelligence-fomo-galaxy.mjs';
import { handleFomoLiveRequest } from './intelligence-fomo-live.mjs';

const GALAXY_PATH='/api/intelligence/fomo/galaxy';
const TRADER_PATH='/api/intelligence/fomo/trader';
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;

function sourceKind(a,b){
  const values=[s(a),s(b)].filter(Boolean);
  const provider=values.some(value=>value.includes('fomo-reported'));
  const observed=values.some(value=>value.includes('a-bulls-observed'));
  if(provider&&observed)return'fomo-reported+a-bulls-observed';
  return values[values.length-1]||'fomo-reported';
}
function mergePosition(prior={},next={}){
  const merged={...prior,...next};
  for(const key of ['symbol','name','chain','networkId','amount','priceUsd','valueUsd','change24h','observedNetTokenFlow','tradeCount','eventCount'])if(merged[key]==null&&prior[key]!=null)merged[key]=prior[key];
  const priorAt=Number(prior.lastObservedAt),nextAt=Number(next.lastObservedAt);
  merged.lastObservedAt=Number.isFinite(priorAt)||Number.isFinite(nextAt)?Math.max(Number.isFinite(priorAt)?priorAt:0,Number.isFinite(nextAt)?nextAt:0)||null:null;
  merged.sourceKind=sourceKind(prior.sourceKind,next.sourceKind);
  return merged;
}
function tradeKey(item={}){
  const signature=s(item.signature);if(signature)return`sig:${signature}`;
  return`${s(item.mint).toLowerCase()}|${s(item.side)}|${n(item.observedAt)}|${s(item.sourceKind||item.source)}`;
}

export function mergeFomoTraderResponses(live={},fallback={}){
  if(!live?.ok)return fallback?.ok?fallback:live;
  if(!fallback?.ok)return live;
  const byMint=new Map();
  for(const item of Array.isArray(fallback.positions)?fallback.positions:[]){const mint=s(item?.mint);if(mint)byMint.set(mint.toLowerCase(),{...item,mint});}
  for(const item of Array.isArray(live.positions)?live.positions:[]){const mint=s(item?.mint);if(!mint)continue;const key=mint.toLowerCase(),prior=byMint.get(key);byMint.set(key,prior?mergePosition(prior,{...item,mint}):{...item,mint});}
  const positions=[...byMint.values()].sort((a,b)=>n(b.valueUsd)-n(a.valueUsd)||n(b.tradeCount)-n(a.tradeCount)||n(b.lastObservedAt)-n(a.lastObservedAt)).slice(0,10).map((item,index)=>({...item,rank:index+1}));
  const trades=[],seen=new Set();
  for(const item of [...(Array.isArray(live.latestTrades)?live.latestTrades:[]),...(Array.isArray(fallback.latestTrades)?fallback.latestTrades:[])]){const key=tradeKey(item);if(seen.has(key))continue;seen.add(key);trades.push(item);}
  const latestTrades=trades.sort((a,b)=>n(b.observedAt)-n(a.observedAt)).slice(0,3);
  return {...fallback,...live,ok:true,coverage:positions.length||latestTrades.length?'partial':'empty',positions,latestTrades,source:'fomoapi.io + a-bulls-indexed-public-chain',disclosure:[s(live.disclosure),positions.some(item=>s(item.sourceKind).includes('fomo-reported'))?'Provider-reported mapped token positions are retained while cached enrichment fills in so active trader context is not hidden by partial refresh coverage.':''].filter(Boolean).join(' ')};
}

async function body(response){try{return await response.clone().json();}catch{return null;}}
function jsonResponse(payload,response){return new Response(JSON.stringify(payload),{status:response.status,headers:response.headers});}

export async function handleFomoMergedRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==GALAXY_PATH&&url.pathname!==TRADER_PATH)return null;
  const live=await handleFomoLiveRequest(request,env);
  if(url.pathname===GALAXY_PATH)return live??handleFomoGalaxyRequest(request,env);
  if(!live)return handleFomoGalaxyRequest(request,env);
  if(request.method!=='GET')return live;
  const fallback=await handleFomoGalaxyRequest(request,env);if(!fallback||live.status!==200||fallback.status!==200)return live;
  const [livePayload,fallbackPayload]=await Promise.all([body(live),body(fallback)]);if(!livePayload||!fallbackPayload)return live;
  return jsonResponse(mergeFomoTraderResponses(livePayload,fallbackPayload),live);
}

export const __fomoMergedContract=Object.freeze({galaxyPath:GALAXY_PATH,traderPath:TRADER_PATH,pageReadsProviderFree:true,maximumPositions:10,latestTrades:3});
