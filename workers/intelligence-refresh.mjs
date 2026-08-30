/* A Bulls App — staged Bull Intelligence aggregate refresh
 * Reads only A Bulls App-owned normalized public-chain aggregates and writes descriptive
 * Radar/Weather materializations. No prediction, recommendation, identity inference or execution.
 */
import {
  aggregateCohortBaseline,
  scoreRadarAggregate,
  weatherInputsFromWindows,
  deriveWeatherAggregate
} from './intelligence-aggregates.mjs';

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const normalizeCohort = row => ({
  mint: String(row.mint || ''),
  bucketStart: num(row.bucket_start ?? row.bucketStart),
  bucketSeconds: num(row.bucket_seconds ?? row.bucketSeconds),
  uniqueWallets: num(row.unique_wallets ?? row.uniqueWallets),
  inboundWallets: num(row.inbound_wallets ?? row.inboundWallets),
  outboundWallets: num(row.outbound_wallets ?? row.outboundWallets),
  longDurationWallets: num(row.long_duration_wallets ?? row.longDurationWallets),
  newWallets: num(row.new_wallets ?? row.newWallets)
});
const normalizeWindow = row => ({
  txCount: num(row.tx_count ?? row.txCount),
  swaps: num(row.swaps),
  uniqueMints: num(row.unique_mints ?? row.uniqueMints),
  nftEvents: num(row.nft_events ?? row.nftEvents)
});

export function planRadarRows(currentRows = [], baselineRows = [], observedAt = Math.floor(Date.now() / 1000)) {
  const current = currentRows.map(normalizeCohort);
  const baseline = baselineRows.map(normalizeCohort);
  const baselinesByMint = new Map();
  for (const row of baseline) {
    if (!baselinesByMint.has(row.mint)) baselinesByMint.set(row.mint, []);
    baselinesByMint.get(row.mint).push(row);
  }
  return current.map(row => {
    const baselineAggregate = aggregateCohortBaseline(baselinesByMint.get(row.mint) || []);
    const score = scoreRadarAggregate(row, baselineAggregate);
    return {
      anomalyKey: score.anomalyKey,
      scopeType: 'token',
      scopeValue: row.mint,
      observedAt,
      severity: score.severity,
      baselineValue: score.baselineValue,
      observedValue: score.observedValue,
      sampleSize: score.sampleSize,
      evidence: score.evidence,
      expiresAt: observedAt + Math.max(3600, row.bucketSeconds || 3600) * 2
    };
  }).filter(row => row.sampleSize >= 3 && row.severity >= 55)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 100);
}

export function planWeatherRow(windowRows = [], cohortRows = [], nftCohortRows = [], bucketStart = 0, bucketSeconds = 3600) {
  const windows = windowRows.map(normalizeWindow);
  const cohorts = cohortRows.map(normalizeCohort);
  const nftEvents = (Array.isArray(nftCohortRows) ? nftCohortRows : []).reduce((sum, row) => sum + num(row.event_count ?? row.eventCount), 0);
  const mergedWindows = windows.length ? windows.map((row, index) => index === 0 ? { ...row, nftEvents: row.nftEvents + nftEvents } : row) : [{ txCount: 0, swaps: 0, uniqueMints: 0, nftEvents }];
  const inputs = weatherInputsFromWindows(mergedWindows, cohorts);
  const weather = deriveWeatherAggregate(inputs);
  return {
    bucketStart,
    bucketSeconds,
    regime: weather.regime,
    activityScore: weather.scores.activity,
    volatilityScore: weather.scores.volatility,
    concentrationScore: weather.scores.concentration,
    rotationScore: weather.scores.rotation,
    convergenceScore: weather.scores.convergence,
    nftActivityScore: weather.scores.nftActivity,
    evidence: { inputs, description: weather.description, interpretation: weather.interpretation }
  };
}

async function all(stmt) {
  const result = await stmt.all();
  return Array.isArray(result?.results) ? result.results : [];
}

