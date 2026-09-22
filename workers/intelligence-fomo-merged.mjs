/* Unified Fomo page-read handler.
 * Merges cached FomoAPI enrichment with provider top-token context and retained
 * public-chain observations so partial cache coverage does not look falsely empty.
 * Public reads remain read-only; sparse Solana trader reads may request one bounded
 * history indexing job through the existing wallet-token indexer.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { handleFomoGalaxyRequest } from './intelligence-fomo-galaxy.mjs';
import { handleFomoLiveRequest } from './intelligence-fomo-live.mjs';
import { handleWalletTokenIndexRequest } from './intelligence-wallet-token-index.mjs';

const GALAXY_PATH='/api/intelligence/fomo/galaxy';
const TRADER_PATH='/api/intelligence/fomo/trader';
const AUDIT_PATH='/api/intelligence/fomo/audit';
const SOLANA_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});

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

export function mergeIndexedWalletActivity(payload={},indexBody={}){
  if(!indexBody?.ok||!indexBody?.index)return payload;
  const index=indexBody.index,byMint=new Map();
  for(const item of Array.isArray(payload.positions)?payload.positions:[]){const mint=s(item?.mint);if(mint)byMint.set(mint.toLowerCase(),{...item,mint});}
  for(const token of Array.isArray(index.tokens)?index.tokens:[]){const mint=s(token?.mint);if(!SOLANA_RE.test(mint))continue;const key=mint.toLowerCase(),prior=byMint.get(key),observed={mint,symbol:prior?.symbol??null,name:prior?.name??null,chain:'solana',networkId:'solana',sourceKind:prior&&s(prior.sourceKind).includes('fomo-reported')?'fomo-reported+a-bulls-observed':'a-bulls-observed',amount:prior?.amount??null,priceUsd:prior?.priceUsd??null,valueUsd:prior?.valueUsd??null,change24h:prior?.change24h??null,observedNetTokenFlow:Number.isFinite(Number(token.observedTokenFlow))?Number(token.observedTokenFlow):prior?.observedNetTokenFlow??null,tradeCount:Number.isFinite(Number(token.tradeCount))?Number(token.tradeCount):prior?.tradeCount??null,eventCount:Number.isFinite(Number(token.eventCount))?Number(token.eventCount):prior?.eventCount??null,lastObservedAt:n(token.lastEvent)>0?n(token.lastEvent)*1000:prior?.lastObservedAt??null};byMint.set(key,prior?mergePosition(prior,observed):observed);}
  const positions=[...byMint.values()].sort((a,b)=>Number(s(b.sourceKind).includes('fomo-reported'))-Number(s(a.sourceKind).includes('fomo-reported'))||n(b.tradeCount)-n(a.tradeCount)||n(b.lastObservedAt)-n(a.lastObservedAt)).slice(0,10).map((item,index)=>({...item,rank:index+1}));
  const requested=Boolean(index.indexing?.requested),complete=index.coverage?.complete_to_genesis;
  return {...payload,coverage:positions.length||payload.latestTrades?.length?'partial':payload.coverage,positions,indexing:{requested,tokenCount:n(index.tokenCount??index.tokens?.length),completeToGenesis:complete==null?null:Number(complete)===1},disclosure:`${s(payload.disclosure)}${requested?' Retained Solana evidence was sparse, so one bounded wallet-history indexing job was requested; no transaction execution or signing was requested.':' Retained Solana wallet-token coverage was checked from the read-only index.'}`.trim()};
}

async function body(response){try{return await response.clone().json();}catch{return null;}}
function jsonResponse(payload,response){return new Response(JSON.stringify(payload),{status:response.status,headers:response.headers});}
function hasObservedEvidence(payload){return(Array.isArray(payload?.positions)&&payload.positions.some(item=>s(item?.sourceKind).includes('a-bulls-observed')))||(Array.isArray(payload?.latestTrades)&&payload.latestTrades.some(item=>s(item?.sourceKind)==='a-bulls-observed'));}

async function maybeRequestWalletIndex(request,env,payload){
  const wallet=s(payload?.trader?.solanaWallet);if(!SOLANA_RE.test(wallet)||hasObservedEvidence(payload))return payload;
  const url=new URL('/api/intelligence/wallet-tokens',request.url);url.searchParams.set('wallet',wallet);url.searchParams.set('limit','100');
  const response=await handleWalletTokenIndexRequest(new Request(url,{method:'GET',headers:{accept:'application/json'}}),env);if(!response||!response.ok)return payload;
  const indexed=await body(response);return indexed?mergeIndexedWalletActivity(payload,indexed):payload;
}

async function auditPayload(env){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'intelligence_db_unavailable',coverage:'degraded'};
  const first=async(sql)=>{try{return await db.prepare(sql).first();}catch{return null;}};
  const [summary,positionHandles,tradeHandles,observedHandles]=await Promise.all([
    first(`SELECT COUNT(*) traders,SUM(CASE WHEN reported_pnl_usd IS NOT NULL THEN 1 ELSE 0 END) with_pnl,SUM(CASE WHEN solana_wallet IS NOT NULL AND TRIM(solana_wallet)<>'' THEN 1 ELSE 0 END) with_solana_wallet,SUM(CASE WHEN top_tokens_json IS NOT NULL AND top_tokens_json<>'' AND top_tokens_json<>'[]' THEN 1 ELSE 0 END) with_mapped_tokens FROM fomo_traders WHERE current_rank BETWEEN 1 AND 50 AND captured_at=(SELECT MAX(captured_at) FROM fomo_traders)`),
    first(`SELECT COUNT(DISTINCT p.handle) count FROM fomo_trader_positions p JOIN fomo_traders t ON t.handle=p.handle WHERE t.current_rank BETWEEN 1 AND 50 AND t.captured_at=(SELECT MAX(captured_at) FROM fomo_traders)`),
    first(`SELECT COUNT(DISTINCT tr.handle) count FROM fomo_trader_trades tr JOIN fomo_traders t ON t.handle=tr.handle WHERE t.current_rank BETWEEN 1 AND 50 AND t.captured_at=(SELECT MAX(captured_at) FROM fomo_traders)`),
    first(`SELECT COUNT(DISTINCT t.handle) count FROM fomo_traders t JOIN bull_wallet_events e ON e.wallet=t.solana_wallet WHERE t.current_rank BETWEEN 1 AND 50 AND t.captured_at=(SELECT MAX(captured_at) FROM fomo_traders)`),
  ]);
  const traders=n(summary?.traders),withPnl=n(summary?.with_pnl),withSolanaWallet=n(summary?.with_solana_wallet),withMappedTokens=n(summary?.with_mapped_tokens),withProviderPositions=n(positionHandles?.count),withProviderTrades=n(tradeHandles?.count),withObservedChain=n(observedHandles?.count);
  return{ok:true,coverage:traders?'fresh':'empty',capturedAt:Date.now(),counts:{traders,withPnl,withSolanaWallet,withMappedTokens,withProviderPositions,withProviderTrades,withObservedChain},ratios:{pnl:traders?withPnl/traders:0,solanaWallet:traders?withSolanaWallet/traders:0,mappedTokens:traders?withMappedTokens/traders:0,providerPositions:traders?withProviderPositions/traders:0,providerTrades:traders?withProviderTrades/traders:0,observedChain:traders?withObservedChain/traders:0},disclosure:'This audit reports cached provider field coverage and retained public-chain coverage for the current Fomo top 50. Provider PnL and mapped tokens are reported context; observed-chain coverage is independently retained A Bulls evidence. Missing counts are missing coverage, not zero activity.'};
}

export async function handleFomoMergedRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname===AUDIT_PATH){if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);return json(await auditPayload(env),200,'public, max-age=60, stale-while-revalidate=120');}
  if(url.pathname!==GALAXY_PATH&&url.pathname!==TRADER_PATH)return null;
  const live=await handleFomoLiveRequest(request,env);
  if(url.pathname===GALAXY_PATH)return live??handleFomoGalaxyRequest(request,env);
  if(!live){const fallback=await handleFomoGalaxyRequest(request,env);if(!fallback||!fallback.ok)return fallback;const fallbackPayload=await body(fallback);return fallbackPayload?jsonResponse(await maybeRequestWalletIndex(request,env,fallbackPayload),fallback):fallback;}
  if(request.method!=='GET')return live;
  const fallback=await handleFomoGalaxyRequest(request,env);if(!fallback||live.status!==200||fallback.status!==200)return live;
  const [livePayload,fallbackPayload]=await Promise.all([body(live),body(fallback)]);if(!livePayload||!fallbackPayload)return live;
  const merged=mergeFomoTraderResponses(livePayload,fallbackPayload);return jsonResponse(await maybeRequestWalletIndex(request,env,merged),live);
}

export const __fomoMergedContract=Object.freeze({galaxyPath:GALAXY_PATH,traderPath:TRADER_PATH,auditPath:AUDIT_PATH,pageReadsProviderFree:true,maximumPositions:10,latestTrades:3,boundedWalletHistoryOnSparseSolanaTrader:true});
