/* Weekly Trader Observatory. Cache-first and D1-only on page reads.
 * Ranking is descriptive research over retained indexed trades, not copy trading.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';

const PATH='/api/intelligence/trader-observatory';
const CACHE_KEY='trader-observatory:7d:v1';
const WINDOW_SECONDS=7*86400;
const CACHE_SECONDS=1800;
const INPUT_ROW_LIMIT=50000;
const SOLANA_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const all=async statement=>{try{return(await statement.all())?.results||[];}catch{return[];}};

function normalizeTrade(row){
  const wallet=s(row.wallet),mint=s(row.mint),side=s(row.side).toLowerCase();
  if(!SOLANA_RE.test(wallet)||!SOLANA_RE.test(mint)||(side!=='buy'&&side!=='sell'))return null;
  const tokenAmount=Math.abs(n(row.tokenAmount??row.token_amount));
  const solAmount=Math.abs(n(row.solAmount??row.sol_amount));
  const observedAt=Math.trunc(n(row.observedAt??row.block_time)*(n(row.observedAt??0)>1e12?1:1000));
  if(!(tokenAmount>0)||!(solAmount>=0)||!(observedAt>0))return null;
  return {wallet,mint,side,tokenAmount,solAmount,observedAt,signature:s(row.signature)||null,source:s(row.source)||'indexed-d1'};
}

/** Average-cost matching inside the seven-day window. Unmatched sells are excluded. */
export function rankWeeklyTraders(rows=[],{limit=50,windowStartMs=0,windowEndMs=Number.MAX_SAFE_INTEGER}={}){
  const trades=(Array.isArray(rows)?rows:[]).map(normalizeTrade).filter(Boolean).filter(row=>row.observedAt>=windowStartMs&&row.observedAt<=windowEndMs).sort((a,b)=>a.observedAt-b.observedAt||String(a.signature).localeCompare(String(b.signature)));
  const positions=new Map();
  const stats=new Map();
  const statFor=wallet=>{
    if(!stats.has(wallet))stats.set(wallet,{wallet,realizedSol:0,matchedSellCount:0,winningMatchedSells:0,tradeCount:0,buySolObserved:0,sellSolObserved:0,tokens:new Set(),lastObservedAt:0});
    return stats.get(wallet);
  };
  for(const trade of trades){
    const stat=statFor(trade.wallet);
    stat.tradeCount+=1;stat.tokens.add(trade.mint);stat.lastObservedAt=Math.max(stat.lastObservedAt,trade.observedAt);
    if(trade.side==='buy')stat.buySolObserved+=trade.solAmount;else stat.sellSolObserved+=trade.solAmount;
    const key=`${trade.wallet}|${trade.mint}`;
    const pos=positions.get(key)||{tokens:0,costSol:0};
    if(trade.side==='buy'){
      pos.tokens+=trade.tokenAmount;pos.costSol+=trade.solAmount;positions.set(key,pos);continue;
    }
    if(!(pos.tokens>0))continue;
    const matched=Math.min(pos.tokens,trade.tokenAmount);
    if(!(matched>0))continue;
    const averageCost=pos.costSol/pos.tokens;
    const matchedCost=averageCost*matched;
    const matchedProceeds=trade.solAmount*(matched/trade.tokenAmount);
    const pnl=matchedProceeds-matchedCost;
    stat.realizedSol+=pnl;
    stat.matchedSellCount+=1;
    if(pnl>0)stat.winningMatchedSells+=1;
    pos.tokens-=matched;pos.costSol=Math.max(0,pos.costSol-matchedCost);positions.set(key,pos);
  }
  return [...stats.values()].filter(row=>row.matchedSellCount>0).sort((a,b)=>b.realizedSol-a.realizedSol||b.matchedSellCount-a.matchedSellCount||b.tradeCount-a.tradeCount||a.wallet.localeCompare(b.wallet)).slice(0,Math.max(1,Math.min(50,Math.trunc(n(limit)||50)))).map((row,index)=>Object.freeze({
    rank:index+1,
    wallet:row.wallet,
    realizedSol:row.realizedSol,
    matchedSellCount:row.matchedSellCount,
    winRate:row.matchedSellCount?row.winningMatchedSells/row.matchedSellCount:null,
    tradeCount:row.tradeCount,
    tokenCount:row.tokens.size,
    buySolObserved:row.buySolObserved,
    sellSolObserved:row.sellSolObserved,
    lastObservedAt:row.lastObservedAt,
  }));
}

