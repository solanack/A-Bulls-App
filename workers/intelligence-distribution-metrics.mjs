/* Shared sample, median, profit-concentration, and fee treatment for ranked lists.
 * Ranking callers must not sort on win rate. A wallet with one priced sell is not a rank.
 *
 * Minimum sample: 5 priced trades and 2 distinct tokens.
 * The previous weekly board was 50 wallets at 100% win rate, 37 of them on a single
 * matched sell and 45 on one token. Five priced trades is the smallest sample where
 * a median and a top-3 profit share can both move. Two tokens keeps a single mint
 * from looking like a diversified record.
 *
 * Profit concentration is the share of strictly positive trade PnL that comes from
 * the largest 1 and largest 3 winning trades. Losses stay out of that denominator.
 * When fewer than 3 trades are profitable, the top-3 share covers every winning trade.
 *
 * Net of fees is null unless every trade in the sample has an observed fee >= 0.
 * A missing fee is not zero. Provider feeds that omit fees stay gross.
 */

export const MIN_MATCHED_SELLS = 5;
export const MIN_DISTINCT_TOKENS = 2;
export const DISTRIBUTION_TRADE_CAP = 200;

const s = value => String(value ?? '').trim();
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const finite = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;

export function median(values) {
  const sorted = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Share of positive PnL from the largest winning trades. Null when nothing was profitable. */
export function profitConcentration(pnls) {
  const wins = (Array.isArray(pnls) ? pnls : []).map(Number).filter(value => Number.isFinite(value) && value > 0).sort((a, b) => b - a);
  const profit = wins.reduce((sum, value) => sum + value, 0);
  if (!(profit > 0)) return Object.freeze({ top1: null, top3: null, winningTradeCount: wins.length });
  const share = count => wins.slice(0, count).reduce((sum, value) => sum + value, 0) / profit;
  return Object.freeze({ top1: share(1), top3: share(3), winningTradeCount: wins.length });
}

/**
 * fees aligns with pnls. Pass null when the source has no fee column.
 * A fee is observed only when it is a finite number >= 0 on every row.
 */
export function summarizeTradePnls(pnls, fees = null) {
  const values = (Array.isArray(pnls) ? pnls : []).map(Number).filter(Number.isFinite);
  const gross = values.reduce((sum, value) => sum + value, 0);
  const concentration = profitConcentration(values);
  const feeValues = Array.isArray(fees) ? fees : null;
  const feesKnown = Boolean(feeValues && feeValues.length === values.length && values.length > 0 && feeValues.every(value => value != null && Number.isFinite(Number(value)) && Number(value) >= 0));
  const observedFees = feesKnown ? feeValues.reduce((sum, value) => sum + Number(value), 0) : null;
  return Object.freeze({
    sampleSize: values.length,
    medianTradePnl: median(values),
    grossPnl: values.length ? gross : null,
    netOfFeesPnl: feesKnown ? gross - observedFees : null,
    observedFees,
    profitConcentrationTop1: concentration.top1,
    profitConcentrationTop3: concentration.top3,
  });
}

export function dataCompleteness({
  sampleSize = 0,
  tokenCount = 0,
  unknownBasisCount = 0,
  fresh = true,
  truncated = false,
  providerBasisUnverified = false,
  inputTruncated = false,
  minSample = MIN_MATCHED_SELLS,
  minTokens = MIN_DISTINCT_TOKENS,
} = {}) {
  const sample = Math.max(0, Math.trunc(n(sampleSize)));
  const tokens = Math.max(0, Math.trunc(n(tokenCount)));
  const unknown = Math.max(0, Math.trunc(n(unknownBasisCount)));
  const sampleSufficient = sample >= minSample && tokens >= minTokens;
  const costBasisMatched = !providerBasisUnverified && unknown === 0 && !inputTruncated;
  const reasons = [];
  if (sample < minSample) reasons.push('below-sample-minimum');
  else if (tokens < minTokens) reasons.push('below-token-minimum');
  if (unknown > 0) reasons.push('unknown-or-unmatched-basis');
  if (providerBasisUnverified) reasons.push('provider-reported-basis-not-verified');
  if (inputTruncated) reasons.push('input-capped');
  if (truncated) reasons.push('closed-trade-read-capped');
  if (!fresh) reasons.push('stale');
  let state = 'complete';
  if (!sampleSufficient) state = 'insufficient';
  else if (!costBasisMatched || !fresh || truncated) state = 'partial';
  return Object.freeze({
    state,
    costBasisMatched,
    sampleSufficient,
    fresh: Boolean(fresh),
    reasons: Object.freeze(reasons),
  });
}

export function emptyProviderDistribution() {
  return Object.freeze({
    sampleSize: 0,
    tokenCount: 0,
    medianTradePnl: null,
    grossPnl: null,
    netOfFeesPnl: null,
    observedFees: null,
    feeTreatment: 'provider-reported-fees-not-in-feed',
    profitConcentrationTop1: null,
    profitConcentrationTop3: null,
    truncated: false,
    unit: 'usd',
  });
}

export function providerCompleteness(fresh = false) {
  return dataCompleteness({ sampleSize: 0, tokenCount: 0, fresh, providerBasisUnverified: true });
}

/** Group retained closed provider trades. The feed has no fee column, so net of fees stays null. */
export function distributionsFromClosedRows(rows = [], { capturedAtMs = 0, nowMs = Date.now(), freshSeconds = 24 * 3600 } = {}) {
  const by = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const handle = s(row.handle).toLowerCase();
    const pnl = finite(row.realized_pnl_usd ?? row.realizedPnlUsd);
    if (!handle || pnl == null) continue;
    if (!by.has(handle)) by.set(handle, { pnls: [], tokens: new Set(), tradeCount: 0 });
    const bucket = by.get(handle);
    bucket.pnls.push(pnl);
    const token = s(row.token_address ?? row.tokenAddress);
    if (token) bucket.tokens.add(token);
    bucket.tradeCount = Math.max(bucket.tradeCount, Math.trunc(n(row.trade_count ?? row.tradeCount)));
  }
  const fresh = capturedAtMs > 0 && nowMs - capturedAtMs <= freshSeconds;
  const out = new Map();
  for (const [handle, bucket] of by) {
    const summary = summarizeTradePnls(bucket.pnls);
    const truncated = bucket.tradeCount > bucket.pnls.length;
    out.set(handle, Object.freeze({
      distribution: Object.freeze({
        ...summary,
        tokenCount: bucket.tokens.size,
        truncated,
        unit: 'usd',
        feeTreatment: 'provider-reported-fees-not-in-feed',
        netOfFeesPnl: null,
        observedFees: null,
      }),
      completeness: dataCompleteness({
        sampleSize: summary.sampleSize,
        tokenCount: bucket.tokens.size,
        fresh,
        truncated,
        providerBasisUnverified: true,
      }),
    }));
  }
  return out;
}

