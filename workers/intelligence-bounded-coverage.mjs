import { intelligenceDb } from './intelligence-indexer.mjs';

const n=v=>Number.isFinite(Number(v))?Number(v):0;
const nullable=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;

export function summarizeBoundedRetrievalCoverage(row={},observedWalletCount=0){
  const observed=Math.max(0,Math.trunc(n(observedWalletCount))),wallets=Math.max(0,Math.min(observed,Math.trunc(n(row.verified_window_wallets)))),receipts=Math.max(0,Math.trunc(n(row.verified_receipts))),observedRows=Math.max(0,Math.trunc(n(row.observed_rows))),earliest=nullable(row.earliest_searched_from),latest=nullable(row.latest_searched_to);
  return Object.freeze({scope:'verified-bounded-searches-for-observed-wallets',verifiedWindowWallets:wallets,verifiedReceipts:receipts,observedRows,observedWallets:observed,unverifiedOrUncoveredObservedWallets:Math.max(0,observed-wallets),earliestSearchedFrom:earliest==null?null:Math.trunc(earliest),latestSearchedTo:latest==null?null:Math.trunc(latest),statement:receipts?`${wallets} of ${observed} wallets already observed in this token window have at least one external retrieval receipt verifying that the full requested wallet interval was searched.`:'No verified external bounded-search receipts currently cover the full selected window for wallets already observed here.',caveat:'A verified bounded search means an approved retrieval bridge reports searching that public wallet across the stated interval. It does not prove the wallet had activity in that interval, does not mark the wallet complete to genesis, and does not establish complete token-market coverage.'});
}

export async function readBoundedRetrievalCoverage(env={}, {mint,from,to,observedWalletCount=0}={}){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  try{
    const row=await db.prepare(`SELECT COUNT(*) verified_receipts,COUNT(DISTINCT t.wallet) verified_window_wallets,COALESCE(SUM(t.observed_rows),0) observed_rows,MIN(t.searched_from) earliest_searched_from,MAX(t.searched_to) latest_searched_to FROM intelligence_retrieval_tasks t WHERE t.state='complete' AND COALESCE(t.range_verified,0)=1 AND t.searched_from<=? AND t.searched_to>=? AND EXISTS (SELECT 1 FROM bull_wallet_events e WHERE e.wallet=t.wallet AND e.mint=? AND e.block_time BETWEEN ? AND ?)`).bind(from,to,mint,from,to).first();
    return summarizeBoundedRetrievalCoverage(row||{},observedWalletCount);
  }catch{
    return summarizeBoundedRetrievalCoverage({},observedWalletCount);
  }
}


