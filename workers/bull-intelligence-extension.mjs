/* A Bulls App — Bull Intelligence Worker extension
 * Staged, read-only API module. This file is NOT deployed by itself.
 */

import {
  backfillWalletPass,
  getMeshStatus,
  getWalletCoverage,
  meshEnabled,
  queueWalletBackfill
} from './bull-data-mesh.mjs';

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
});

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...JSON_HEADERS, ...extra }
});

const validWallet = value => WALLET_RE.test(String(value || '').trim());
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const now = () => Math.floor(Date.now() / 1000);

function dbOf(env = {}) {
  const db = env.BULL_INTELLIGENCE_DB || env.LEADERBOARD_DB || env.DB;
  return db && typeof db.prepare === 'function' ? db : null;
}

function d1Available(env) {
  return Boolean(dbOf(env));
}

export function intelligenceCapabilities(env = {}) {
  const d1 = d1Available(env);
  const archival = String(env.BULL_ARCHIVAL_ENABLED || '').toLowerCase() === 'true';
  const indexer = String(env.BULL_INDEXER_ENABLED || '').toLowerCase() === 'true';
  const nftIndexer = String(env.BULL_NFT_INDEXER_ENABLED || '').toLowerCase() === 'true';
  const mesh = meshEnabled(env);
  const aggregate = d1 && indexer;
  const progressive = d1 && indexer && mesh;
  return {
    version: 3,
    readOnly: true,
    publicAddressOnly: true,
    d1,
    indexer,
    nftIndexer,
    archival,
    mesh,
    features: {
      bullDna: { state: 'ready', source: 'wallet-analytics' },
      walletMuseum: { state: 'ready', source: 'wallet-analytics' },
      walletRivalries: { state: 'ready', source: 'wallet-analytics' },
      ghostLedger: { state: 'ready', source: 'decoded-flow' },
      activityConstellation: { state: progressive ? 'indexing' : 'limited', source: 'decoded-flow+mesh' },
      timeMachine: { state: archival && d1 ? 'ready' : progressive ? 'indexing' : 'index-required', source: 'normalized-events' },
      ghostPortfolio: { state: archival && d1 ? 'ready' : progressive ? 'indexing' : 'index-required', source: 'normalized-events+historical-prices' },
      parallelUniverse: { state: archival && d1 ? 'ready' : progressive ? 'indexing' : 'index-required', source: 'normalized-events+historical-prices' },
      radar: { state: aggregate ? 'ready' : 'index-required', source: 'cohort-aggregates' },
      weather: { state: aggregate ? 'ready' : 'index-required', source: 'chain-aggregates' },
      deepConstellation: { state: progressive ? 'indexing' : aggregate ? 'ready' : 'index-required', source: 'relationship-edges' },
      nftMemory: { state: d1 && nftIndexer ? 'ready' : 'index-required', source: 'nft-observation-index' },
      progressiveHistory: { state: progressive ? 'ready' : 'disabled', source: 'standard-solana-rpc+mesh' },
      tradeRoutes: { state: 'adapter-ready', source: 'substreams-svm' },
      onchainCandles: { state: 'adapter-ready', source: 'substreams-svm' }
    }
  };
}

async function parseJson(request) {
  try { return await request.json(); } catch (_) { return {}; }
}

async function safeFirst(stmt) {
  try { return await stmt.first(); } catch (_) { return null; }
}

async function safeAll(stmt) {
  try {
    const result = await stmt.all();
    return Array.isArray(result?.results) ? result.results : [];
  } catch (_) { return []; }
}