const COHORT_SQL = `
SELECT lowered AS handle, token_address, realized_pnl_usd, trade_count, cohort_captured_at
FROM (
  SELECT lower(handle) AS lowered, token_address, realized_pnl_usd,
    ROW_NUMBER() OVER (PARTITION BY lower(handle) ORDER BY closed_at DESC, trade_id ASC) AS rn,
    COUNT(*) OVER (PARTITION BY lower(handle)) AS trade_count,
    (SELECT MAX(captured_at) FROM fomo_traders) AS cohort_captured_at
  FROM fomo_trader_trades
  WHERE status='closed' AND realized_pnl_usd IS NOT NULL AND ifnull(closed_at,0)>0
)
WHERE rn <= ?
  AND lowered IN (
    SELECT lower(handle) FROM fomo_traders
    WHERE current_rank BETWEEN 1 AND 50
      AND captured_at=(SELECT MAX(captured_at) FROM fomo_traders)
  )`;

/** D1-only. A failed read returns an empty map so the galaxy still renders. */
export async function loadFomoCohortDistributions(db, nowMs = Date.now()) {
  if (!db) return { byHandle: new Map(), capturedAtMs: 0 };
  try {
    const result = await db.prepare(COHORT_SQL).bind(DISTRIBUTION_TRADE_CAP).all();
    const rows = result?.results || [];
    const capturedSec = rows.reduce((max, row) => Math.max(max, n(row.cohort_captured_at)), 0);
    return { byHandle: distributionsFromClosedRows(rows, { capturedAtMs: capturedSec * 1000, nowMs }), capturedAtMs: capturedSec * 1000 };
  } catch {
    return { byHandle: new Map(), capturedAtMs: 0 };
  }
}

export function distributionForHandle(loaded, handle) {
  const found = loaded?.byHandle?.get(s(handle).toLowerCase());
  if (found) return found;
  return Object.freeze({ distribution: emptyProviderDistribution(), completeness: providerCompleteness(false) });
}
