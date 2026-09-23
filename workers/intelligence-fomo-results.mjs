/* Closed Fomo trade outcome discovery for the public Fomo Galaxy.
 * D1-only page reads. PnL stays provider-reported; retained-chain evidence is
 * separately flagged and never used to imply skill, ownership, or a recommendation.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { canonicalChainAddress,normalizeChainKey,resolveChain } from './intelligence-chain-registry.mjs';

export const FOMO_RESULTS_PATH='/api/intelligence/fomo/results';
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const bool=value=>s(value).toLowerCase()==='true';
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};
const clamp=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));

function normalizedClosedTrade(row,nowMs){
  const rawChain=s(row?.chain),token=s(row?.token_address),chain=normalizeChainKey(rawChain||(token.startsWith('0x')?'unknown-evm':'solana')),definition=resolveChain(chain,{address:token}),status=s(row?.status).toLowerCase(),pnlUsd=finite(row?.realized_pnl_usd),closedSec=n(row?.closed_at),createdSec=n(row?.created_at);
  if(!definition||status!=='closed'||pnlUsd==null||pnlUsd===0||closedSec<=0)return null;
  const walletRaw=definition.kind==='svm'?s(row?.solana_wallet):s(row?.evm_wallet),wallet=canonicalChainAddress(chain,walletRaw),mint=canonicalChainAddress(chain,token);
  if(!wallet||!mint)return null;
  const closedAt=closedSec*1000,createdAt=createdSec>0?createdSec*1000:null;
  const fromTs=Math.max(0,(createdAt??closedAt-12*60*60*1000)-60*60*1000),toTs=Math.max(fromTs+60_000,Math.min(nowMs,closedAt+60*60*1000));
  const tradeId=s(row?.trade_id)||`${s(row?.handle)}:${chain}:${mint}:${closedSec}`;
  return Object.freeze({
    id:`fomo-closed:${s(row?.handle)}:${tradeId}`,
    tradeId,
    handle:s(row?.handle),
    displayName:s(row?.display_name)||s(row?.handle),
    rank:n(row?.current_rank)||null,
    chain,
    wallet,
    mint,
    symbol:s(row?.symbol)||null,
    pnlUsd,
    entryPriceUsd:finite(row?.avg_entry_price),
    exitPriceUsd:finite(row?.avg_exit_price),
    createdAt,
    closedAt,
    fromTs,
    toTs,
    observedIndexed:Number(row?.observed_indexed)===1,
    chartIndexed:Number(row?.chart_indexed)===1,
    source:'fomoapi.io',
  });
}

export function rankClosedFomoTrades(rows=[],{limit=8,nowMs=Date.now()}={}){
  const cap=clamp(limit,8,1,20),items=(Array.isArray(rows)?rows:[]).map(row=>normalizedClosedTrade(row,nowMs)).filter(Boolean);
  const indexedFirst=(a,b)=>Number(b.observedIndexed)-Number(a.observedIndexed);
  const winners=items.filter(item=>item.pnlUsd>0).sort((a,b)=>b.pnlUsd-a.pnlUsd||indexedFirst(a,b)||b.closedAt-a.closedAt).slice(0,cap);
  const losers=items.filter(item=>item.pnlUsd<0).sort((a,b)=>a.pnlUsd-b.pnlUsd||indexedFirst(a,b)||b.closedAt-a.closedAt).slice(0,cap);
  return Object.freeze({winners:Object.freeze(winners),losers:Object.freeze(losers)});
}

/* One pass over closed trades with no correlated subqueries; the materialized cohort gets an automatic
 * index on h. D1 serializes queries per database, so a slow read here stalls every Field read behind it. */
async function resultRows(db){
  return all(db.prepare(`
    WITH t AS MATERIALIZED (
      SELECT lower(handle) h,current_rank,display_name,solana_wallet,evm_wallet FROM fomo_traders
      WHERE current_rank BETWEEN 1 AND 50 AND captured_at=(SELECT MAX(captured_at) FROM fomo_traders)
    )
    SELECT x.handle,x.trade_id,x.token_address,x.symbol,x.chain,x.status,x.avg_entry_price,x.avg_exit_price,
      x.realized_pnl_usd,x.created_at,x.closed_at,x.source,t.current_rank,t.display_name,t.solana_wallet,t.evm_wallet,
      0 observed_indexed,0 chart_indexed
    FROM fomo_trader_trades x
    JOIN t ON t.h=lower(x.handle)
    WHERE x.status='closed' AND x.closed_at IS NOT NULL AND x.closed_at>0
      AND x.realized_pnl_usd IS NOT NULL AND x.realized_pnl_usd<>0
    ORDER BY ABS(x.realized_pnl_usd) DESC, x.closed_at DESC
    LIMIT 5000`));
}

const variants=(...values)=>[...new Set(values.map(s).filter(Boolean))];
const inList=values=>values.map(()=>'?').join(',');
const SOLANA_ALIASES=new Set(['solana','sol','svm','solana-mainnet']);

