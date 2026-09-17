/* A Bulls App Living Universe Worker — read-only intelligence entry. */
import { handleIntelligenceFetch, handleIntelligenceScheduled } from './intelligence-worker-hooks.mjs';
import { guardIntelligenceRequest } from './intelligence-request-guard.mjs';
import { configureProviderFetch } from './intelligence-fetch.mjs';

function allowedOrigins(env = {}) {
  return String(env.ALLOWED_ORIGINS || 'http://localhost:8788,http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map(value => value.trim()).filter(Boolean);
}

function corsHeaders(request, env = {}) {
  const origin = request.headers.get('Origin');
  const allowed = allowedOrigins(env);
  const selected = origin && allowed.includes(origin) ? origin : null;
  return {
    ...(selected ? { 'Access-Control-Allow-Origin': selected } : {}),
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
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

function health(request, env) {
  return withCors(new Response(JSON.stringify({
    ok: true,
    service: 'a-bulls-living-universe',
    runtime: 'read-only-intelligence',
    timestamp: new Date().toISOString()
  }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }), request, env);
}

export default {
  async fetch(request, env, ctx) {
    configureProviderFetch(env);
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    const guarded = await guardIntelligenceRequest(request, env);
    if (guarded) return withCors(guarded, request, env);
    const vnext = await handleIntelligenceFetch(request, env, ctx);
    if (vnext) return withCors(vnext, request, env);
    if (url.pathname === '/api/health' && request.method === 'GET') return health(request, env);
    return notFound(request, env);
  },

  async scheduled(event, env, ctx) {
    configureProviderFetch(env);
    const task = (async () => {
      await handleIntelligenceScheduled(env);
    })();
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  }
};

export const __workerVNextContract = Object.freeze({
  runtime: 'living-universe-read-only',
  retainedPaths: Object.freeze(['/api/health'])
});
