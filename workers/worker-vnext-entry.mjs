/* A Bulls App Worker — vNext compatibility entry.
 * Build-forward provenance: verified Worker 8.2.0.
 * Active baseline runtime retains only system/auth/Bull Invaders leaderboard routes.
 * All wallet/intelligence product behavior is owned by vNext.
 */

import baselineWorker from './worker-baseline-retained.mjs';
import { handleIntelligenceFetch, handleIntelligenceScheduled } from './intelligence-worker-hooks.mjs';
import { guardIntelligenceRequest } from './intelligence-request-guard.mjs';

const RETAINED_BASELINE_PATHS = new Set([
  '/api/health',
  '/api/auth/google/config',
  '/api/auth/google',
  '/api/auth/google/session',
  '/api/auth/player-session',
  '/api/leaderboard/top',
  '/api/leaderboard/challenge',
  '/api/leaderboard/submit'
]);

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Pump-Ingest-Secret',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function withCors(response, request, env) {
  if (!(response instanceof Response)) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) if (!headers.has(key)) headers.set(key, value);
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
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    const guarded = await guardIntelligenceRequest(request, env);
    if (guarded) return withCors(guarded, request, env);
    const vnext = await handleIntelligenceFetch(request, env, ctx);
    if (vnext) return withCors(vnext, request, env);
    if (!RETAINED_BASELINE_PATHS.has(url.pathname)) return notFound(request, env);
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
  baselineRuntime: 'retained-system-auth-bull-invaders',
  retainedBaselinePaths: Object.freeze([...RETAINED_BASELINE_PATHS])
});