async function walletIndexedSummary(env, wallet) {
  const db = dbOf(env);
  if (!db) return null;
  const latestWindow = await safeFirst(db.prepare(`
    SELECT window_key, window_start, window_end, tx_count, active_days, swaps,
           unique_mints, failures, sol_in, sol_out, fees_sol, top_holding_percent, updated_at
    FROM bull_wallet_windows
    WHERE wallet = ?
    ORDER BY window_end DESC
    LIMIT 1
  `).bind(wallet));
  const eventBounds = await safeFirst(db.prepare(`
    SELECT COUNT(*) AS event_count, MIN(block_time) AS first_seen, MAX(block_time) AS last_seen
    FROM bull_wallet_events
    WHERE wallet = ?
  `).bind(wallet));
  if (!latestWindow && !num(eventBounds?.event_count)) return null;
  return {
    wallet,
    window: latestWindow || null,
    indexedEvents: num(eventBounds?.event_count),
    firstSeen: num(eventBounds?.first_seen) || null,
    lastSeen: num(eventBounds?.last_seen) || null,
    coverage: latestWindow ? 'indexed-partial' : 'events-only',
    source: 'bull-index'
  };
}

async function recentRelationships(env, wallet) {
  const db = dbOf(env);
  if (!db) return [];
  return safeAll(db.prepare(`
    SELECT wallet_a, wallet_b, first_seen, last_seen, interaction_count,
           sol_volume, token_event_count, relationship_types
    FROM bull_wallet_relationships
    WHERE wallet_a = ? OR wallet_b = ?
    ORDER BY last_seen DESC
    LIMIT 40
  `).bind(wallet, wallet));
}

async function nftMemory(env, wallet) {
  const db = dbOf(env);
  if (!db) return { events: [], collections: [], bounds: null };
  const events = await safeAll(db.prepare(`
    SELECT signature, block_time, asset_id, collection, event_class, marketplace,
           counterparty, sol_value, usd_value, confidence
    FROM bull_nft_wallet_events
    WHERE wallet = ?
    ORDER BY block_time ASC
    LIMIT 250
  `).bind(wallet));
  const collections = await safeAll(db.prepare(`
    SELECT collection, window_start, window_end, acquired_count, disposed_count,
           transfer_in_count, transfer_out_count, unique_assets, first_seen, last_seen,
           observed_sol_in, observed_sol_out
    FROM bull_nft_wallet_collection_windows
    WHERE wallet = ?
    ORDER BY last_seen DESC
    LIMIT 50
  `).bind(wallet));
  const bounds = await safeFirst(db.prepare(`
    SELECT COUNT(*) AS event_count, MIN(block_time) AS first_seen, MAX(block_time) AS last_seen,
           COUNT(DISTINCT collection) AS collections
    FROM bull_nft_wallet_events
    WHERE wallet = ?
  `).bind(wallet));
  return { events, collections, bounds };
}

async function radarFeed(env) {
  const db = dbOf(env);
  if (!db) return [];
  return safeAll(db.prepare(`
    SELECT anomaly_key, scope_type, scope_value, observed_at, severity,
           baseline_value, observed_value, sample_size, evidence_json, expires_at
    FROM bull_radar_anomalies
    WHERE expires_at IS NULL OR expires_at > ?
    ORDER BY observed_at DESC, severity DESC
    LIMIT 50
  `).bind(now()));
}

async function latestWeather(env) {
  const db = dbOf(env);
  if (!db) return null;
  return safeFirst(db.prepare(`
    SELECT bucket_start, bucket_seconds, regime, activity_score, volatility_score,
           concentration_score, rotation_score, convergence_score, nft_activity_score,
           evidence_json
    FROM bull_chain_weather
    ORDER BY bucket_start DESC
    LIMIT 1
  `));
}

