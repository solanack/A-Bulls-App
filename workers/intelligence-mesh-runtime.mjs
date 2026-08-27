/* A Bulls App — Intelligence Mesh runtime
 * Read-only derived intelligence: verification, route/candle persistence,
 * Market Sequence, source health and demand tracking.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';

const s = v => String(v == null ? '' : v).trim();
const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const clamp01 = v => Math.max(0, Math.min(1, n(v)));
const now = () => Math.floor(Date.now() / 1000);

export function meshEnabled(env = {}) {
  return String(env.INTELLIGENCE_MESH_ENABLED || '').toLowerCase() === 'true';
}

export function verificationState(rows = []) {
  const sources = new Set(rows.map(r => s(r.source)).filter(Boolean));
  const verifiedSources = new Set(rows.filter(r => n(r.verified) > 0).map(r => s(r.source)).filter(Boolean));
  const commitments = new Set(rows.map(r => s(r.commitment).toLowerCase()).filter(Boolean));
  if (verifiedSources.size >= 2) return 'verified';
  if (verifiedSources.size >= 1 && sources.size >= 2) return 'verified';
  if (commitments.has('finalized')) return 'finalized';
  if (commitments.has('confirmed')) return 'confirmed';
  return sources.size ? 'observed' : 'unknown';
}

export async function sourceHealth(env = {}) {
  const db = intelligenceDb(env);
  if (!db) return [];
  const result = await db.prepare(`
    SELECT source, source_kind, state, last_ok_at, last_error_at, latency_ms,
           gap_count, details_json, updated_at
    FROM intelligence_source_health
    ORDER BY CASE state WHEN 'ok' THEN 0 WHEN 'degraded' THEN 1 ELSE 2 END, updated_at DESC
  `).all();
  return result?.results || [];
}

export async function coverageForWallet(env = {}, wallet = '') {
  const db = intelligenceDb(env);
  if (!db) return null;
  return await db.prepare(`
    SELECT wallet, newest_signature, oldest_signature, newest_slot, oldest_slot,
           newest_block_time, oldest_block_time, indexed_events, indexed_transactions,
           complete_to_genesis, status, source_set_json, last_error, updated_at
    FROM intelligence_index_coverage WHERE wallet = ?
  `).bind(s(wallet)).first();
}

export async function verificationForSignature(env = {}, wallet = '', signature = '') {
  const db = intelligenceDb(env);
  if (!db) return { state: 'unknown', sources: [] };
  const result = await db.prepare(`
    SELECT source, source_kind, commitment, archive_ref, verified, observed_at, slot
    FROM intelligence_event_provenance
    WHERE wallet = ? AND signature = ?
    ORDER BY verified DESC, observed_at DESC
  `).bind(s(wallet), s(signature)).all();
  const rows = result?.results || [];
  return { state: verificationState(rows), sources: rows };
}

export async function recordGap(env = {}, source = '', startSlot = 0, endSlot = 0) {
  const db = intelligenceDb(env);
  if (!db || !source || !startSlot || !endSlot || endSlot < startSlot) return null;
  const open = await db.prepare(`
    SELECT id FROM intelligence_slot_gaps
    WHERE source=? AND state='open' AND NOT(end_slot < ? OR start_slot > ?)
    ORDER BY id DESC LIMIT 1
  `).bind(s(source), n(startSlot), n(endSlot)).first();
  if (open?.id) return open.id;
  const result = await db.prepare(`
    INSERT INTO intelligence_slot_gaps(source, start_slot, end_slot, state, detected_at)
    VALUES (?, ?, ?, 'open', unixepoch())
  `).bind(s(source), n(startSlot), n(endSlot)).run();
  return result?.meta?.last_row_id || null;
}

export async function markGapRepaired(env = {}, gapId = 0, evidence = {}) {
  const db = intelligenceDb(env);
  if (!db || !gapId) return false;
  await db.prepare(`
    UPDATE intelligence_slot_gaps
    SET state='repaired', repaired_at=unixepoch(), verification_json=?
    WHERE id=?
  `).bind(JSON.stringify(evidence), n(gapId)).run();
  return true;
}

export async function persistTradeRoute(env = {}, route = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Intelligence database binding is unavailable.');
  const signature = s(route.signature);
  const wallet = s(route.wallet);
  const hops = Array.isArray(route.hops) ? route.hops : [];
  if (!signature || !wallet || !hops.length) return 0;
  let written = 0;
  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i] || {};
    await db.prepare(`
      INSERT INTO intelligence_trade_routes
        (signature, wallet, hop_index, program_id, venue, pool, input_mint, output_mint,
         input_amount, output_amount, fee_amount, fee_mint, slot, block_time, source, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(signature, wallet, hop_index) DO UPDATE SET
        program_id=excluded.program_id, venue=excluded.venue, pool=excluded.pool,
        input_mint=excluded.input_mint, output_mint=excluded.output_mint,
        input_amount=excluded.input_amount, output_amount=excluded.output_amount,
        fee_amount=excluded.fee_amount, fee_mint=excluded.fee_mint,
        slot=excluded.slot, block_time=excluded.block_time, source=excluded.source,
        confidence=MAX(confidence, excluded.confidence)
    `).bind(signature, wallet, i, s(hop.programId), s(hop.venue), s(hop.pool),
      s(hop.inputMint), s(hop.outputMint), n(hop.inputAmount), n(hop.outputAmount),
      n(hop.feeAmount), s(hop.feeMint), n(route.slot) || null, n(route.blockTime) || null,
      s(route.source), clamp01(route.confidence ?? hop.confidence ?? 0.8)).run();
    written++;
  }
  return written;
}

export function buildOhlc(swaps = [], bucketSeconds = 60) {
  const buckets = new Map();
  const size = Math.max(60, n(bucketSeconds));
  for (const swap of swaps) {
    const t = n(swap.blockTime);
    const price = n(swap.price);
    if (!t || !(price > 0)) continue;
    const key = Math.floor(t / size) * size;
    const b = buckets.get(key) || { bucketStart: key, bucketSeconds: size, open: price, high: price, low: price, close: price, volumeBase: 0, volumeQuote: 0, swapCount: 0, wallets: new Set(), sources: new Set(), confidence: 1 };
    b.high = Math.max(b.high, price);
    b.low = Math.min(b.low, price);
    b.close = price;
    b.volumeBase += Math.abs(n(swap.baseAmount));
    b.volumeQuote += Math.abs(n(swap.quoteAmount));
    b.swapCount++;
    if (s(swap.wallet)) b.wallets.add(s(swap.wallet));
    if (s(swap.source)) b.sources.add(s(swap.source));
    b.confidence = Math.min(b.confidence, clamp01(swap.confidence == null ? 1 : swap.confidence));
    buckets.set(key, b);
  }
  return [...buckets.values()].sort((a,b)=>a.bucketStart-b.bucketStart).map(b => ({
    ...b, walletCount: b.wallets.size, sourceSet: [...b.sources], wallets: undefined, sources: undefined
  }));
}

export async function persistCandles(env = {}, mint = '', quoteMint = '', candles = []) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Intelligence database binding is unavailable.');
  let written = 0;
  for (const c of candles) {
    await db.prepare(`
      INSERT INTO intelligence_price_candles
        (mint, quote_mint, bucket_start, bucket_seconds, open, high, low, close,
         volume_base, volume_quote, swap_count, wallet_count, confidence, source_set_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(mint, quote_mint, bucket_start, bucket_seconds) DO UPDATE SET
        open=excluded.open, high=excluded.high, low=excluded.low, close=excluded.close,
        volume_base=excluded.volume_base, volume_quote=excluded.volume_quote,
        swap_count=excluded.swap_count, wallet_count=excluded.wallet_count,
        confidence=excluded.confidence, source_set_json=excluded.source_set_json, updated_at=unixepoch()
    `).bind(s(mint), s(quoteMint), n(c.bucketStart), n(c.bucketSeconds), n(c.open), n(c.high),
      n(c.low), n(c.close), n(c.volumeBase), n(c.volumeQuote), n(c.swapCount), n(c.walletCount),
      clamp01(c.confidence), JSON.stringify(c.sourceSet || [])).run();
    written++;
  }
  return written;
}

export async function recordDemand(env = {}, feature = '', scopeType = '', scopeValue = '', costMs = 0) {
  const db = intelligenceDb(env);
  if (!db || !feature || !scopeType) return null;
  const patternKey = `${s(feature)}|${s(scopeType)}|${s(scopeValue)}`;
  const old = await db.prepare(`SELECT request_count, avg_cost_ms FROM intelligence_demand_patterns WHERE pattern_key=?`).bind(patternKey).first();
  const count = n(old?.request_count) + 1;
  const avg = old ? ((n(old.avg_cost_ms) * n(old.request_count)) + n(costMs)) / count : n(costMs);
  const priority = Math.log10(count + 1) * Math.max(1, avg);
  await db.prepare(`
    INSERT INTO intelligence_demand_patterns
      (pattern_key, feature, scope_type, scope_value, request_count, avg_cost_ms,
       last_requested_at, priority_score, materialization_state, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch(), ?, 'none', unixepoch())
    ON CONFLICT(pattern_key) DO UPDATE SET
      request_count=excluded.request_count, avg_cost_ms=excluded.avg_cost_ms,
      last_requested_at=excluded.last_requested_at, priority_score=excluded.priority_score,
      updated_at=unixepoch()
  `).bind(patternKey, s(feature), s(scopeType), s(scopeValue) || null, count, avg, priority).run();
  return { patternKey, count, avgCostMs: avg, priorityScore: priority };
}

export async function marketSequence(env = {}, scopeType = '', scopeValue = '', limit = 100) {
  const db = intelligenceDb(env);
  if (!db) return [];
  const result = await db.prepare(`
    SELECT observed_at, sequence_type, headline, evidence_json, confidence, source_set_json
    FROM intelligence_market_sequence
    WHERE scope_type=? AND scope_value=?
    ORDER BY observed_at ASC LIMIT ?
  `).bind(s(scopeType), s(scopeValue), Math.max(1, Math.min(500, n(limit)||100))).all();
  return result?.results || [];
}

export async function runtimeStatus(env = {}) {
  const db = intelligenceDb(env);
  const sources = db ? await sourceHealth(env) : [];
  return {
    enabled: meshEnabled(env),
    readOnly: true,
    publicAddressOnly: true,
    providers: sources,
    capabilities: {
      liveDataPlane: true,
      historyEngine: true,
      verificationEngine: true,
      onChainCandles: true,
      tradeRoutes: true,
      marketSequence: true,
      demandEngine: true,
      oldFaithfulAdapter: 'adapter-ready',
      substreamsAdapter: 'adapter-ready',
      yellowstoneRichatAdapter: 'adapter-ready'
    },
    generatedAt: now()
  };
}
