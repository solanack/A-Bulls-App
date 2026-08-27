/* A Bulls App — Bull Intelligence aggregate engine
 * Pure aggregate scoring for public indexed data. Outputs descriptive anomalies and
 * weather metaphors only; never predictions, recommendations, identity claims or execution.
 */

const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const clamp100 = value => Math.max(0, Math.min(100, n(value)));
const clamp01 = value => Math.max(0, Math.min(1, n(value)));

function ratioScore(current, baseline, neutral = 35, scale = 45) {
  const c = n(current), b = n(baseline);
  if (b <= 0) return c > 0 ? Math.min(100, neutral + scale) : neutral;
  return clamp100(neutral + (c / b - 1) * scale);
}

export function scoreRadarAggregate(current = {}, baseline = {}) {
  const convergence = ratioScore(current.uniqueWallets, baseline.uniqueWallets);
  const inbound = ratioScore(current.inboundWallets, baseline.inboundWallets, 35, 42);
  const outbound = ratioScore(current.outboundWallets, baseline.outboundWallets, 35, 42);
  const longDuration = ratioScore(current.longDurationWallets, baseline.longDurationWallets, 35, 38);
  const freshWallet = ratioScore(current.newWallets, baseline.newWallets, 35, 38);
  const sample = Math.max(0, n(current.uniqueWallets));
  const sampleFactor = clamp01(sample / 25);
  const ranked = [
    ['wallet-convergence', convergence],
    ['inbound-convergence', inbound],
    ['outbound-distribution', outbound],
    ['long-duration-shift', longDuration],
    ['fresh-wallet-shift', freshWallet]
  ].sort((a, b) => b[1] - a[1]);
  const strongest = ranked[0]?.[1] || 0;
  return {
    anomalyKey: ranked[0]?.[0] || 'activity-shift',
    severity: clamp100(strongest * (.55 + sampleFactor * .45)),
    sampleSize: sample,
    scores: { convergence, inbound, outbound, longDuration, freshWallet },
    observedValue: strongest,
    baselineValue: 35,
    evidence: { current, baseline },
    interpretation: 'Observed public-chain activity differs from the supplied historical baseline. This is not a price prediction or trading recommendation.'
  };
}

export function deriveWeatherAggregate(input = {}) {
  const scores = {
    activity: clamp100(input.activityScore ?? input.activity),
    volatility: clamp100(input.volatilityScore ?? input.volatility),
    concentration: clamp100(input.concentrationScore ?? input.concentration),
    rotation: clamp100(input.rotationScore ?? input.rotation),
    convergence: clamp100(input.convergenceScore ?? input.convergence),
    nftActivity: clamp100(input.nftActivityScore ?? input.nftActivity)
  };
  const values = Object.values(scores);
  const composite = values.reduce((sum, value) => sum + value, 0) / values.length;
  let regime = 'clear';
  if (scores.volatility >= 72 && scores.activity >= 65) regime = 'storm';
  else if (scores.rotation >= 72 && scores.activity >= 60) regime = 'migration';
  else if (scores.activity >= 78 && scores.volatility < 72) regime = 'heat-wave';
  else if (scores.convergence >= 72 && scores.concentration >= 62) regime = 'whale-migration';
  else if (scores.activity <= 35 && scores.volatility <= 40) regime = 'calm';
  else if (scores.concentration >= 70 && scores.activity <= 55) regime = 'fog';

  const descriptions = {
    clear: 'Activity is mixed without one supplied metric dominating the chain snapshot.',
    calm: 'Activity and volatility are both muted in the supplied aggregate window.',
    storm: 'Activity and volatility are simultaneously elevated in the supplied aggregate window.',
    migration: 'Rotation is elevated alongside chain activity, suggesting broad movement between observed assets.',
    'heat-wave': 'Activity is unusually elevated without the volatility threshold used for Storm conditions.',
    'whale-migration': 'Wallet convergence and concentration are simultaneously elevated in the supplied data.',
    fog: 'Concentration is elevated while overall activity remains comparatively subdued.'
  };

  return {
    regime,
    compositeScore: clamp100(composite),
    scores,
    description: descriptions[regime] || descriptions.clear,
    interpretation: 'Solana Weather is a visualization of supplied aggregate public-chain metrics, not a market forecast.'
  };
}

export function aggregateCohortBaseline(rows = []) {
  const clean = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!clean.length) return {
    uniqueWallets: 0,
    inboundWallets: 0,
    outboundWallets: 0,
    longDurationWallets: 0,
    newWallets: 0
  };
  const average = key => clean.reduce((sum, row) => sum + n(row[key]), 0) / clean.length;
  return {
    uniqueWallets: average('uniqueWallets'),
    inboundWallets: average('inboundWallets'),
    outboundWallets: average('outboundWallets'),
    longDurationWallets: average('longDurationWallets'),
    newWallets: average('newWallets')
  };
}

export function weatherInputsFromWindows(windows = [], cohorts = []) {
  const rows = Array.isArray(windows) ? windows.filter(Boolean) : [];
  const cohortRows = Array.isArray(cohorts) ? cohorts.filter(Boolean) : [];
  const tx = rows.reduce((sum, row) => sum + n(row.txCount), 0);
  const swaps = rows.reduce((sum, row) => sum + n(row.swaps), 0);
  const mints = rows.reduce((sum, row) => sum + n(row.uniqueMints), 0);
  const wallets = cohortRows.reduce((sum, row) => sum + n(row.uniqueWallets), 0);
  const inbound = cohortRows.reduce((sum, row) => sum + n(row.inboundWallets), 0);
  const outbound = cohortRows.reduce((sum, row) => sum + n(row.outboundWallets), 0);

  // These are normalized descriptive inputs, deliberately capped to avoid one noisy
  // wallet/window dominating the visual regime.
  const activity = clamp100(Math.log10(Math.max(1, tx)) * 28);
  const rotation = tx ? clamp100(swaps / tx * 140) : 0;
  const convergence = cohortRows.length ? clamp100(wallets / cohortRows.length * 8) : 0;
  const concentration = wallets ? clamp100(Math.abs(inbound - outbound) / wallets * 100) : 0;
  const nftActivity = clamp100(n(inputOrZero(rows, 'nftEvents')) / Math.max(1, tx) * 130);

  return { activity, rotation, convergence, concentration, nftActivity, volatility: 0, uniqueMintsObserved: mints };
}

function inputOrZero(rows, key) {
  return rows.reduce((sum, row) => sum + n(row?.[key]), 0);
}
