/* Weekly Trader Observatory. Cache-first and D1-only on page reads.
 * The 15-minute scheduler calls refreshTraderObservatoryIfDue. Page reads do not
 * recompute the window. That split is why a cache written around 2026-09-08
 * (method matched-in-window-average-cost-realized-sol) was still served weeks
 * later: refreshTraderObservatory existed, and nothing on the cron called it.
 * The cache key is now v2, so that average-cost payload is not reused.
 * A payload older than 7 days is withheld instead of ranked.
 *
 * Minimum sample: 5 priced matched sells across 2 tokens. See
 * intelligence-distribution-metrics.mjs. Sort key is matched realized SOL.
 * Win rate is reported and is never the sort key.
 *
 * Realized SOL follows the priced-slice FIFO rule from the matched-round work
 * in PR #125 (derivePosition / matchedRealizedSol): a sell realizes only the
 * quantity with a known SOL cost. The unpriced remainder stays unmatched.
 * A zero SOL leg is known cost. Open inventory is not realized.
 * This file does not add a migration. 0041 and 0042 belong to that PR.
 * The next free migration number is 0043.
 *
 * pump_trades has no fee column, so that path stays gross and netOfFeesSol is
 * null. bull_wallet_events can subtract an observed sell-signature network fee
 * only when every matched sell has fee_lamports > 0. A default 0 is not a fee.
 * Pool fees inside the swap leg are not itemized and are not subtracted again.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { MIN_DISTINCT_TOKENS, MIN_MATCHED_SELLS, dataCompleteness, summarizeTradePnls } from './intelligence-distribution-metrics.mjs';

const PATH = '/api/intelligence/trader-observatory';
export const OBSERVATORY_CACHE_KEY = 'trader-observatory:7d:v2';
const WINDOW_SECONDS = 7 * 86400;
const CACHE_SECONDS = 1800;
export const OBSERVATORY_FRESH_SECONDS = 2 * 3600;
export const OBSERVATORY_HIDE_AFTER_SECONDS = 7 * 86400;
const INPUT_ROW_LIMIT = 50000;
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s = value => String(value ?? '').trim();
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const finite = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const json = (body, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache, 'x-content-type-options': 'nosniff' } });
const all = async statement => { try { return (await statement.all())?.results || []; } catch { return []; } };

export function observatoryFreshness(generatedAt, nowSec = Math.floor(Date.now() / 1000)) {
  const stamp = Math.trunc(n(generatedAt));
  if (!(stamp > 0)) return Object.freeze({ fresh: false, stale: true, withhold: false, ageSeconds: null });
  const ageSeconds = nowSec - stamp;
  return Object.freeze({
    fresh: ageSeconds <= OBSERVATORY_FRESH_SECONDS,
    stale: ageSeconds > OBSERVATORY_FRESH_SECONDS,
    withhold: ageSeconds > OBSERVATORY_HIDE_AFTER_SECONDS,
    ageSeconds,
  });
}

function normalizeTrade(row) {
  const wallet = s(row.wallet), mint = s(row.mint), side = s(row.side).toLowerCase();
  if (!SOLANA_RE.test(wallet) || !SOLANA_RE.test(mint) || (side !== 'buy' && side !== 'sell')) return null;
  const tokenAmount = Math.abs(n(row.tokenAmount ?? row.token_amount));
  const rawSol = finite(row.solAmount ?? row.sol_amount), solAmount = rawSol == null ? null : Math.abs(rawSol);
  const observedAt = Math.trunc(n(row.observedAt ?? row.block_time) * (n(row.observedAt ?? 0) > 1e12 ? 1 : 1000));
  if (!(tokenAmount > 0) || !(observedAt > 0)) return null;
  const directFee = finite(row.feeSol);
  const feeLamports = finite(row.feeLamports ?? row.fee_lamports);
  const feeSol = directFee != null ? (directFee > 0 ? directFee : null) : (feeLamports != null && feeLamports > 0 ? feeLamports / 1e9 : null);
  return { wallet, mint, side, tokenAmount, solAmount, observedAt, signature: s(row.signature) || null, source: s(row.source) || 'indexed-d1', feeSol };
}

function stampFresh(item, fresh) {
  if (!item?.completeness) return item;
  const reasons = Array.isArray(item.completeness.reasons) ? item.completeness.reasons.filter(reason => reason !== 'stale') : [];
  if (!fresh) reasons.push('stale');
  const state = item.completeness.state === 'insufficient' ? 'insufficient' : (!fresh || item.completeness.state === 'partial' ? 'partial' : 'complete');
  return { ...item, completeness: { ...item.completeness, fresh, state, reasons } };
}

export function presentObservatoryPayload(payload, { generatedAt = 0, nowSec = Math.floor(Date.now() / 1000) } = {}) {
  const decision = observatoryFreshness(generatedAt, nowSec);
  const base = payload && typeof payload === 'object' ? payload : {};
  const stored = Array.isArray(base.items) ? base.items : [];
  const items = decision.withhold ? [] : stored.map(item => stampFresh(item, decision.fresh));
  const updated = new Date((Math.trunc(n(generatedAt)) || nowSec) * 1000).toISOString();
  const staleNote = `This ranking was last updated ${updated} and may be out of date.`;
  const hiddenNote = `This ranking was last updated ${updated} and is older than 7 days, so the wallet list is hidden. No newer ranking was invented.`;
  let disclosure = s(base.disclosure);
  if (decision.withhold) disclosure = hiddenNote;
  else if (!decision.fresh && disclosure && !disclosure.includes('may be out of date')) disclosure = `${disclosure} ${staleNote}`;
  else if (!decision.fresh && !disclosure) disclosure = staleNote;
  const coverage = decision.withhold || (!decision.fresh && stored.length) ? 'stale' : (base.coverage || (items.length ? 'partial' : 'empty'));
  return {
    ...base,
    ok: base.ok !== false,
    items,
    generatedAt: Math.trunc(n(generatedAt)) || null,
    coverage,
    withheld: decision.withhold,
    cache: decision.fresh ? 'fresh' : 'stale',
    disclosure,
  };
}

/** FIFO matching inside the seven-day sample. Unknown basis and unmatched quantity never become performance. */
export function rankWeeklyTraders(rows = [], { limit = 50, windowStartMs = 0, windowEndMs = Number.MAX_SAFE_INTEGER, inputTruncated = false, feesOnRows = false } = {}) {
  const trades = (Array.isArray(rows) ? rows : []).map(normalizeTrade).filter(Boolean).filter(row => row.observedAt >= windowStartMs && row.observedAt <= windowEndMs).sort((a, b) => a.observedAt - b.observedAt || String(a.signature).localeCompare(String(b.signature)));
  const positions = new Map(), stats = new Map();
  const statFor = wallet => {
    if (!stats.has(wallet)) stats.set(wallet, { wallet, realizedSol: 0, matchedSellCount: 0, winningMatchedSells: 0, tradeCount: 0, buySolObserved: 0, sellSolObserved: 0, pricedBuyCount: 0, pricedSellCount: 0, unknownBasisSellCount: 0, matchedTokens: new Set(), lastObservedAt: 0, matchedPnls: [], matchedFees: [] });
    return stats.get(wallet);
  };
  for (const trade of trades) {
    const stat = statFor(trade.wallet);
    stat.tradeCount += 1;
    stat.lastObservedAt = Math.max(stat.lastObservedAt, trade.observedAt);
    if (trade.side === 'buy' && trade.solAmount != null) { stat.buySolObserved += trade.solAmount; stat.pricedBuyCount += 1; }
    if (trade.side === 'sell' && trade.solAmount != null) { stat.sellSolObserved += trade.solAmount; stat.pricedSellCount += 1; }
    const key = `${trade.wallet}|${trade.mint}`, pos = positions.get(key) || { lots: [] };
    if (trade.side === 'buy') {
      pos.lots.push({ qty: trade.tokenAmount, unitCostSol: trade.solAmount == null ? null : trade.solAmount / trade.tokenAmount });
      positions.set(key, pos);
      continue;
    }
    let remaining = trade.tokenAmount, pricedQty = 0, pnl = 0;
    const unitProceeds = trade.solAmount == null ? null : trade.solAmount / trade.tokenAmount;
    while (remaining > 1e-12 && pos.lots.length) {
      const lot = pos.lots[0], matched = Math.min(remaining, lot.qty);
      if (unitProceeds != null && lot.unitCostSol != null) { pnl += (unitProceeds - lot.unitCostSol) * matched; pricedQty += matched; }
      lot.qty -= matched;
      remaining -= matched;
      if (lot.qty <= 1e-12) pos.lots.shift();
    }
    positions.set(key, pos);
    if (pricedQty > 1e-12) {
      stat.realizedSol += pnl;
      stat.matchedSellCount += 1;
      if (pnl > 0) stat.winningMatchedSells += 1;
      stat.matchedPnls.push(pnl);
      stat.matchedFees.push(feesOnRows && trade.feeSol != null ? trade.feeSol : null);
      stat.matchedTokens.add(trade.mint);
    }
    if (trade.tokenAmount - pricedQty > 1e-9) stat.unknownBasisSellCount += 1;
  }
  const withMatches = [...stats.values()].filter(row => row.matchedSellCount > 0);
  const eligible = withMatches.filter(row => row.matchedSellCount >= MIN_MATCHED_SELLS && row.matchedTokens.size >= MIN_DISTINCT_TOKENS);
  const excludedBelowSample = withMatches.length - eligible.length;
  const items = eligible.sort((a, b) => b.realizedSol - a.realizedSol || b.matchedSellCount - a.matchedSellCount || b.tradeCount - a.tradeCount || a.wallet.localeCompare(b.wallet)).slice(0, Math.max(1, Math.min(50, Math.trunc(n(limit) || 50)))).map((row, index) => {
    const summary = summarizeTradePnls(row.matchedPnls, feesOnRows ? row.matchedFees : null);
    const feesComplete = summary.netOfFeesPnl != null;
    const rowFeeTreatment = feesComplete ? 'net-of-observed-sell-network-fees' : (feesOnRows ? 'gross-network-fees-incomplete' : 'gross-swap-leg-network-fees-unobserved');
    return Object.freeze({
      rank: index + 1,
      wallet: row.wallet,
      realizedSol: row.realizedSol,
      netOfFeesSol: feesComplete ? summary.netOfFeesPnl : null,
      observedFeesSol: feesComplete ? summary.observedFees : null,
      feeTreatment: rowFeeTreatment,
      matchedSellCount: row.matchedSellCount,
      sampleSize: row.matchedSellCount,
      medianTradePnlSol: summary.medianTradePnl,
      profitConcentrationTop1: summary.profitConcentrationTop1,
      profitConcentrationTop3: summary.profitConcentrationTop3,
      winRate: row.matchedSellCount ? row.winningMatchedSells / row.matchedSellCount : null,
      tradeCount: row.tradeCount,
      tokenCount: row.matchedTokens.size,
      buySolObserved: row.pricedBuyCount ? row.buySolObserved : null,
      sellSolObserved: row.pricedSellCount ? row.sellSolObserved : null,
      pricedBuyCount: row.pricedBuyCount,
      pricedSellCount: row.pricedSellCount,
      unknownBasisSellCount: row.unknownBasisSellCount,
      lastObservedAt: row.lastObservedAt,
      completeness: dataCompleteness({
        sampleSize: row.matchedSellCount,
        tokenCount: row.matchedTokens.size,
        unknownBasisCount: row.unknownBasisSellCount,
        fresh: true,
        inputTruncated,
      }),
    });
  });
  return Object.freeze({ items: Object.freeze(items), excludedBelowSample, considered: withMatches.length });
}

