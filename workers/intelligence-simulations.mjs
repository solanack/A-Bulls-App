/* Neutral historical simulations for Intelligence.
 * These are counterfactuals over observed public-chain data, not predictions or advice.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet } from './intelligence-mesh-runtime.mjs';

const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
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
  return {wallet:s(wallet),quoteMint:s(quoteMint),state:positions.length?'ready':'no-observed-buy-like-events',coverage:await coverageForWallet(env,wallet),positions,totalObservedAcquiredUnits:totalAcquired,comparablePositions:comparable,hypotheticalAggregateChangeQuote:hypotheticalDeltaQuote,disclaimer:'Counterfactual hold calculation over observed buy-like balance changes and indexed on-chain candles. Not realized P&L, not complete unless coverage is complete, and not investment advice.'};
}

export async function parallelUniverse(env={},wallet='',quoteMint='',holdDays=7,limit=60){
  const db=intelligenceDb(env); if(!db) return null;
  const days=Math.max(1,Math.min(365,n(holdDays)||7));
  const rows=await all(db.prepare(`SELECT signature,block_time,mint,token_delta,source,confidence FROM bull_wallet_events WHERE wallet=? AND event_class='swap-like' AND token_delta>0 AND mint IS NOT NULL AND mint<>'' ORDER BY block_time ASC LIMIT ?`).bind(s(wallet),Math.max(1,Math.min(200,n(limit)||60))));
  const outcomes=[];
  for(const row of rows){
    const entry=await priceAtOrAfter(db,row.mint,quoteMint,row.block_time);
    const target=await priceAtOrAfter(db,row.mint,quoteMint,n(row.block_time)+days*86400);
    if(!entry||!target||n(entry.close)<=0) continue;
    const amount=n(row.token_delta);
    outcomes.push({signature:row.signature,mint:row.mint,blockTime:n(row.block_time),holdDays:days,observedAcquiredAmount:amount,entryPrice:n(entry.close),targetPrice:n(target.close),entryValueQuote:amount*n(entry.close),counterfactualValueQuote:amount*n(target.close),counterfactualChangeQuote:amount*(n(target.close)-n(entry.close)),confidence:Math.min(n(row.confidence)||1,n(entry.confidence)||1,n(target.confidence)||1)});
  }
  const total=outcomes.reduce((a,x)=>a+x.counterfactualChangeQuote,0);
  return {wallet:s(wallet),quoteMint:s(quoteMint),rule:{type:'fixed-hold-after-observed-acquisition',holdDays:days},outcomes,aggregateCounterfactualChangeQuote:total,coverage:await coverageForWallet(env,wallet),disclaimer:'Historical counterfactual only. It asks what the indexed record would have looked like under a fixed hold rule; it does not recommend future behavior.'};
}

export async function compareWallets(env={},walletA='',walletB=''){
  const db=intelligenceDb(env); if(!db) return null;
  const summarize=async wallet=>first(db.prepare(`SELECT COUNT(DISTINCT signature) tx_count,COUNT(DISTINCT mint) mint_count,SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) swap_events,SUM(fee_lamports)/1000000000.0 fees_sol,MIN(block_time) first_seen,MAX(block_time) last_seen FROM bull_wallet_events WHERE wallet=?`).bind(s(wallet)));
  const [a,b]=await Promise.all([summarize(walletA),summarize(walletB)]);
  return {walletA:s(walletA),walletB:s(walletB),a:a||{},b:b||{},comparison:{txDifference:n(a?.tx_count)-n(b?.tx_count),mintBreadthDifference:n(a?.mint_count)-n(b?.mint_count),swapEventDifference:n(a?.swap_events)-n(b?.swap_events),feeDifferenceSol:n(a?.fees_sol)-n(b?.fees_sol)},disclaimer:'Comparison of observed public activity only. It does not rank skill, intelligence, identity, or ownership.'};
}


