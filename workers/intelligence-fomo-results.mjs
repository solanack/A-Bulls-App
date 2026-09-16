/* Closed Fomo trade outcome discovery for the public Fomo Galaxy.
 * D1-only page reads. PnL stays provider-reported; retained-chain evidence is
 * separately flagged and never used to imply skill, ownership, or a recommendation.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';

export const FOMO_RESULTS_PATH='/api/intelligence/fomo/results';
const SOLANA_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const bool=value=>s(value).toLowerCase()==='true';
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};
const clamp=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));

function normalizedClosedTrade(row,nowMs){
  const wallet=s(row?.solana_wallet),mint=s(row?.token_address),status=s(row?.status).toLowerCase(),pnlUsd=finite(row?.realized_pnl_usd),closedSec=n(row?.closed_at),createdSec=n(row?.created_at);
  if(status!=='closed'||pnlUsd==null||pnlUsd===0||closedSec<=0||!SOLANA_RE.test(wallet)||!SOLANA_RE.test(mint))return null;
  const closedAt=closedSec*1000,createdAt=createdSec>0?createdSec*1000:null;
  const fromTs=Math.max(0,(createdAt??closedAt-12*60*60*1000)-60*60*1000),toTs=Math.max(fromTs+60_000,Math.min(nowMs,closedAt+60*60*1000));
  const tradeId=s(row?.trade_id)||`${s(row?.handle)}:${mint}:${closedSec}`;
  return Object.freeze({
    id:`fomo-closed:${s(row?.handle)}:${tradeId}`,
    tradeId,
    handle:s(row?.handle),
    displayName:s(row?.display_name)||s(row?.handle),
    rank:n(row?.current_rank)||null,
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

async function resultRows(db){
  const withEvidence=`
    SELECT x.handle,x.trade_id,x.token_address,x.symbol,x.chain,x.status,x.avg_entry_price,x.avg_exit_price,
      x.realized_pnl_usd,x.created_at,x.closed_at,x.source,t.current_rank,t.display_name,t.solana_wallet,
      CASE WHEN EXISTS(
        SELECT 1 FROM bull_wallet_events e
        WHERE e.wallet=t.solana_wallet AND e.mint=x.token_address
        LIMIT 1
      ) THEN 1 ELSE 0 END observed_indexed
    FROM fomo_trader_trades x
    JOIN fomo_traders t ON lower(t.handle)=lower(x.handle)
    WHERE x.status='closed' AND x.closed_at IS NOT NULL AND x.closed_at>0
      AND x.realized_pnl_usd IS NOT NULL AND x.realized_pnl_usd<>0
      AND t.current_rank BETWEEN 1 AND 50
    ORDER BY ABS(x.realized_pnl_usd) DESC, x.closed_at DESC
    LIMIT 500`;
  try{return(await db.prepare(withEvidence).all())?.results||[];}catch{}
  return all(db.prepare(`
    SELECT x.handle,x.trade_id,x.token_address,x.symbol,x.chain,x.status,x.avg_entry_price,x.avg_exit_price,
      x.realized_pnl_usd,x.created_at,x.closed_at,x.source,t.current_rank,t.display_name,t.solana_wallet,
      0 observed_indexed
    FROM fomo_trader_trades x
    JOIN fomo_traders t ON lower(t.handle)=lower(x.handle)
    WHERE x.status='closed' AND x.closed_at IS NOT NULL AND x.closed_at>0
      AND x.realized_pnl_usd IS NOT NULL AND x.realized_pnl_usd<>0
      AND t.current_rank BETWEEN 1 AND 50
    ORDER BY ABS(x.realized_pnl_usd) DESC, x.closed_at DESC
    LIMIT 500`));
}

export async function handleFomoResultsRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==FOMO_RESULTS_PATH)return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(!bool(env.FOMO_GALAXY_ENABLED))return json({ok:false,error:'feature_disabled',coverage:'degraded',winners:[],losers:[],disclosure:'Fomo Galaxy is disabled.'},404);
  const db=intelligenceDb(env);if(!db)return json({ok:false,error:'intelligence_db_unavailable',coverage:'degraded',winners:[],losers:[],disclosure:'The Intelligence D1 binding is unavailable.'},503);
  const limit=clamp(url.searchParams.get('limit'),8,1,20),rows=await resultRows(db),ranked=rankClosedFomoTrades(rows,{limit});
  const total=ranked.winners.length+ranked.losers.length,ready=[...ranked.winners,...ranked.losers].filter(item=>item.observedIndexed).length;
  return json({
    ok:true,
    coverage:total?'partial':'empty',
    winners:ranked.winners,
    losers:ranked.losers,
    replayReadyCount:ready,
    source:'fomoapi.io cached closed trades + a-bulls retained public-chain evidence',
    disclosure:total
      ?`Closed outcomes are ranked from currently cached Fomo provider trade records for the enriched top-trader cohort. Realized USD PnL is provider-reported context, not an independently verified A Bulls performance claim. ${ready} displayed rows already have retained wallet-token chain evidence; opening a sparse Solana row requests the existing bounded read-only history index before Replay.`
      :'No qualifying cached closed Fomo trades with finite realized PnL and valid Solana wallet/token addresses are available yet. Missing coverage is not zero activity.',
  },200,'public, max-age=60, stale-while-revalidate=180');
}

export const __fomoResultsContract=Object.freeze({path:FOMO_RESULTS_PATH,closedOnly:true,requiresFiniteRealizedPnl:true,maximumPerSide:20,pageReadsProviderFree:true,readOnly:true});
