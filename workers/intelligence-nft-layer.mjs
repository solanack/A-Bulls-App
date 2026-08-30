/* Neutral NFT/asset intelligence compatibility layer.
 * Stores observed public-chain NFT events in the existing compatibility schema while
 * exposing neutral product names and explicit coverage limitations.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet } from './intelligence-mesh-runtime.mjs';

const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp01=v=>Math.max(0,Math.min(1,n(v)));
async function all(stmt){try{const r=await stmt.all();return r?.results||[]}catch{return[]}}
async function first(stmt){try{return await stmt.first()}catch{return null}}

export function normalizeNftObservation(raw={},wallet='',source='adapter'){
  const type=s(raw.eventClass||raw.event_class||raw.type||raw.kind).toLowerCase();
  let eventClass='nft-transfer';
  if(/sale|buy|sell/.test(type)) eventClass='nft-sale';
  else if(/list/.test(type)) eventClass='nft-list';
  else if(/mint/.test(type)) eventClass='nft-mint';
  else if(/burn/.test(type)) eventClass='nft-burn';
  return {
    signature:s(raw.signature||raw.txid||raw.transaction_id),
    slot:n(raw.slot),
    blockTime:n(raw.blockTime||raw.block_time||raw.timestamp),
    wallet:s(raw.wallet||raw.owner||wallet),
    assetId:s(raw.assetId||raw.asset_id||raw.mint||raw.tokenMint),
    collection:s(raw.collection||raw.collectionId||raw.collection_id),
    eventClass,
    marketplace:s(raw.marketplace||raw.venue||raw.protocol),
    counterparty:s(raw.counterparty||raw.buyer||raw.seller||raw.peer),
    solValue:raw.solValue==null&&raw.sol_value==null?null:n(raw.solValue??raw.sol_value),
    usdValue:raw.usdValue==null&&raw.usd_value==null?null:n(raw.usdValue??raw.usd_value),
    source:s(raw.source||source),
    confidence:clamp01(raw.confidence==null?0.9:raw.confidence),
    metadata:raw.metadata||raw.attributes||null
  };
}

export async function ingestNftObservations(env={},wallet='',rows=[],source='adapter'){
  const db=intelligenceDb(env); if(!db) throw new Error('Intelligence database binding is unavailable.');
  const normalized=(Array.isArray(rows)?rows:[]).map(x=>normalizeNftObservation(x,wallet,source)).filter(x=>x.wallet&&x.assetId&&x.signature);
  for(const row of normalized){
    await db.prepare(`
      INSERT OR IGNORE INTO bull_nft_wallet_events
        (signature,slot,block_time,wallet,asset_id,collection,event_class,marketplace,counterparty,sol_value,usd_value,source,confidence,metadata_json,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch())
    `).bind(row.signature,row.slot||null,row.blockTime||null,row.wallet,row.assetId,row.collection||null,row.eventClass,row.marketplace||null,row.counterparty||null,row.solValue,row.usdValue,row.source,row.confidence,row.metadata?JSON.stringify(row.metadata):null).run();
  }
  return {accepted:normalized.length,source:s(source),coverage:'observed-nft-events'};
}

export async function nftMemory(env={},wallet='',limit=250){
  const db=intelligenceDb(env); if(!db) return null;
  const events=await all(db.prepare(`
    SELECT signature,slot,block_time,asset_id,collection,event_class,marketplace,counterparty,sol_value,usd_value,source,confidence,metadata_json
    FROM bull_nft_wallet_events WHERE wallet=? ORDER BY block_time ASC LIMIT ?
  `).bind(s(wallet),Math.max(1,Math.min(1000,n(limit)||250))));
  const collections=await all(db.prepare(`
    SELECT collection,COUNT(*) event_count,COUNT(DISTINCT asset_id) unique_assets,MIN(block_time) first_seen,MAX(block_time) last_seen,
      SUM(CASE WHEN event_class='nft-sale' AND sol_value IS NOT NULL THEN sol_value ELSE 0 END) observed_sale_sol
    FROM bull_nft_wallet_events WHERE wallet=? AND collection IS NOT NULL AND collection<>''
    GROUP BY collection ORDER BY event_count DESC,last_seen DESC LIMIT 50
  `).bind(s(wallet)));
  const bounds=await first(db.prepare(`SELECT COUNT(*) event_count,COUNT(DISTINCT asset_id) unique_assets,COUNT(DISTINCT collection) collections,MIN(block_time) first_seen,MAX(block_time) last_seen FROM bull_nft_wallet_events WHERE wallet=?`).bind(s(wallet)));
  return {wallet:s(wallet),events,collections,bounds:bounds||{},walletCoverage:await coverageForWallet(env,wallet),state:events.length?'observed-history':'no-observed-nft-history',disclaimer:'NFT Memory reflects indexed public observations only. Missing history must not be interpreted as absence of ownership or activity.'};
}


