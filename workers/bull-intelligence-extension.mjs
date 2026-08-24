/* A Bulls App — Bull Intelligence Worker extension
 * Staged, read-only API module. This file is NOT deployed by itself.
 * Import handleBullIntelligenceRequest() from the production Worker when the
 * current Worker source is synchronized into this repository.
 */

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

function d1Available(env) {
  return Boolean(env?.DB && typeof env.DB.prepare === 'function');
}

export function intelligenceCapabilities(env = {}) {
  const d1 = d1Available(env);
  const archival = String(env.BULL_ARCHIVAL_ENABLED || '').toLowerCase() === 'true';
  const indexer = String(env.BULL_INDEXER_ENABLED || '').toLowerCase() === 'true';
  const aggregate = d1 && indexer;
  return {
    version: 1,
    readOnly: true,
    publicAddressOnly: true,
    d1,
    indexer,
    archival,
    features: {
      bullDna: { state: 'ready', source: 'wallet-analytics' },
      walletMuseum: { state: 'ready', source: 'wallet-analytics' },
      walletRivalries: { state: 'ready', source: 'wallet-analytics' },
      ghostLedger: { state: 'ready', source: 'decoded-flow' },
      activityConstellation: { state: 'limited', source: 'decoded-flow' },
      timeMachine: { state: archival && d1 ? 'ready' : 'index-required', source: 'normalized-events' },
      ghostPortfolio: { state: archival && d1 ? 'ready' : 'index-required', source: 'normalized-events+historical-prices' },
      parallelUniverse: { state: archival && d1 ? 'ready' : 'index-required', source: 'normalized-events+historical-prices' },
      radar: { state: aggregate ? 'ready' : 'index-required', source: 'cohort-aggregates' },
      weather: { state: aggregate ? 'ready' : 'index-required', source: 'chain-aggregates' },
      deepConstellation: { state: aggregate ? 'ready' : 'index-required', source: 'relationship-edges' }
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
  if (!d1Available(env)) return null;
  const latestWindow = await safeFirst(env.DB.prepare(`
    SELECT window_key, window_start, window_end, tx_count, active_days, swaps,
           unique_mints, failures, sol_in, sol_out, fees_sol, top_holding_percent, updated_at
    FROM bull_wallet_windows
    WHERE wallet = ?
    ORDER BY window_end DESC
    LIMIT 1
  `).bind(wallet));
  const eventBounds = await safeFirst(env.DB.prepare(`
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
  if (!d1Available(env)) return [];
  return safeAll(env.DB.prepare(`
    SELECT wallet_a, wallet_b, first_seen, last_seen, interaction_count,
           sol_volume, token_event_count, relationship_types
    FROM bull_wallet_relationships
    WHERE wallet_a = ? OR wallet_b = ?
    ORDER BY last_seen DESC
    LIMIT 40
  `).bind(wallet, wallet));
}

async function radarFeed(env) {
  if (!d1Available(env)) return [];
  return safeAll(env.DB.prepare(`
    SELECT anomaly_key, scope_type, scope_value, observed_at, severity,
           baseline_value, observed_value, sample_size, evidence_json, expires_at
    FROM bull_radar_anomalies
    WHERE expires_at IS NULL OR expires_at > ?
    ORDER BY observed_at DESC, severity DESC
    LIMIT 50
  `).bind(now()));
}

async function latestWeather(env) {
  if (!d1Available(env)) return null;
  return safeFirst(env.DB.prepare(`
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

  if (url.pathname === '/api/intelligence/wallet-summary' && request.method === 'POST') {
    const body = await parseJson(request);
    const wallet = String(body.wallet || body.address || '').trim();
    if (!validWallet(wallet)) return json({ ok: false, error: 'invalid_public_wallet' }, 400);
    const indexed = await walletIndexedSummary(env, wallet);
    const relationships = indexed ? await recentRelationships(env, wallet) : [];
    return json({
      ok: true,
      wallet,
      indexed,
      relationships,
      capabilities: intelligenceCapabilities(env),
      limitations: indexed ? [] : ['No normalized D1 history is available for this wallet yet.'],
      generatedAt: Date.now()
    });
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