async function loadTrades(db,cutoffSec){
  let rows=await all(db.prepare(`SELECT wallet,mint,side,token_amount,sol_amount,block_time,signature,source FROM pump_trades WHERE block_time>=? AND wallet IS NOT NULL AND mint IS NOT NULL AND side IN ('buy','sell') ORDER BY block_time DESC,event_id DESC LIMIT ?`).bind(cutoffSec,INPUT_ROW_LIMIT));
  if(rows.length)return {rows,inputSource:'pump_trades'};
  rows=await all(db.prepare(`SELECT wallet,mint,token_delta,sol_delta,block_time,signature,source FROM bull_wallet_events WHERE block_time>=? AND wallet IS NOT NULL AND mint<>'' AND token_delta<>0 AND sol_delta<>0 ORDER BY block_time DESC,id DESC LIMIT ?`).bind(cutoffSec,INPUT_ROW_LIMIT));
  return {rows:rows.map(row=>({...row,side:n(row.token_delta)>0?'buy':'sell',token_amount:Math.abs(n(row.token_delta)),sol_amount:Math.abs(n(row.sol_delta))})),inputSource:'bull_wallet_events'};
}

export async function refreshTraderObservatory(env={},nowMs=Date.now()){
  const db=intelligenceDb(env);if(!db)return Object.freeze({ok:false,error:'database_unavailable'});
  const windowEndMs=Math.trunc(nowMs),windowStartMs=windowEndMs-WINDOW_SECONDS*1000;
  const loaded=await loadTrades(db,Math.floor(windowStartMs/1000)),rows=loaded.rows;
  const items=rankWeeklyTraders(rows,{limit:50,windowStartMs,windowEndMs});
  const generatedAt=Math.floor(nowMs/1000),mayBeTruncated=rows.length>=INPUT_ROW_LIMIT;
  const sample={inputSource:loaded.inputSource,rowsRead:rows.length,rowLimit:INPUT_ROW_LIMIT,mayBeTruncated};
  const sampleDisclosure=mayBeTruncated
    ? `The ${INPUT_ROW_LIMIT}-row input cap was reached, so older trades inside the seven-day window may be omitted.`
    : `The bounded input read ${rows.length} retained trades, below the ${INPUT_ROW_LIMIT}-row cap.`;
  const payload={
    ok:true,
    coverage:items.length?'partial':'empty',
    window:{from:windowStartMs,to:windowEndMs,label:'7D'},
    method:'matched-in-window-average-cost-realized-sol',
    items,
    source:'a-bulls-indexed-solana',
    sample,
    fomoReference:{provider:'fomo.family',timeframe:'7D',status:'reference-only',ingested:false},
    disclosure:items.length
      ? `Weekly trader stars rank realized SOL from sells matched to buys inside the same retained seven-day indexed window. Unmatched sells are excluded. ${sampleDisclosure} Input source: ${loaded.inputSource}. This is an observed research ranking, not a skill score, identity claim, recommendation, or copy-trading instruction.`
      : `No wallets have enough matched indexed buy/sell evidence in the retained seven-day window to rank. ${sampleDisclosure} Input source: ${loaded.inputSource}. No trader ranking was invented.`,
  };
  await db.prepare(`INSERT INTO bull_intelligence_cache(cache_key,payload_json,source,coverage,generated_at,expires_at) VALUES(?,?,?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,source=excluded.source,coverage=excluded.coverage,generated_at=excluded.generated_at,expires_at=excluded.expires_at`).bind(CACHE_KEY,JSON.stringify(payload),'a-bulls-indexed-solana',payload.coverage,generatedAt,generatedAt+CACHE_SECONDS).run();
  return payload;
}

export async function handleTraderObservatoryRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==PATH||request.method!=='GET')return null;
  const db=intelligenceDb(env);if(!db)return json({ok:false,error:'database_unavailable',coverage:'degraded',items:[],disclosure:'The Intelligence D1 binding is unavailable. No public leaderboard fallback was scraped.'},503);
  let row=null;try{row=await db.prepare('SELECT payload_json,generated_at,expires_at FROM bull_intelligence_cache WHERE cache_key=? LIMIT 1').bind(CACHE_KEY).first();}catch{}
  if(!row)return json({ok:true,coverage:'empty',items:[],method:'matched-in-window-average-cost-realized-sol',source:'a-bulls-indexed-solana',sample:null,fomoReference:{provider:'fomo.family',timeframe:'7D',status:'reference-only',ingested:false},disclosure:'The weekly trader cache has not been produced yet. No Fomo data was scraped and no ranking was invented.'},200,'public, max-age=15, stale-while-revalidate=30');
  let payload;try{payload=JSON.parse(s(row.payload_json)||'{}');}catch{payload={ok:false,coverage:'degraded',items:[],disclosure:'Cached trader observatory payload could not be decoded.'};}
  const stale=Math.floor(Date.now()/1000)>n(row.expires_at);
  return json({...payload,coverage:stale&&payload.coverage!=='empty'?'stale':payload.coverage,cache:stale?'stale':'fresh'},200,'public, max-age=15, stale-while-revalidate=30');
}