async function loadTrades(db, cutoffSec) {
  let rows = await all(db.prepare(`SELECT wallet,mint,side,token_amount,sol_amount,block_time,signature,source FROM pump_trades WHERE block_time>=? AND wallet IS NOT NULL AND mint IS NOT NULL AND side IN ('buy','sell') ORDER BY block_time DESC,event_id DESC LIMIT ?`).bind(cutoffSec, INPUT_ROW_LIMIT));
  if (rows.length) return { rows, inputSource: 'pump_trades', feesOnRows: false };
  rows = await all(db.prepare(`SELECT wallet,mint,token_delta,sol_delta,fee_lamports,block_time,signature,source FROM bull_wallet_events WHERE block_time>=? AND wallet IS NOT NULL AND mint<>'' AND token_delta<>0 AND sol_delta<>0 ORDER BY block_time DESC,id DESC LIMIT ?`).bind(cutoffSec, INPUT_ROW_LIMIT));
  return {
    rows: rows.map(row => ({ ...row, side: n(row.token_delta) > 0 ? 'buy' : 'sell', token_amount: Math.abs(n(row.token_delta)), sol_amount: Math.abs(n(row.sol_delta)) })),
    inputSource: 'bull_wallet_events',
    feesOnRows: true,
  };
}

export async function refreshTraderObservatory(env = {}, nowMs = Date.now()) {
  const db = intelligenceDb(env);
  if (!db) return Object.freeze({ ok: false, error: 'database_unavailable' });
  const windowEndMs = Math.trunc(nowMs), windowStartMs = windowEndMs - WINDOW_SECONDS * 1000;
  const loaded = await loadTrades(db, Math.floor(windowStartMs / 1000)), rows = loaded.rows;
  const ranked = rankWeeklyTraders(rows, { limit: 50, windowStartMs, windowEndMs, inputTruncated: rows.length >= INPUT_ROW_LIMIT, feesOnRows: loaded.feesOnRows });
  const items = ranked.items;
  const generatedAt = Math.floor(nowMs / 1000), mayBeTruncated = rows.length >= INPUT_ROW_LIMIT;
  const sample = { inputSource: loaded.inputSource, rowsRead: rows.length, rowLimit: INPUT_ROW_LIMIT, mayBeTruncated, excludedBelowSample: ranked.excludedBelowSample, considered: ranked.considered };
  const sampleDisclosure = mayBeTruncated
    ? `The ${INPUT_ROW_LIMIT}-row input cap was reached, so older trades inside the seven-day window may be omitted. Ranked wallets are marked partial.`
    : `The bounded input read ${rows.length} retained trades, below the ${INPUT_ROW_LIMIT}-row cap.`;
  const ranking = {
    key: 'matched-realized-sol',
    winRateUsedForRank: false,
    minimumMatchedSells: MIN_MATCHED_SELLS,
    minimumDistinctTokens: MIN_DISTINCT_TOKENS,
    excludedBelowSample: ranked.excludedBelowSample,
  };
  const feeLine = loaded.feesOnRows
    ? 'Net of fees subtracts an observed sell-signature network fee only when every matched sell has fee_lamports above zero. A stored zero is treated as unobserved, not as a free transaction. Pool fees inside the swap leg are not subtracted again.'
    : 'Input is pump_trades, which has no fee column. realizedSol is the gross swap leg. netOfFeesSol stays null rather than treating a missing fee as zero.';
  const payload = {
    ok: true,
    coverage: items.length ? 'partial' : 'empty',
    window: { from: windowStartMs, to: windowEndMs, label: '7D' },
    method: 'matched-in-window-fifo-realized-sol-v2',
    generatedAt,
    ranking,
    items,
    source: 'a-bulls-indexed-solana',
    sample,
    fomoReference: { provider: 'fomo.family', timeframe: '7D', status: 'reference-only', ingested: false },
    disclosure: items.length
      ? `Weekly trader stars rank realized SOL from priced FIFO slices matched to known-cost buys inside the same retained seven-day indexed window. A wallet needs at least ${MIN_MATCHED_SELLS} priced matched sells across at least ${MIN_DISTINCT_TOKENS} tokens. ${ranked.excludedBelowSample} wallets with a smaller sample were left off the list. Win rate is reported and is not the sort key. Unknown basis and unmatched quantity are excluded. ${feeLine} ${sampleDisclosure} Input source: ${loaded.inputSource}. This is an observed research ranking, not a skill score, identity claim, recommendation, or copy-trading instruction.`
      : `No wallets have at least ${MIN_MATCHED_SELLS} priced matched sells across ${MIN_DISTINCT_TOKENS} tokens in the retained seven-day window. ${ranked.excludedBelowSample} wallets had a smaller matched sample and were not ranked. ${sampleDisclosure} Input source: ${loaded.inputSource}. No trader ranking was invented.`,
  };
  await db.prepare(`INSERT INTO bull_intelligence_cache(cache_key,payload_json,source,coverage,generated_at,expires_at) VALUES(?,?,?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,source=excluded.source,coverage=excluded.coverage,generated_at=excluded.generated_at,expires_at=excluded.expires_at`).bind(OBSERVATORY_CACHE_KEY, JSON.stringify(payload), 'a-bulls-indexed-solana', payload.coverage, generatedAt, generatedAt + CACHE_SECONDS).run();
  return payload;
}