export async function handleBullIntelligenceRequest(request, env = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/intelligence/')) return null;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (url.pathname === '/api/intelligence/capabilities' && request.method === 'GET') {
    return json({ ok: true, capabilities: intelligenceCapabilities(env), generatedAt: Date.now() });
  }

  if (url.pathname === '/api/intelligence/mesh-status' && request.method === 'GET') {
    return json({ ok: true, mesh: await getMeshStatus(env), capabilities: intelligenceCapabilities(env), generatedAt: Date.now() });
  }

  if (url.pathname === '/api/intelligence/wallet-summary' && request.method === 'POST') {
    const body = await parseJson(request);
    const wallet = String(body.wallet || body.address || '').trim();
    if (!validWallet(wallet)) return json({ ok: false, error: 'invalid_public_wallet' }, 400);
    const indexed = await walletIndexedSummary(env, wallet);
    const coverage = await getWalletCoverage(env, wallet).catch(() => null);
    const relationships = indexed ? await recentRelationships(env, wallet) : [];
    return json({
      ok: true,
      wallet,
      indexed,
      coverage,
      relationships,
      capabilities: intelligenceCapabilities(env),
      limitations: indexed ? [] : ['No normalized history is available for this wallet yet.'],
      generatedAt: Date.now()
    });
  }

  if (url.pathname === '/api/intelligence/index-coverage' && request.method === 'POST') {
    const body = await parseJson(request);
    const wallet = String(body.wallet || body.address || '').trim();
    if (!validWallet(wallet)) return json({ ok: false, error: 'invalid_public_wallet' }, 400);
    const coverage = await getWalletCoverage(env, wallet);
    return json({ ok: true, wallet, coverage, generatedAt: Date.now() });
  }

  if (url.pathname === '/api/intelligence/backfill/queue' && request.method === 'POST') {
    if (!meshEnabled(env)) return json({ ok: false, error: 'bull_mesh_disabled' }, 503);
    const body = await parseJson(request);
    const wallet = String(body.wallet || body.address || '').trim();
    if (!validWallet(wallet)) return json({ ok: false, error: 'invalid_public_wallet' }, 400);
    const queued = await queueWalletBackfill(env, wallet, { before: body.before, pageSize: body.pageSize });
    return json({ ok: true, ...queued, generatedAt: Date.now() }, 202);
  }

  if (url.pathname === '/api/intelligence/backfill/pass' && request.method === 'POST') {
    if (!meshEnabled(env)) return json({ ok: false, error: 'bull_mesh_disabled' }, 503);
    const body = await parseJson(request);
    const wallet = String(body.wallet || body.address || '').trim();
    if (!validWallet(wallet)) return json({ ok: false, error: 'invalid_public_wallet' }, 400);
    try {
      const result = await backfillWalletPass(env, wallet, {
        before: body.before,
        pageSize: body.pageSize,
        jobId: body.jobId
      });
      return json({ ...result, generatedAt: Date.now() });
    } catch (error) {
      return json({ ok: false, error: 'backfill_failed', detail: String(error?.message || error), generatedAt: Date.now() }, 502);
    }
  }

  if (url.pathname === '/api/intelligence/nft-memory' && request.method === 'POST') {
    const body = await parseJson(request);
    const wallet = String(body.wallet || body.address || '').trim();
    if (!validWallet(wallet)) return json({ ok: false, error: 'invalid_public_wallet' }, 400);
    const capabilities = intelligenceCapabilities(env);
    if (capabilities.features.nftMemory.state !== 'ready') {
      return json({ ok: true, wallet, state: 'index-required', events: [], collections: [], bounds: null, capabilities, generatedAt: Date.now() });
    }
    const memory = await nftMemory(env, wallet);
    return json({ ok: true, wallet, state: 'ready', ...memory, capabilities, generatedAt: Date.now() });
  }

  if (url.pathname === '/api/intelligence/radar' && request.method === 'GET') {
    const capabilities = intelligenceCapabilities(env);
    if (capabilities.features.radar.state !== 'ready') {
      return json({ ok: true, state: 'index-required', anomalies: [], capabilities, generatedAt: Date.now() });
    }
    return json({ ok: true, state: 'ready', anomalies: await radarFeed(env), capabilities, generatedAt: Date.now() });
  }

  if (url.pathname === '/api/intelligence/weather' && request.method === 'GET') {
    const capabilities = intelligenceCapabilities(env);
    if (capabilities.features.weather.state !== 'ready') {
      return json({ ok: true, state: 'index-required', weather: null, capabilities, generatedAt: Date.now() });
    }
    return json({ ok: true, state: 'ready', weather: await latestWeather(env), capabilities, generatedAt: Date.now() });
  }

  return json({ ok: false, error: 'not_found' }, 404);
}
