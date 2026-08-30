/* Neutral product-facing Intelligence Layer over legacy + mesh storage.
 * Read-only, evidence-first, and explicit about partial coverage.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';
import { coverageForWallet, verificationState } from './intelligence-mesh-runtime.mjs';

const s = v => String(v == null ? '' : v).trim();
const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const clamp01 = v => Math.max(0, Math.min(1, n(v)));

async function all(stmt) { try { const r = await stmt.all(); return r?.results || []; } catch { return []; } }
async function first(stmt) { try { return await stmt.first(); } catch { return null; } }

export async function walletDna(env = {}, wallet = '') {
  const db = intelligenceDb(env);
  if (!db) return null;
  const coverage = await coverageForWallet(env, wallet);
  const summary = await first(db.prepare(`
    SELECT COUNT(DISTINCT signature) tx_count, COUNT(DISTINCT mint) mint_count,
      SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) swap_events,
      SUM(CASE WHEN token_delta>0 THEN 1 ELSE 0 END) inbound_events,
      SUM(CASE WHEN token_delta<0 THEN 1 ELSE 0 END) outbound_events,
      SUM(fee_lamports)/1000000000.0 fees_sol,
      MIN(block_time) first_seen, MAX(block_time) last_seen
    FROM bull_wallet_events WHERE wallet=?
  `).bind(s(wallet)));
  if (!summary || !n(summary.tx_count)) return { wallet:s(wallet), state:'not-indexed', coverage };
  const tx = Math.max(1,n(summary.tx_count));
  const swaps = n(summary.swap_events);
  const churn = clamp01((n(summary.inbound_events)+n(summary.outbound_events))/Math.max(1,tx*2));
  const rotation = clamp01(swaps/tx);
  const breadth = clamp01(n(summary.mint_count)/20);
  const activityDays = summary.first_seen && summary.last_seen ? Math.max(1,(n(summary.last_seen)-n(summary.first_seen))/86400) : 1;
  const cadence = clamp01(tx/Math.max(1,activityDays*5));
  return {
    wallet:s(wallet),
    state:coverage?.complete_to_genesis ? 'complete-history' : 'partial-history',
    coverage,
    dimensions:{ rotation, breadth, cadence, churn },
    evidence:{ txCount:tx, swapEvents:swaps, uniqueMints:n(summary.mint_count), feesSol:n(summary.fees_sol), firstSeen:n(summary.first_seen)||null, lastSeen:n(summary.last_seen)||null },
    labels:[
      { key:'rotation', label:rotation>=0.55?'high observed rotation':rotation>=0.2?'moderate observed rotation':'low observed rotation', score:rotation },
      { key:'breadth', label:breadth>=0.6?'broad observed token set':breadth>=0.25?'mixed observed token set':'concentrated observed token set', score:breadth },
      { key:'cadence', label:cadence>=0.65?'frequent observed activity':cadence>=0.25?'periodic observed activity':'infrequent observed activity', score:cadence }
    ],
    disclaimer:'Descriptive fingerprint of observed public-chain activity; not identity, personality, skill, or investment advice.'
  };
}

export async function timeMachine(env = {}, wallet = '', limit = 250) {
  const db = intelligenceDb(env);
  if (!db) return { events:[], coverage:null };
  const rows = await all(db.prepare(`
    SELECT signature,slot,block_time,counterparty,program_id,mint,collection,event_class,
      sol_delta,token_delta,fee_lamports,source,confidence
    FROM bull_wallet_events WHERE wallet=? ORDER BY block_time ASC LIMIT ?
  `).bind(s(wallet),Math.max(1,Math.min(1000,n(limit)||250))));
  return { wallet:s(wallet), events:rows, coverage:await coverageForWallet(env,wallet) };
}

export async function constellation(env = {}, wallet = '', limit = 100) {
  const db = intelligenceDb(env);
  if (!db) return [];
  return all(db.prepare(`
    SELECT wallet_a,wallet_b,first_seen,last_seen,interaction_count,sol_volume,
      token_event_count,relationship_types
    FROM bull_wallet_relationships WHERE wallet_a=? OR wallet_b=?
    ORDER BY interaction_count DESC,last_seen DESC LIMIT ?
  `).bind(s(wallet),s(wallet),Math.max(1,Math.min(500,n(limit)||100))));
}

export async function museum(env = {}, wallet = '') {
  const db = intelligenceDb(env);
  if (!db) return null;
  const firstEvent = await first(db.prepare(`SELECT signature,block_time,event_class,mint,sol_delta,token_delta,source FROM bull_wallet_events WHERE wallet=? AND block_time>0 ORDER BY block_time ASC LIMIT 1`).bind(s(wallet)));
  const latestEvent = await first(db.prepare(`SELECT signature,block_time,event_class,mint,sol_delta,token_delta,source FROM bull_wallet_events WHERE wallet=? AND block_time>0 ORDER BY block_time DESC LIMIT 1`).bind(s(wallet)));
  const largestSol = await first(db.prepare(`SELECT signature,block_time,event_class,mint,sol_delta,source FROM bull_wallet_events WHERE wallet=? ORDER BY ABS(sol_delta) DESC LIMIT 1`).bind(s(wallet)));
  const topMints = await all(db.prepare(`SELECT mint,COUNT(*) event_count,SUM(ABS(token_delta)) observed_turnover FROM bull_wallet_events WHERE wallet=? AND mint IS NOT NULL AND mint<>'' GROUP BY mint ORDER BY event_count DESC LIMIT 8`).bind(s(wallet)));
  return { wallet:s(wallet), firstEvent, latestEvent, largestObservedSolMovement:largestSol, topObservedMints:topMints, coverage:await coverageForWallet(env,wallet) };
}

export async function chainLens(env = {}, wallet = '', signature = '') {
  const db = intelligenceDb(env);
  if (!db) return null;
  const hops = await all(db.prepare(`
    SELECT hop_index,program_id,venue,pool,input_mint,output_mint,input_amount,output_amount,
      fee_amount,fee_mint,slot,block_time,source,confidence
    FROM intelligence_trade_routes WHERE wallet=? AND signature=? ORDER BY hop_index ASC
  `).bind(s(wallet),s(signature)));
  const provenance = await all(db.prepare(`
    SELECT source,source_kind,commitment,archive_ref,verified,observed_at,slot
    FROM intelligence_event_provenance WHERE wallet=? AND signature=? ORDER BY verified DESC,observed_at DESC
  `).bind(s(wallet),s(signature)));
  return { wallet:s(wallet), signature:s(signature), hops, verification:{ state:verificationState(provenance), sources:provenance } };
}

export async function candles(env = {}, mint = '', quoteMint = '', bucketSeconds = 60, limit = 300) {
  const db = intelligenceDb(env);
  if (!db) return [];
  return all(db.prepare(`
    SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,
      swap_count,wallet_count,confidence,source_set_json
    FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=?
    ORDER BY bucket_start DESC LIMIT ?
  `).bind(s(mint),s(quoteMint),Math.max(60,n(bucketSeconds)||60),Math.max(1,Math.min(1000,n(limit)||300))));
}

export async function chainRadar(env = {}) {
  const db = intelligenceDb(env);
  if (!db) return [];
  return all(db.prepare(`SELECT anomaly_key,scope_type,scope_value,observed_at,severity,baseline_value,observed_value,sample_size,evidence_json,expires_at FROM bull_radar_anomalies WHERE expires_at IS NULL OR expires_at>unixepoch() ORDER BY observed_at DESC,severity DESC LIMIT 100`));
}

export async function chainWeather(env = {}) {
  const db = intelligenceDb(env);
  if (!db) return null;
  return first(db.prepare(`SELECT bucket_start,bucket_seconds,regime,activity_score,volatility_score,concentration_score,rotation_score,convergence_score,nft_activity_score,evidence_json FROM bull_chain_weather ORDER BY bucket_start DESC LIMIT 1`));
}