/** Index-friendly evidence probes for one displayed trade: exact key matches only, no LOWER() on columns. */
function evidenceStatements(db,row,item){
  const chains=variants(row.chain,s(row.chain).toLowerCase(),item.chain),solana=SOLANA_ALIASES.has(s(row.chain).toLowerCase())||item.chain==='solana';
  const wallets=variants(row.evm_wallet,s(row.evm_wallet).toLowerCase()),assets=variants(row.token_address,s(row.token_address).toLowerCase(),item.mint);
  const observed=[],chart=[];
  if(solana&&s(row.solana_wallet))observed.push(db.prepare('SELECT 1 hit FROM bull_wallet_events WHERE wallet=? AND mint=? LIMIT 1').bind(s(row.solana_wallet),s(row.token_address)));
  if(wallets.length)observed.push(db.prepare(`SELECT 1 hit FROM intelligence_chain_events_v2 WHERE chain_key IN (${inList(chains)}) AND wallet_address IN (${inList(wallets)}) AND asset_address IN (${inList(assets)}) AND source_kind='observed-fact' LIMIT 1`).bind(...chains,...wallets,...assets));
  chart.push(db.prepare(`SELECT 1 hit FROM intelligence_price_candles_v2 WHERE chain_key IN (${inList(chains)}) AND asset_address IN (${inList(assets)}) LIMIT 1`).bind(...chains,...assets));
  if(solana)chart.push(db.prepare('SELECT 1 hit FROM intelligence_price_candles WHERE mint=? LIMIT 1').bind(s(row.token_address)));
  return{observed,chart};
}

async function markEvidence(db,rows,displayed,nowMs){
  const byId=new Map();for(const row of rows){const item=normalizedClosedTrade(row,nowMs);if(item)byId.set(item.id,row);}
  const probes=displayed.map(item=>{const row=byId.get(item.id);return row?{row,...evidenceStatements(db,row,item)}:null;}).filter(Boolean);
  const statements=probes.flatMap(probe=>[...probe.observed,...probe.chart]);if(!statements.length)return;
  let results;try{results=await db.batch(statements);}catch{return;}
  let cursor=0;const hit=()=>Boolean(results[cursor++]?.results?.length);
  for(const probe of probes){const observed=probe.observed.map(hit).some(Boolean),chart=probe.chart.map(hit).some(Boolean);probe.row.observed_indexed=observed?1:0;probe.row.chart_indexed=chart?1:0;}
}

export async function handleFomoResultsRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==FOMO_RESULTS_PATH)return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(!bool(env.FOMO_GALAXY_ENABLED))return json({ok:false,error:'feature_disabled',coverage:'degraded',winners:[],losers:[],disclosure:'Fomo Galaxy is disabled.'},404);
  const db=intelligenceDb(env);if(!db)return json({ok:false,error:'intelligence_db_unavailable',coverage:'degraded',winners:[],losers:[],disclosure:'The Intelligence D1 binding is unavailable.'},503);
  const limit=clamp(url.searchParams.get('limit'),8,1,20),nowMs=Date.now(),rows=(await resultRows(db)).map(row=>({...row})),first=rankClosedFomoTrades(rows,{limit,nowMs});
  await markEvidence(db,rows,[...first.winners,...first.losers],nowMs);
  const ranked=rankClosedFomoTrades(rows,{limit,nowMs});
  const total=ranked.winners.length+ranked.losers.length,displayed=[...ranked.winners,...ranked.losers],ready=displayed.filter(item=>item.observedIndexed).length,chartReady=displayed.filter(item=>item.chartIndexed).length;
  return json({
    ok:true,
    coverage:total?'partial':'empty',
    winners:ranked.winners,
    losers:ranked.losers,
    replayReadyCount:ready,
    chartReadyCount:chartReady,
    source:'fomoapi.io cached closed trades + a-bulls retained public-chain evidence + source-labeled market cache',
    disclosure:total
      ?`Top Winners and Losses are ranked by provider-reported realized USD PnL across the current chain-qualified Fomo trader cohort, including supported Solana and EVM chains. PnL remains provider-reported context, not an independently verified A Bulls performance claim. ${ready} displayed rows have independently retained wallet-token chain evidence and ${chartReady} already have indexed market candles; missing candles are hydrated from source-labeled public market data when available.`
      :'No qualifying cached closed Fomo trades with finite realized PnL and valid Solana wallet/token addresses are available yet. Missing coverage is not zero activity.',
  },200,'public, max-age=60, stale-while-revalidate=180');
}

export const __fomoResultsContract=Object.freeze({path:FOMO_RESULTS_PATH,closedOnly:true,requiresFiniteRealizedPnl:true,multiChain:true,currentSnapshotOnly:true,maximumPerSide:20,pageReadsProviderFree:true,readOnly:true});