export async function refreshIntelligenceAggregates(env = {}, options = {}) {
  const db = env.BULL_INTELLIGENCE_DB || env.LEADERBOARD_DB || env.DB;
  if (!db || typeof db.prepare !== 'function') throw new Error('Bull Intelligence D1 binding is unavailable.');
  const now = Math.floor(num(options.now || Date.now() / 1000));
  const bucketSeconds = Math.max(3600, Math.floor(num(options.bucketSeconds || 3600)));
  const currentBucket = Math.floor(now / bucketSeconds) * bucketSeconds;
  const baselineStart = currentBucket - bucketSeconds * 24;

  const [currentCohorts, baselineCohorts, windows] = await Promise.all([
    all(db.prepare(`SELECT mint,bucket_start,bucket_seconds,unique_wallets,inbound_wallets,outbound_wallets,long_duration_wallets,new_wallets FROM bull_token_cohorts WHERE bucket_start = ?`).bind(currentBucket)),
    all(db.prepare(`SELECT mint,bucket_start,bucket_seconds,unique_wallets,inbound_wallets,outbound_wallets,long_duration_wallets,new_wallets FROM bull_token_cohorts WHERE bucket_start >= ? AND bucket_start < ?`).bind(baselineStart, currentBucket)),
    all(db.prepare(`SELECT tx_count,swaps,unique_mints,0 AS nft_events FROM bull_wallet_windows WHERE window_end >= ?`).bind(currentBucket))
  ]);

  let nftCohorts = [];
  try {
    nftCohorts = await all(db.prepare(`SELECT event_count FROM bull_nft_collection_cohorts WHERE bucket_start = ?`).bind(currentBucket));
  } catch (_) {
    // Migration 0008 is optional until NFT indexing is deliberately enabled.
    nftCohorts = [];
  }

  const radarRows = planRadarRows(currentCohorts, baselineCohorts, now);
  for (const row of radarRows) {
    await db.prepare(`INSERT INTO bull_radar_anomalies
      (anomaly_key,scope_type,scope_value,observed_at,severity,baseline_value,observed_value,sample_size,evidence_json,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
        row.anomalyKey, row.scopeType, row.scopeValue, row.observedAt, row.severity,
        row.baselineValue, row.observedValue, row.sampleSize, JSON.stringify(row.evidence), row.expiresAt
      ).run();
  }

  const weather = planWeatherRow(windows, currentCohorts, nftCohorts, currentBucket, bucketSeconds);
  await db.prepare(`INSERT INTO bull_chain_weather
    (bucket_start,bucket_seconds,regime,activity_score,volatility_score,concentration_score,rotation_score,convergence_score,nft_activity_score,evidence_json)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(bucket_start) DO UPDATE SET
      bucket_seconds=excluded.bucket_seconds,regime=excluded.regime,activity_score=excluded.activity_score,
      volatility_score=excluded.volatility_score,concentration_score=excluded.concentration_score,
      rotation_score=excluded.rotation_score,convergence_score=excluded.convergence_score,
      nft_activity_score=excluded.nft_activity_score,evidence_json=excluded.evidence_json`).bind(
        weather.bucketStart, weather.bucketSeconds, weather.regime, weather.activityScore,
        weather.volatilityScore, weather.concentrationScore, weather.rotationScore,
        weather.convergenceScore, weather.nftActivityScore, JSON.stringify(weather.evidence)
      ).run();

  // Keep short-lived anomaly materializations bounded.
  await db.prepare('DELETE FROM bull_radar_anomalies WHERE expires_at IS NOT NULL AND expires_at < ?').bind(now).run();

  return {
    currentBucket,
    bucketSeconds,
    currentCohorts: currentCohorts.length,
    baselineCohorts: baselineCohorts.length,
    radarRows: radarRows.length,
    weather: weather.regime,
    source: 'bull-intelligence-aggregate-refresh'
  };
}


