/* A Bulls App Worker — vNext compatibility entry.
 * Build-forward baseline: verified Worker 8.2.0 + additive vNext routes.
 * Retired Ansem/Bullpen/Bull Vision/LIFE/community endpoints never fall through.
 */

import baselineWorker from './worker-baseline-8.2.0.js';
import { handleIntelligenceFetch, handleIntelligenceScheduled } from './intelligence-worker-hooks.mjs';

const RETIRED_PATHS = new Set([
  '/api/ansem/analytics',
  '/api/ansemio/snapshot',
  '/api/nft/collection-stats',
  '/api/nft/ecosystem-stats',
  '/api/intelligence/community-integrations'
]);

const BASELINE_INTELLIGENCE_PATHS = new Set([
  '/api/intelligence/capabilities',
  '/api/intelligence/chain-radar',
  '/api/intelligence/chain-weather',
  '/api/intelligence/mesh-status',
  '/api/intelligence/radar',
  '/api/intelligence/source-health',
  '/api/intelligence/weather',
  '/api/intelligence/candles',
  '/api/intelligence/chain-lens',
  '/api/intelligence/constellation',
  '/api/intelligence/ghost-portfolio',
  '/api/intelligence/history/pass',
  '/api/intelligence/history/queue',
  '/api/intelligence/index-coverage',
  '/api/intelligence/museum',
  '/api/intelligence/nft-memory',
  '/api/intelligence/parallel-universe',
  '/api/intelligence/time-machine',
  '/api/intelligence/timeline',
  '/api/intelligence/wallet-dna',
  '/api/intelligence/wallet-rivalry',
  '/api/intelligence/wallet-summary'
]);

function retired(pathname) {
  return RETIRED_PATHS.has(pathname) || pathname === '/api/bull-vision' || pathname.startsWith('/api/bull-vision/');
}

function allowedOrigins(env = {}) {
  return String(env.ALLOWED_ORIGINS || 'https://abullsapp.com,https://www.abullsapp.com,http://localhost:8788,http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map(value => value.trim()).filter(Boolean);
}

function corsHeaders(request, env = {}) {
  const origin = request.headers.get('Origin');
  const allowed = allowedOrigins(env);
  const selected = origin && allowed.includes(origin) ? origin : null;
  return {
    ...(selected ? { 'Access-Control-Allow-Origin': selected } : {}),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function withCors(response, request, env) {
  if (!(response instanceof Response)) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function notFound(request, env) {
  return new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
    status: 404,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...corsHeaders(request, env)
    }
  });
}

async function cleanupLeaderboard(env = {}) {
  const db = env.LEADERBOARD_DB;
  if (!db || typeof db.prepare !== 'function') return;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  await db.prepare('DELETE FROM run_submissions WHERE created_at < ?').bind(cutoff).run().catch(() => null);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (retired(url.pathname)) return notFound(request, env);

    const vnext = await handleIntelligenceFetch(request, env);
    if (vnext) {
      const baselineOwnsPath = BASELINE_INTELLIGENCE_PATHS.has(url.pathname);
      if (!(baselineOwnsPath && vnext.status === 404)) return withCors(vnext, request, env);
    }

    return baselineWorker.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    const task = (async () => {
      await Promise.allSettled([
        cleanupLeaderboard(env),
        handleIntelligenceScheduled(env)
      ]);
    })();
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  }
};

export const __workerVNextContract = Object.freeze({
  baselineVersion: '8.2.0',
  retiredPaths: Object.freeze([...RETIRED_PATHS, '/api/bull-vision/*']),
  baselineIntelligenceFallbacks: Object.freeze([...BASELINE_INTELLIGENCE_PATHS])
});
