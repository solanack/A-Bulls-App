/* Neutral historical simulations for Intelligence.
 * These are counterfactuals over observed public-chain data, not predictions or advice.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet } from './intelligence-mesh-runtime.mjs';

const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const finite=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const median=values=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;};
async function all(stmt){try{const r=await stmt.all();return r?.results||[]}catch{return[]}}
async function first(stmt){try{return await stmt.first()}catch{return null}}

async function priceAtOrAfter(db,mint,quoteMint,ts){
  return first(db.prepare(`SELECT bucket_start,close,confidence FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_start>=? ORDER BY bucket_start ASC LIMIT 1`).bind(s(mint),s(quoteMint),n(ts)));
}
async function latestPrice(db,mint,quoteMint){
  return first(db.prepare(`SELECT bucket_start,close,confidence FROM intelligence_price_candles WHERE mint=? AND quote_mint=? ORDER BY bucket_start DESC LIMIT 1`).bind(s(mint),s(quoteMint)));
}

export async function ghostPortfolio(env={},wallet='',quoteMint='So11111111111111111111111111111111111111112',limit=80){
  const db=intelligenceDb(env); if(!db) return null;
  const buys=await all(db.prepare(`
    SELECT signature,block_time,mint,token_delta,source,confidence
    FROM bull_wallet_events
    WHERE wallet=? AND event_class='swap-like' AND token_delta>0 AND mint IS NOT NULL AND mint<>''
    ORDER BY block_time ASC LIMIT ?
  `).bind(s(wallet),Math.max(1,Math.min(200,n(limit)||80))));
  const positions=[];
  let totalAcquired=0, comparable=0, hypotheticalDeltaQuote=0;
  for(const row of buys){
    const entry=await priceAtOrAfter(db,row.mint,quoteMint,row.block_time);
    const latest=await latestPrice(db,row.mint,quoteMint);
    const amount=n(row.token_delta);
    const item={signature:row.signature,blockTime:n(row.block_time),mint:row.mint,observedAcquiredAmount:amount,source:row.source,confidence:n(row.confidence),entryPrice:entry?{time:n(entry.bucket_start),close:n(entry.close),confidence:n(entry.confidence)}:null,latestIndexedPrice:latest?{time:n(latest.bucket_start),close:n(latest.close),confidence:n(latest.confidence)}:null};
    if(entry&&latest&&n(entry.close)>0){
      item.hypotheticalHoldValueAtEntry=amount*n(entry.close);
      item.hypotheticalHoldValueAtLatestIndexedCandle=amount*n(latest.close);
      item.hypotheticalChangeQuote=item.hypotheticalHoldValueAtLatestIndexedCandle-item.hypotheticalHoldValueAtEntry;
      hypotheticalDeltaQuote+=item.hypotheticalChangeQuote; comparable++;
    }
    totalAcquired+=amount; positions.push(item);
  }
  return {wallet:s(wallet),quoteMint:s(quoteMint),state:positions.length?'ready':'no-observed-buy-like-events',coverage:await coverageForWallet(env,wallet),positions,totalObservedAcquiredUnits:totalAcquired,comparablePositions:comparable,positionCount:positions.length,hypotheticalAggregateChangeQuote:comparable?hypotheticalDeltaQuote:null,disclaimer:'Counterfactual hold calculation over observed buy-like balance changes and indexed on-chain candles. Not realized P&L, not complete unless coverage is complete, and not investment advice.'};
}

export async function parallelUniverse(env={},wallet='',quoteMint='',holdDays=7,limit=60,mintFilter=''){
  const db=intelligenceDb(env); if(!db) return null;
  const days=Math.max(1,Math.min(365,n(holdDays)||7));
  const mint=s(mintFilter);
  const rows=await all(db.prepare(`SELECT signature,block_time,mint,token_delta,source,confidence FROM bull_wallet_events WHERE wallet=? AND event_class='swap-like' AND token_delta>0 AND mint IS NOT NULL AND mint<>'' AND (?='' OR mint=?) ORDER BY block_time ASC LIMIT ?`).bind(s(wallet),mint,mint,Math.max(1,Math.min(200,n(limit)||60))));
  const outcomes=[];
  for(const row of rows){
    const entry=await priceAtOrAfter(db,row.mint,quoteMint,row.block_time);
    const target=await priceAtOrAfter(db,row.mint,quoteMint,n(row.block_time)+days*86400);
    if(!entry||!target||n(entry.close)<=0) continue;
    const amount=n(row.token_delta);
    outcomes.push({signature:row.signature,mint:row.mint,blockTime:n(row.block_time),holdDays:days,observedAcquiredAmount:amount,entryPrice:n(entry.close),targetPrice:n(target.close),entryValueQuote:amount*n(entry.close),counterfactualValueQuote:amount*n(target.close),counterfactualChangeQuote:amount*(n(target.close)-n(entry.close)),confidence:Math.min(n(row.confidence)||1,n(entry.confidence)||1,n(target.confidence)||1)});
  }
  const total=outcomes.reduce((a,x)=>a+x.counterfactualChangeQuote,0);
  return {wallet:s(wallet),quoteMint:s(quoteMint),rule:{type:'fixed-hold-after-observed-acquisition',holdDays:days},outcomes,comparablePositions:outcomes.length,positionCount:rows.length,aggregateCounterfactualChangeQuote:outcomes.length?total:null,coverage:await coverageForWallet(env,wallet),disclaimer:'Historical counterfactual only. It asks what the indexed record would have looked like under a fixed hold rule; it does not recommend future behavior.'};
}

export function summarizePerformanceRounds(rounds=[],{periodDays=30,truncated=false}={}){
  const closed=(Array.isArray(rounds)?rounds:[]).filter(row=>s(row?.status)==='closed');
  const eligible=closed.filter(row=>s(row?.coverage)==='complete'&&finite(row?.matched_realized_sol??row?.matchedRealizedSol)!=null&&finite(row?.buy_sol??row?.buySol)>0);
  const results=eligible.map(row=>({
    pnl:finite(row.matched_realized_sol??row.matchedRealizedSol),
    basis:finite(row.buy_sol??row.buySol),
    exitTs:finite(row.exit_ts??row.exitTs)??finite(row.entry_ts??row.entryTs)??0,
  })).filter(row=>row.pnl!=null&&row.basis!=null&&row.basis>0).sort((a,b)=>a.exitTs-b.exitTs);
  const pnls=results.map(row=>row.pnl),positive=pnls.filter(value=>value>0),negative=pnls.filter(value=>value<0),breakeven=pnls.filter(value=>value===0);
  const realizedSol=pnls.reduce((sum,value)=>sum+value,0),grossProfit=positive.reduce((sum,value)=>sum+value,0),grossLoss=Math.abs(negative.reduce((sum,value)=>sum+value,0));
  const rois=results.map(row=>row.pnl/row.basis),best=positive.length?Math.max(...positive):null;
  let cumulative=0,peak=0,maxDrawdownSol=0;
  for(const value of pnls){cumulative+=value;peak=Math.max(peak,cumulative);maxDrawdownSol=Math.max(maxDrawdownSol,peak-cumulative);}
  return Object.freeze({
    realized_sol:results.length?realizedSol:null,
    win_rate_pct:results.length?positive.length/results.length*100:null,
    profit_factor:grossLoss>0?grossProfit/grossLoss:null,
    median_roi_pct:rois.length?median(rois)*100:null,
    average_win_sol:positive.length?grossProfit/positive.length:null,
    average_loss_sol:negative.length?grossLoss/negative.length:null,
    realized_drawdown_sol:results.length?maxDrawdownSol:null,
    excluding_best_sol:best!=null?realizedSol-best:null,
    eligible_cycles:results.length,
    closed_cycles:closed.length,
    excluded_cycles:Math.max(0,closed.length-results.length),
    wins:positive.length,
    losses:negative.length,
    breakevens:breakeven.length,
    no_observed_losses:results.length>0&&negative.length===0,
    period_days:periodDays,
    sample_truncated:Boolean(truncated),
    method:'matched-round-complete-basis-gross-sol-v1',
  });
}

export async function compareWallets(env={},walletA='',walletB='',periodDays=30){
  const db=intelligenceDb(env); if(!db) return null;
  const days=Math.max(1,Math.min(3650,Math.trunc(n(periodDays)||30))),from=Date.now()-days*86400000,limit=5000;
  const load=async wallet=>{
    const rows=await all(db.prepare(`SELECT status,entry_ts,exit_ts,buy_sol,sell_sol,matched_realized_sol,coverage,method FROM matched_trade_rounds WHERE wallet=? AND status='closed' AND exit_ts>=? ORDER BY exit_ts ASC LIMIT ?`).bind(s(wallet),from,limit+1));
    const truncated=rows.length>limit;
    return summarizePerformanceRounds(rows.slice(0,limit),{periodDays:days,truncated});
  };
  const [a,b,coverageA,coverageB]=await Promise.all([load(walletA),load(walletB),coverageForWallet(env,walletA),coverageForWallet(env,walletB)]);
  return {
    walletA:s(walletA),walletB:s(walletB),a,b,
    comparison:{periodDays:days,method:'matched-round-complete-basis-gross-sol-v1',samePeriod:true},
    coverage:{a:coverageA,b:coverageB},
    disclaimer:'Same-period comparison of retained closed matched rounds with complete acquisition basis. Realized SOL is gross of fees unless those costs are already embedded in retained swap amounts. Unknown-basis and incomplete cycles are excluded; no fee, activity, identity, or skill winner is inferred.'
  };
}