/** Refresh only when the v2 cache is missing or past its 30-minute write window. */
export async function refreshTraderObservatoryIfDue(env = {}, nowMs = Date.now()) {
  const db = intelligenceDb(env);
  if (!db) return Object.freeze({ ok: false, error: 'database_unavailable' });
  const now = Math.floor(nowMs / 1000);
  let row = null;
  try { row = await db.prepare('SELECT expires_at, generated_at FROM bull_intelligence_cache WHERE cache_key=? LIMIT 1').bind(OBSERVATORY_CACHE_KEY).first(); } catch { row = null; }
  if (row && n(row.expires_at) > now) return Object.freeze({ ok: true, skipped: 'fresh-cache', generatedAt: n(row.generated_at) || null });
  return refreshTraderObservatory(env, nowMs);
}

export async function handleTraderObservatoryRequest(request, env = {}) {
  const url = new URL(request.url);
  if (url.pathname !== PATH || request.method !== 'GET') return null;
  const db = intelligenceDb(env);
  if (!db) return json({ ok: false, error: 'database_unavailable', coverage: 'degraded', items: [], disclosure: 'The Intelligence D1 binding is unavailable. No public leaderboard fallback was scraped.' }, 503);
  let row = null;
  try { row = await db.prepare('SELECT payload_json,generated_at,expires_at FROM bull_intelligence_cache WHERE cache_key=? LIMIT 1').bind(OBSERVATORY_CACHE_KEY).first(); } catch { row = null; }
  const ranking = { key: 'matched-realized-sol', winRateUsedForRank: false, minimumMatchedSells: MIN_MATCHED_SELLS, minimumDistinctTokens: MIN_DISTINCT_TOKENS, excludedBelowSample: 0 };
  if (!row) return json({ ok: true, coverage: 'empty', items: [], method: 'matched-in-window-fifo-realized-sol-v2', ranking, source: 'a-bulls-indexed-solana', sample: null, fomoReference: { provider: 'fomo.family', timeframe: '7D', status: 'reference-only', ingested: false }, disclosure: 'The weekly trader cache has not been produced yet. No Fomo data was scraped and no ranking was invented.' }, 200, 'public, max-age=15, stale-while-revalidate=30');
  let payload;
  try { payload = JSON.parse(s(row.payload_json) || '{}'); } catch { payload = { ok: false, coverage: 'degraded', items: [], disclosure: 'Cached trader observatory payload could not be decoded.' }; }
  const presented = presentObservatoryPayload(payload, { generatedAt: n(payload.generatedAt) || n(row.generated_at), nowSec: Math.floor(Date.now() / 1000) });
  return json(presented, 200, 'public, max-age=15, stale-while-revalidate=30');
}
