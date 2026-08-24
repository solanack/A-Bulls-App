/**
 * A Bulls App API Worker v8.0.4
 * Secrets: HELIUS_API_KEY, GOOGLE_CLIENT_ID, AUTH_SESSION_SECRET
 * Vars: ALLOWED_ORIGINS, ANSEM_MINT, COINGECKO_API_KEY (optional),
 *       KIMJI_STAKING_AUTHORITY (optional)
 * Optional bindings: RATE_LIMITER (Cloudflare Rate Limiting),
 *                    ANALYTICS_CACHE (Cloudflare KV)
 *
 * Public analytics are cache-first and refreshed in the background. Google
 * Sign-In remains the identity system; this Worker has no payment surface.
 */
const VERSION = '8.0.4';
const MAX_JSON_BYTES = 16 * 1024;
const MAX_SIGNED_TOKEN_CHARS = 8192;
const API_SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, nosnippet'
});
const COMPETITIVE_GAMES = new Set(['bull-invaders']);
const COMPETITIVE_RULES = Object.freeze({
  'bull-invaders': Object.freeze({ mode: 'ranked', challengeModes: Object.freeze(['ranked']), maxBosses: 19 })
});
const DEFAULT_ANSEM_MINT = '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump';
const BULL_PEN_COLLECTION = 'C5gHBKXwA8jduXNk3HyAVLnLBN6PEM8fTqkNNh5uyyjJ';
const BULL_PEN_SYMBOL = 'the_bullpen';
const THE_BULLS_API = 'https://api.thebulls.live';
const THE_BULLS_LIVE = 'https://thebulls.live/live';
const KIMJI_LIVE = 'https://kimji.fun/';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const SOL_MINTS = new Set(['SOL', 'So11111111111111111111111111111111111111111', 'So11111111111111111111111111111111111111112']);
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYDqfCMx1j8dYKVKJQmuayNX';
const encoder = new TextEncoder();
const memoryRates = new Map();
const responseCache = new Map();
const sharedRefreshes = new Map();
const leaderboardReady = new WeakMap();
const MAX_SHARED_REFRESHES = 24;
const MAX_UPSTREAM_IN_FLIGHT = 24;
const MAX_UPSTREAM_QUEUE = 96;
let upstreamInFlight = 0;
const upstreamWaiters = [];
const runtimeMetrics = {
  startedAt: Date.now(),
  requests: 0,
  errors5xx: 0,
  rateLimited: 0,
  cacheHits: 0,
  cacheMisses: 0,
  refreshJoins: 0,
  refreshStarted: 0,
  upstreamRequests: 0,
  upstreamRetries: 0,
  upstreamTimeouts: 0
};
const DATA_POLICY = Object.freeze({
  freshMs: 20 * 60_000,
  staleMs: 7 * 24 * 60 * 60_000,
  walletFreshMs: 3 * 60_000,
  upstreamTimeoutMs: 8_000,
  retries: 2
});
const ANSEM_ANALYTICS_KEY = 'ansem:analytics:v801';
const ROUTES = Object.freeze({
  'GET /api/health': Object.freeze({ group: 'system', access: 'public', rate: 75, handle: ({ env, cors }) => health(env, cors) }),
  'GET /api/auth/google/config': Object.freeze({ group: 'auth', access: 'origin', rate: 20, handle: ({ env, cors }) => googleConfig(env, cors) }),
  'POST /api/auth/google': Object.freeze({ group: 'auth', access: 'origin', rate: 20, handle: ({ request, env, cors }) => verifyGoogle(request, env, cors) }),
  'GET /api/auth/google/session': Object.freeze({ group: 'auth', access: 'origin', rate: 20, handle: ({ request, env, cors }) => googleSession(request, env, cors) }),
  'POST /api/auth/player-session': Object.freeze({ group: 'auth', access: 'origin', rate: 20, handle: ({ env, cors }) => playerSession(env, cors) }),
  'GET /api/nft/collection-stats': Object.freeze({ group: 'bullpen', access: 'public', rate: 40, handle: ({ env, cors, ctx }) => nftCollectionStats(env, cors, ctx) }),
  'GET /api/nft/ecosystem-stats': Object.freeze({ group: 'bullpen', access: 'public', rate: 40, handle: ({ env, cors, ctx }) => nftEcosystemStats(env, cors, ctx) }),
  'GET /api/leaderboard/top': Object.freeze({ group: 'leaderboard', access: 'public', rate: 75, handle: ({ url, env, cors }) => leaderboardTop(url, env, cors) }),
  'POST /api/leaderboard/challenge': Object.freeze({ group: 'leaderboard', access: 'origin', rate: 30, handle: ({ request, env, cors }) => leaderboardChallenge(request, env, cors) }),
  'POST /api/leaderboard/submit': Object.freeze({ group: 'leaderboard', access: 'origin', rate: 30, handle: ({ request, env, cors }) => leaderboardSubmit(request, env, cors) }),
  'GET /api/ansem/analytics': Object.freeze({ group: 'analytics', access: 'public', rate: 24, handle: ({ env, cors, ctx }) => ansemAnalytics(env, cors, ctx) }),
  'POST /api/wallet/overview': Object.freeze({ group: 'wallet', access: 'public', rate: 24, handle: ({ request, env, cors }) => walletOverview(request, env, cors) }),
  'POST /api/wallet/activity': Object.freeze({ group: 'wallet', access: 'public', rate: 24, handle: ({ request, env, cors }) => walletActivity(request, env, cors) })
});

export default {
  async fetch(request, env, ctx) {
    const startedAt = performance.now();
    runtimeMetrics.requests += 1;
    const url = new URL(request.url);
    const route = ROUTES[`${request.method} ${url.pathname}`];
    const publicRoute = isPublicApiRoute(url.pathname, request.method);
    const requestId = request.headers.get('CF-Ray') || crypto.randomUUID();
    const cors = { ...corsHeaders(request, env, publicRoute), 'X-Request-ID': requestId };
    if (request.method === 'OPTIONS') {
      const knownPath = Object.keys(ROUTES).some(key => key.endsWith(` ${url.pathname}`));
      if (!knownPath) return json({ ok: false, error: { message: 'Route not found' } }, 404, cors);
      if (!publicRoute && !originAllowed(request, env)) {
        return json({ ok: false, error: { message: 'Origin not allowed' } }, 403, cors);
      }
      return new Response(null, { status: 204, headers: { ...API_SECURITY_HEADERS, ...cors } });
    }
    // Wallet, Bullpen, analytics and leaderboard endpoints only expose public data or
    // anonymous, server-validated scores. They intentionally support the hosted
    // Pages site, an installed PWA/TWA, and read-only preview shells. Google
    // identity remains origin-restricted because it carries a user session.
    if (!route) return json({ ok: false, error: { message: 'Route not found' } }, 404, cors);
    if (route.access !== 'public' && !originAllowed(request, env)) return json({ ok: false, error: { message: 'Origin not allowed' } }, 403, cors);

    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rate = await rateLimit(env, `${route.group}:${ip}:${url.pathname}`, route.rate, 60_000);
      const rateHeaders = {
        'RateLimit-Limit': String(route.rate),
        'RateLimit-Remaining': String(rate.remaining),
        'RateLimit-Reset': String(rate.resetSeconds)
      };
      if (!rate.allowed) {
        runtimeMetrics.rateLimited += 1;
        return withRuntimeHeaders(json(
          { ok: false, error: { message: 'Too many requests. Try again shortly.' } },
          429,
          { ...cors, ...rateHeaders, 'Retry-After': String(rate.resetSeconds) }
        ), startedAt);
      }
      const response = await route.handle({ request, url, env, cors: { ...cors, ...rateHeaders }, ctx });
      return withRuntimeHeaders(response, startedAt);
    } catch (error) {
      const candidateStatus = Number(error?.status || 500);
      const status = Number.isInteger(candidateStatus) && candidateStatus >= 400 && candidateStatus <= 599 ? candidateStatus : 500;
      if (status >= 500) {
        runtimeMetrics.errors5xx += 1;
        logFailure(`request ${requestId}`, error);
      }
      return withRuntimeHeaders(json({ ok: false, error: { message: publicErrorMessage(error, status), requestId } }, status, cors), startedAt);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try { await refreshAnsemHolderCount(env); }
      catch (error) { logFailure('scheduled holder refresh', error); }
      try { await refreshAnsemAnalytics(env); }
      catch (error) { logFailure('scheduled analytics refresh', error); }
      try { if (env.LEADERBOARD_DB) await cleanupRunSubmissions(env); }
      catch (error) { logFailure('scheduled leaderboard cleanup', error); }
    })());
  }
};

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://abullsapp.com,https://black-bull-run-sol.pages.dev,http://localhost:8788,http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map(value => value.trim()).filter(Boolean);
}
function isPublicApiRoute(pathname, method) {
  if (method !== 'OPTIONS') return ROUTES[`${method} ${pathname}`]?.access === 'public';
  return Object.entries(ROUTES).some(([key, route]) => key.endsWith(` ${pathname}`) && route.access === 'public');
}
function originAllowed(request, env) {
  const origin = request.headers.get('Origin');
  return !origin || allowedOrigins(env).includes(origin);
}
function corsHeaders(request, env, publicRoute = false) {
  const origin = request.headers.get('Origin');
  const fallback = allowedOrigins(env)[0];
  return {
    'Access-Control-Allow-Origin': publicRoute ? '*' : origin && allowedOrigins(env).includes(origin) ? origin : fallback,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}
function json(value, status = 200, extra = {}, cacheControl = 'no-store') {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...API_SECURITY_HEADERS, ...extra, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl }
  });
}
function withRuntimeHeaders(response, startedAt) {
  const headers = new Headers(response.headers);
  headers.set('X-Worker-Version', VERSION);
  headers.set('Server-Timing', `worker;dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function httpError(message, status = 400, expose = status < 500) {
  return Object.assign(new Error(message), { status, expose });
}
function publicErrorMessage(error, status) {
  if (error?.expose === true && typeof error.message === 'string') return error.message.slice(0, 180);
  if (status === 401) return 'Authentication is required or has expired.';
  if (status === 403) return 'This request is not allowed.';
  if (status === 404) return 'Route not found.';
  if (status === 413) return 'Request body is too large.';
  if (status === 415) return 'Content-Type application/json is required.';
  if (status >= 500) return 'The service could not complete this request.';
  return 'The request was invalid.';
}
function logFailure(label, error) {
  const name = String(error?.name || 'Error').replace(/[^a-zA-Z0-9_. -]/g, '').slice(0, 40) || 'Error';
  const message = String(error?.message || error || 'unknown failure')
    .replace(/https?:\/\/\S+/gi, '[upstream-url]')
    .replace(/\b(api[-_]?key|authorization|bearer|credential|secret|token)=?\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 240);
  console.warn(`[${label}] ${name}: ${message}`);
}
async function readJsonBody(request, maxBytes = MAX_JSON_BYTES) {
  const mediaType = String(request.headers.get('Content-Type') || '').split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json' && !mediaType.endsWith('+json')) {
    throw httpError('Content-Type application/json is required.', 415);
  }
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw httpError('Request body is too large.', 413);
  const text = await request.text();
  if (encoder.encode(text).byteLength > maxBytes) throw httpError('Request body is too large.', 413);
  if (!text.trim()) throw httpError('A JSON request body is required.', 400);
  let value;
  try { value = JSON.parse(text); }
  catch (_) { throw httpError('The JSON request body is malformed.', 400); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw httpError('The JSON request body must be an object.', 400);
  }
  return value;
}
function health(env, cors) {
  return json({
    ok: true,
    data: {
      version: VERSION,
      uptimeSeconds: Math.max(0, Math.floor((Date.now() - runtimeMetrics.startedAt) / 1000)),
      services: {
        googleSignIn: Boolean(env.GOOGLE_CLIENT_ID && env.AUTH_SESSION_SECRET),
        bullpenEcosystemAnalytics: Boolean(env.HELIUS_API_KEY),
        ansemAnalytics: true,
        ansemWalletEnrichment: Boolean(env.HELIUS_API_KEY),
        sharedAnalyticsCache: Boolean(env.ANALYTICS_CACHE),
        rateLimiter: Boolean(env.RATE_LIMITER),
        walletAnalytics: Boolean(env.HELIUS_API_KEY),
        leaderboard: Boolean(env.LEADERBOARD_DB && env.AUTH_SESSION_SECRET),
        monetization: false
      },
      runtime: {
        activeRefreshes: sharedRefreshes.size,
        upstreamInFlight,
        upstreamQueued: upstreamWaiters.length,
        requests: runtimeMetrics.requests,
        errors5xx: runtimeMetrics.errors5xx,
        rateLimited: runtimeMetrics.rateLimited,
        cacheHits: runtimeMetrics.cacheHits,
        cacheMisses: runtimeMetrics.cacheMisses
      }
    }
  }, 200, cors, 'public, max-age=15');
}
async function rateLimit(env, key, max, windowMs) {
  if (env.RATE_LIMITER?.limit) {
    const result = await env.RATE_LIMITER.limit({ key });
    if (result?.success === false) return { allowed: false, remaining: 0, resetSeconds: Math.ceil(windowMs / 1000) };
  }
  const now = Date.now();
  const prior = memoryRates.get(key);
  if (!prior || now - prior.startedAt > windowMs) {
    memoryRates.set(key, { startedAt: now, count: 1 });
    if (memoryRates.size > 5000) memoryRates.delete(memoryRates.keys().next().value);
    return { allowed: true, remaining: Math.max(0, max - 1), resetSeconds: Math.ceil(windowMs / 1000) };
  }
  prior.count++;
  const resetSeconds = Math.max(1, Math.ceil((windowMs - (now - prior.startedAt)) / 1000));
  return { allowed: prior.count <= max, remaining: Math.max(0, max - prior.count), resetSeconds };
}
function validAddress(value) { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || '')); }
function requireHelius(env) {
  if (!env.HELIUS_API_KEY) throw new Error('HELIUS_API_KEY is not configured');
  return env.HELIUS_API_KEY;
}

async function coalesceRefresh(key, factory) {
  const existing = sharedRefreshes.get(key);
  if (existing) {
    runtimeMetrics.refreshJoins += 1;
    return existing;
  }
  if (sharedRefreshes.size >= MAX_SHARED_REFRESHES) {
    throw httpError('The analytics service is temporarily busy. Try again shortly.', 503, true);
  }
  runtimeMetrics.refreshStarted += 1;
  const pending = Promise.resolve().then(factory).finally(() => {
    if (sharedRefreshes.get(key) === pending) sharedRefreshes.delete(key);
  });
  sharedRefreshes.set(key, pending);
  return pending;
}
async function cacheGet(env, key) {
  if (env.ANALYTICS_CACHE?.get) {
    try {
      const shared = await env.ANALYTICS_CACHE.get(key, 'json');
      if (shared != null) { runtimeMetrics.cacheHits += 1; return shared; }
    } catch (_) {}
  }
  const entry = responseCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    responseCache.delete(key);
    runtimeMetrics.cacheMisses += 1;
    return null;
  }
  runtimeMetrics.cacheHits += 1;
  return structuredClone(entry.value);
}
async function cachePut(env, key, value, ttlMs) {
  const now = Date.now();
  responseCache.set(key, { expiresAt: now + ttlMs, value: structuredClone(value) });
  if (responseCache.size > 150) {
    for (const [cacheKey, entry] of responseCache) {
      if (entry.expiresAt < now || responseCache.size > 150) responseCache.delete(cacheKey);
      if (responseCache.size <= 150) break;
    }
  }
  if (env.ANALYTICS_CACHE?.put) {
    try {
      await env.ANALYTICS_CACHE.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000)) });
    } catch (_) {}
  }
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
async function acquireUpstreamSlot() {
  if (upstreamInFlight < MAX_UPSTREAM_IN_FLIGHT) {
    upstreamInFlight += 1;
    return;
  }
  if (upstreamWaiters.length >= MAX_UPSTREAM_QUEUE) {
    throw httpError('Upstream capacity is temporarily full. Try again shortly.', 503, true);
  }
  await new Promise((resolve, reject) => {
    const waiter = { resolve: null, reject };
    const timer = setTimeout(() => {
      const index = upstreamWaiters.indexOf(waiter);
      if (index >= 0) upstreamWaiters.splice(index, 1);
      reject(httpError('Upstream capacity wait timed out.', 503, true));
    }, 2500);
    waiter.resolve = () => { clearTimeout(timer); resolve(); };
    upstreamWaiters.push(waiter);
  });
  upstreamInFlight += 1;
}
function releaseUpstreamSlot() {
  upstreamInFlight = Math.max(0, upstreamInFlight - 1);
  const next = upstreamWaiters.shift();
  next?.resolve?.();
}
async function fetchWithPolicy(url, options = {}, policy = {}) {
  const timeoutMs = Math.max(1_000, Number(policy.timeoutMs || DATA_POLICY.upstreamTimeoutMs));
  const retries = Math.max(0, Math.min(3, Number(policy.retries ?? DATA_POLICY.retries)));
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await acquireUpstreamSlot();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('upstream-timeout'), timeoutMs);
    let retryDelay = 0;
    try {
      runtimeMetrics.upstreamRequests += 1;
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (response.ok || (response.status < 500 && response.status !== 429) || attempt === retries) return response;
      lastError = new Error(`Upstream HTTP ${response.status}`);
      runtimeMetrics.upstreamRetries += 1;
      const retryAfter = Math.min(2000, Math.max(0, Number(response.headers.get('Retry-After') || 0) * 1000));
      retryDelay = retryAfter || Math.min(1600, 125 * (2 ** attempt) + Math.floor(Math.random() * 90));
    } catch (error) {
      if (error?.name === 'AbortError') runtimeMetrics.upstreamTimeouts += 1;
      lastError = error?.name === 'AbortError' ? new Error(`Upstream timed out after ${timeoutMs}ms`) : error;
      if (attempt === retries) throw lastError;
      runtimeMetrics.upstreamRetries += 1;
      retryDelay = Math.min(1600, 125 * (2 ** attempt) + Math.floor(Math.random() * 90));
    } finally {
      clearTimeout(timer);
      releaseUpstreamSlot();
    }
    if (retryDelay > 0) await wait(retryDelay);
  }
  throw lastError || new Error('Upstream request failed');
}
async function storeSnapshot(env, key, value, freshMs = DATA_POLICY.freshMs) {
  await Promise.all([
    cachePut(env, `${key}:fresh`, value, freshMs),
    cachePut(env, `${key}:last-success`, value, DATA_POLICY.staleMs)
  ]);
  return value;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function leaderboardDb(env) {
  if (!env.LEADERBOARD_DB) throw new Error('LEADERBOARD_DB is not configured');
  return env.LEADERBOARD_DB;
}
async function ensureLeaderboard(env) {
  const db = leaderboardDb(env);
  let ready = leaderboardReady.get(db);
  if (!ready) {
    ready = db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS leaderboard_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      alias TEXT NOT NULL,
      score INTEGER NOT NULL,
      elapsed_ms INTEGER NOT NULL,
      kills INTEGER NOT NULL DEFAULT 0,
      bosses_defeated INTEGER NOT NULL DEFAULT 0,
      replay_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_leaderboard_game_score ON leaderboard_scores(game, score DESC, created_at ASC)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS run_submissions (
      challenge_id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      replay_hash TEXT NOT NULL UNIQUE,
      game TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_run_submissions_account_created ON run_submissions(account_id, created_at DESC)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_run_submissions_created ON run_submissions(created_at ASC)')
    ]).catch(error => { leaderboardReady.delete(db); throw error; });
    leaderboardReady.set(db, ready);
  }
  await ready;
  return db;
}
async function cleanupRunSubmissions(env) {
  const db = await ensureLeaderboard(env);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  await db.prepare('DELETE FROM run_submissions WHERE created_at < ?').bind(cutoff).run();
}
function boundedInt(value, max = 100_000_000) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= max ? number : null;
}
function cleanAlias(value) {
  return String(value || 'Bull').replace(/[^a-zA-Z0-9_. -]/g, '').trim().slice(0, 24) || 'Bull';
}
function physicallyPossibleRun(game, run) {
  const seconds = run.elapsedMs / 1000;
  if (run.elapsedMs < 1000 || run.elapsedMs > 6 * 60 * 60 * 1000) return false;
  const rule = COMPETITIVE_RULES[game];
  if (!rule || run.bossesDefeated > rule.maxBosses) return false;
  return run.score <= seconds * 8500 + 250000 && run.kills <= seconds * 85 + 150;
}
function gameSpecificRunPossible(game, run) {
  void game;
  return true;
}
async function leaderboardChallenge(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Ranked play is not configured' } }, 503, cors);
  let account;
  try { account = await authenticatedAccount(request, env); }
  catch (_) { return json({ ok: false, error: { message: 'A valid signed player session is required' } }, 401, cors); }
  const body = await readJsonBody(request);
  const game = String(body.game || 'bull-invaders');
  const mode = String(body.mode || '');
  const rule = COMPETITIVE_RULES[game];
  if (!COMPETITIVE_GAMES.has(game) || !rule || !rule.challengeModes.includes(mode)) {
    return json({ ok: false, error: { message: 'A supported game and run mode are required' } }, 400, cors);
  }
  const challengeId = crypto.randomUUID();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 6 * 60 * 60_000;
  const challengeToken = await issueToken({
    purpose: 'run-challenge', challengeId, accountId: account.id, game, mode,
    iat: issuedAt, exp: expiresAt
  }, env.AUTH_SESSION_SECRET);
  return json({ ok: true, data: { challengeId, challengeToken, game, mode, expiresAt } }, 200, cors);
}
async function verifyRunChallenge(request, body, env, game, mode) {
  const account = await authenticatedAccount(request, env);
  const challenge = await readSignedPayload(String(body.challengeToken || ''), env);
  if (challenge.purpose !== 'run-challenge' || !challenge.challengeId || challenge.exp < Date.now()) {
    throw Object.assign(new Error('Run challenge is missing or expired'), { status: 401 });
  }
  if (challenge.challengeId !== String(body.challengeId || '') || challenge.accountId !== account.id || challenge.game !== game || challenge.mode !== mode) {
    throw Object.assign(new Error('Run challenge does not match this account or run'), { status: 403 });
  }
  return { account, challenge };
}
async function leaderboardSubmit(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Leaderboard is not configured' } }, 503, cors);
  const body = await readJsonBody(request);
  const game = String(body.game || '');
  const rule = COMPETITIVE_RULES[game];
  if (!COMPETITIVE_GAMES.has(game) || !rule) return json({ ok: false, error: { message: 'Unsupported game' } }, 400, cors);
  const mode = String(body.mode || '');
  if (mode === 'arcade') {
    return json({ ok: false, error: { message: 'Arcade runs are not eligible for the server-screened leaderboard' } }, 403, cors);
  }
  if (mode !== rule.mode) return json({ ok: false, error: { message: `A ${rule.mode} mode tag is required` } }, 400, cors);
  const run = {
    game,
    score: boundedInt(body.score),
    elapsedMs: boundedInt(body.elapsedMs, 6 * 60 * 60 * 1000),
    kills: boundedInt(body.kills, 1_000_000),
    bossesDefeated: boundedInt(body.bossesDefeated, rule.maxBosses),
    nonce: String(body.nonce || '')
  };
  if (Object.values(run).some(value => value === null) || !/^[a-zA-Z0-9-]{8,80}$/.test(run.nonce)) return json({ ok: false, error: { message: 'Invalid run payload' } }, 400, cors);
  const challengeId = String(body.challengeId || '');
  const canonical = ['abulls-v8.0.1', mode, run.game, run.score, run.elapsedMs, run.kills, run.bossesDefeated, run.nonce, challengeId].join('|');
  const expectedHash = await sha256Hex(canonical);
  if (!/^[a-f0-9]{64}$/.test(String(body.replayHash || '')) || expectedHash !== body.replayHash) return json({ ok: false, error: { message: 'Replay hash validation failed' } }, 400, cors);
  if (!physicallyPossibleRun(game, run) || !gameSpecificRunPossible(game, run)) return json({ ok: false, error: { message: 'Score failed physics sanity bounds' } }, 422, cors);
  let verified;
  try { verified = await verifyRunChallenge(request, body, env, game, mode); }
  catch (error) {
    const status = Number(error?.status) === 403 ? 403 : 401;
    return json({ ok: false, error: { message: status === 403 ? 'Run challenge does not match this account or run' : 'Run challenge is invalid or expired' } }, status, cors);
  }
  const db = await ensureLeaderboard(env);
  const createdAt = new Date().toISOString(), alias = cleanAlias(body.alias);
  const results = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO run_submissions
      (challenge_id, account_id, replay_hash, game, mode, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(challengeId, verified.account.id, expectedHash, game, mode, createdAt),
    db.prepare(`INSERT OR IGNORE INTO leaderboard_scores
      (game, alias, score, elapsed_ms, kills, bosses_defeated, replay_hash, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM run_submissions
        WHERE challenge_id = ? AND account_id = ? AND replay_hash = ? AND created_at = ?)`) 
      .bind(game, alias, run.score, run.elapsedMs, run.kills, run.bossesDefeated, expectedHash, createdAt,
        challengeId, verified.account.id, expectedHash, createdAt)
  ]);
  const accepted = Number(results?.[0]?.meta?.changes || 0) === 1 && Number(results?.[1]?.meta?.changes || 0) === 1;
  return json({ ok: true, data: { accepted, mode, score: run.score, createdAt, screening: 'one-time challenge + physics bounds' } }, 200, cors);
}
async function leaderboardTop(url, env, cors) {
  if (!env.LEADERBOARD_DB) return json({ ok: false, error: { message: 'Leaderboard is not configured' } }, 503, cors);
  const game = String(url.searchParams.get('game') || 'bull-invaders');
  if (!COMPETITIVE_GAMES.has(game)) return json({ ok: false, error: { message: 'Unsupported game' } }, 400, cors);
  const requestedLimit = Number(url.searchParams.get('limit') || 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 10;
  const db = await ensureLeaderboard(env);
  const query = await db.prepare(`SELECT alias, score, elapsed_ms AS elapsedMs, kills,
    bosses_defeated AS bossesDefeated, created_at AS createdAt
    FROM leaderboard_scores WHERE game = ? ORDER BY score DESC, created_at ASC LIMIT ?`).bind(game, limit).all();
  return json({ ok: true, data: { game, scores: query?.results || [] } }, 200, cors, 'public, max-age=15');
}

async function rpc(env, method, params) {
  const key = requireHelius(env);
  const response = await fetchWithPolicy(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `Helius RPC ${method} failed`);
  return payload.result;
}
async function rpcBatch(env, calls) {
  if (!calls.length) return [];
  const key = requireHelius(env);
  const response = await fetchWithPolicy(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(calls.map((call, index) => ({
      jsonrpc: '2.0', id: index + 1, method: call.method, params: call.params
    })))
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(payload)) throw new Error(`Helius RPC batch failed (${response.status})`);
  const byId = new Map(payload.map(item => [Number(item.id), item]));
  return calls.map((_, index) => {
    const item = byId.get(index + 1);
    return item?.error ? null : item?.result ?? null;
  });
}
async function heliusWallet(env, path, params = {}) {
  const key = requireHelius(env);
  const url = new URL('https://api.helius.xyz' + path);
  url.searchParams.set('api-key', key);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(name, String(value));
  });
  const response = await fetchWithPolicy(url, { headers: { Accept: 'application/json', 'X-Api-Key': key } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || payload.message || `Helius Wallet API HTTP ${response.status}`);
  return payload;
}
async function settled(promise, fallback, warnings, label) {
  try { return await promise; }
  catch (error) {
    logFailure(`upstream ${label}`, error);
    warnings.push(label + ': temporarily unavailable');
    return fallback;
  }
}

async function walletOverview(request, env, cors) {
  const body = await readJsonBody(request, 4096);
  const address = String(body.address || '');
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  requireHelius(env);
  const cacheKey = 'wallet:overview:' + address;
  const cached = await cacheGet(env, cacheKey + ':fresh');
  if (cached) return json({ ok: true, data: cached, cached: true, updatedAt: cached.updatedAt }, 200, cors);

  try {
    const data = await coalesceRefresh('refresh:' + cacheKey, async () => {
      const raced = await cacheGet(env, cacheKey + ':fresh');
      if (raced) return raced;
        const warnings = [];
        const [balance, classic, token2022, wallet] = await Promise.all([
          settled(rpc(env, 'getBalance', [address, { commitment: 'confirmed' }]), { value: 0 }, warnings, 'SOL balance'),
          settled(rpc(env, 'getTokenAccountsByOwner', [address, { programId: TOKEN_PROGRAM }, { encoding: 'jsonParsed', commitment: 'confirmed' }]), { value: [] }, warnings, 'classic SPL accounts'),
          settled(rpc(env, 'getTokenAccountsByOwner', [address, { programId: TOKEN_2022_PROGRAM }, { encoding: 'jsonParsed', commitment: 'confirmed' }]), { value: [] }, warnings, 'Token-2022 accounts'),
          settled(heliusWallet(env, `/v1/wallet/${encodeURIComponent(address)}/balances`, { page: 1, limit: 100, showZeroBalance: false, showNative: true, showNfts: true }), { balances: [], nfts: [], totalUsdValue: null, pagination: {} }, warnings, 'priced balances')
        ]);

        const classicAccounts = Array.isArray(classic?.value) ? classic.value : [];
        const token2022Accounts = Array.isArray(token2022?.value) ? token2022.value : [];
        const allAccounts = [...classicAccounts.map(item => ({ ...item, tokenProgram: 'spl-token' })), ...token2022Accounts.map(item => ({ ...item, tokenProgram: 'token-2022' }))];
        const emptyAccounts = allAccounts.filter(item => {
          const info = item?.account?.data?.parsed?.info;
          return info && String(info.tokenAmount?.amount || '') === '0' && info.isNative !== true;
        });
        const emptyRentLamports = emptyAccounts.reduce((sum, item) => sum + Number(item?.account?.lamports || 0), 0);
        const balances = Array.isArray(wallet?.balances) ? wallet.balances : [];
        const holdings = balances.filter(item => Number(item.balance || 0) !== 0).map(item => ({
          mint: item.mint,
          symbol: item.symbol || null,
          name: item.name || null,
          balance: Number(item.balance || 0),
          decimals: Number(item.decimals || 0),
          pricePerToken: item.pricePerToken == null ? null : Number(item.pricePerToken),
          usdValue: item.usdValue == null ? null : Number(item.usdValue),
          logoUrl: item.logoUri || null,
          tokenProgram: item.tokenProgram || null
        }));
        const priced = holdings.filter(item => Number.isFinite(item.usdValue));
        const pageValue = Number.isFinite(Number(wallet.totalUsdValue)) ? Number(wallet.totalUsdValue) : priced.reduce((sum, item) => sum + Number(item.usdValue || 0), 0);
        const ansemMint = env.ANSEM_MINT || DEFAULT_ANSEM_MINT;
        const ansemHolding = holdings.find(item => item.mint === ansemMint) || { mint: ansemMint, symbol: 'ANSEM', balance: 0, usdValue: 0 };
        const lamports = Number(balance?.value || 0);
        const data = {
          address,
          lamports,
          solBalance: lamports / 1e9,
          accountType: 'wallet',
          tokenAccountCount: allAccounts.length,
          token2022AccountCount: token2022Accounts.length,
          uniqueTokenCount: new Set(allAccounts.map(item => item?.account?.data?.parsed?.info?.mint).filter(Boolean)).size,
          totalUsdValue: pageValue,
          pricedHoldingCount: priced.length,
          unpricedHoldingCount: holdings.length - priced.length,
          topHoldingPercent: pageValue > 0 && priced.length ? Number((Math.max(...priced.map(item => Number(item.usdValue || 0))) / pageValue * 100).toFixed(2)) : null,
          holdings,
          nftCount: Array.isArray(wallet?.nfts) ? wallet.nfts.length : 0,
          pagination: wallet?.pagination || null,
          ansemHolding,
          rent: {
            emptyAccountCount: emptyAccounts.length,
            classicEmptyCount: emptyAccounts.filter(item => item.tokenProgram === 'spl-token').length,
            token2022EmptyCount: emptyAccounts.filter(item => item.tokenProgram === 'token-2022').length,
            reclaimableLamports: emptyRentLamports,
            reclaimableSol: emptyRentLamports / 1e9
          },
          sources: ['Helius RPC', 'Helius Wallet API'],
          warnings,
          updatedAt: new Date().toISOString()
        };
        await storeSnapshot(env, cacheKey, data, DATA_POLICY.walletFreshMs);
        return data;
    });
    return json({ ok: true, data, updatedAt: data.updatedAt }, 200, cors);
  } catch (error) {
    const stale = await cacheGet(env, cacheKey + ':last-success');
    if (stale) return json({ ok: true, data: stale, cached: true, stale: true, updatedAt: stale.updatedAt, warning: 'Upstream refresh failed; showing last-known data.' }, 200, cors);
    throw error;
  }
}

function rangeSeconds(range) {
  return { '24h': 86400, '7d': 604800, '30d': 2592000, '90d': 7776000, all: Infinity }[range] || 86400;
}
function symbolForMint(mint, ansemMint) {
  if (SOL_MINTS.has(mint)) return 'SOL';
  if (mint === ansemMint) return 'ANSEM';
  if (mint === USDC_MINT) return 'USDC';
  if (mint === USDT_MINT) return 'USDT';
  return String(mint || '').slice(0, 5) + '…' + String(mint || '').slice(-4);
}
function inferTx(changes, error) {
  if (error) return 'FAILED';
  const positive = changes.filter(item => Number(item.amount) > 0);
  const negative = changes.filter(item => Number(item.amount) < 0);
  if (positive.length && negative.length) return 'SWAP / MULTI-FLOW';
  if (positive.length) return 'RECEIVE';
  if (negative.length) return 'SEND';
  return 'TRANSACTION';
}
function summaryFor(changes, ansemMint) {
  if (!changes.length) return 'No wallet balance changes decoded.';
  return changes.slice(0, 4).map(item => {
    const amount = Number(item.amount || 0);
    return `${amount >= 0 ? '+' : ''}${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbolForMint(item.mint, ansemMint)}`;
  }).join(' · ') + (changes.length > 4 ? ` · +${changes.length - 4} more` : '');
}
function activityAnalytics(transactions, ansemMint) {
  let feesSol = 0;
  let successCount = 0;
  let failedCount = 0;
  let transferInCount = 0;
  let transferOutCount = 0;
  let solIn = 0;
  let solOut = 0;
  let swapCount = 0;
  const mintFlows = new Map();
  const activeDays = new Set();
  const weekdays = Array(7).fill(0);
  const hours = Array(24).fill(0);
  const dayCounts = new Map();
  const heat = Array(56).fill(0);
  const ansem = { received: 0, sent: 0, net: 0, volume: 0, receiveTxs: 0, sendTxs: 0 };

  const recent = transactions.map(tx => {
    const changes = Array.isArray(tx.balanceChanges) ? tx.balanceChanges.filter(change => Number(change.amount || 0) !== 0) : [];
    const hasIn = changes.some(change => Number(change.amount) > 0);
    const hasOut = changes.some(change => Number(change.amount) < 0);
    if (tx.error) failedCount++; else successCount++;
    feesSol += Number(tx.fee || 0);
    if (hasIn) transferInCount++;
    if (hasOut) transferOutCount++;
    if (hasIn && hasOut && new Set(changes.map(item => item.mint)).size >= 2) swapCount++;

    changes.forEach(change => {
      const mint = String(change.mint || '');
      const amount = Number(change.amount || 0);
      const flow = mintFlows.get(mint) || { mint, in: 0, out: 0, net: 0 };
      if (amount > 0) flow.in += amount;
      else flow.out += Math.abs(amount);
      flow.net += amount;
      mintFlows.set(mint, flow);
      if (SOL_MINTS.has(mint)) {
        if (amount > 0) solIn += amount; else solOut += Math.abs(amount);
      }
      if (mint === ansemMint) {
        if (amount > 0) { ansem.received += amount; ansem.receiveTxs++; }
        else { ansem.sent += Math.abs(amount); ansem.sendTxs++; }
        ansem.net += amount;
        ansem.volume += Math.abs(amount);
      }
    });

    const timestamp = Number(tx.timestamp || 0);
    if (timestamp) {
      const date = new Date(timestamp * 1000);
      const day = date.toISOString().slice(0, 10);
      activeDays.add(day);
      weekdays[date.getUTCDay()]++;
      hours[date.getUTCHours()]++;
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      heat[date.getUTCDay() * 8 + Math.min(7, Math.floor(date.getUTCHours() / 3))]++;
    }
    return {
      signature: tx.signature,
      blockTime: timestamp || null,
      feeSol: Number(tx.fee || 0),
      err: tx.error || null,
      type: inferTx(changes, tx.error),
      summary: summaryFor(changes, ansemMint),
      balanceChanges: changes
    };
  });

  const busiestWeekdayIndex = weekdays.indexOf(Math.max(...weekdays));
  const busiestHour = hours.indexOf(Math.max(...hours));
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const topFlows = [...mintFlows.values()]
    .map(item => ({ ...item, symbol: symbolForMint(item.mint, ansemMint) }))
    .sort((a, b) => (b.in + b.out) - (a.in + a.out))
    .slice(0, 20);

  return {
    feesSol,
    successCount,
    failedCount,
    flow: { transferInCount, transferOutCount, solIn, solOut, solNet: solIn - solOut },
    ansem,
    trading: {
      swapCount,
      uniqueMints: mintFlows.size,
      activeDays: activeDays.size,
      transactionsPerActiveDay: activeDays.size ? transactions.length / activeDays.size : 0,
      busiestWeekday: transactions.length ? names[busiestWeekdayIndex] : null,
      busiestHour: transactions.length ? busiestHour : null
    },
    topFlows,
    dayBuckets: [...dayCounts].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count })),
    heatCells: heat.map((v, index) => ({ v, label: 'activity-' + index })),
    recent
  };
}

async function walletActivity(request, env, cors) {
  const body = await readJsonBody(request, 4096);
  const address = String(body.address || '');
  const range = ['24h', '7d', '30d', '90d', 'all'].includes(body.range) ? body.range : '24h';
  const limit = Math.min(100, Math.max(1, Number(body.limit) || 100));
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  requireHelius(env);
  const cacheKey = `wallet:activity:${address}:${range}`;
  const cached = await cacheGet(env, cacheKey + ':fresh');
  if (cached) return json({ ok: true, data: cached, cached: true, updatedAt: cached.updatedAt }, 200, cors);

  try {
    const data = await coalesceRefresh('refresh:' + cacheKey, async () => {
      const raced = await cacheGet(env, cacheKey + ':fresh');
      if (raced) return raced;
        const cutoff = range === 'all' ? 0 : Math.floor(Date.now() / 1000) - rangeSeconds(range);
        const maxPages = range === '24h' ? 2 : range === '7d' ? 3 : range === '30d' ? 4 : range === '90d' ? 5 : 6;
        let before = null;
        let hasMore = false;
        let reachedCutoff = false;
        let pagesFetched = 0;
        const transactions = [];

        for (let page = 0; page < maxPages; page++) {
          const payload = await heliusWallet(env, `/v1/wallet/${encodeURIComponent(address)}/history`, {
            limit,
            before,
            tokenAccounts: 'balanceChanged'
          });
          pagesFetched++;
          const list = Array.isArray(payload.data) ? payload.data : [];
          transactions.push(...list);
          hasMore = payload.pagination?.hasMore === true;
          before = payload.pagination?.nextCursor || null;
          const oldest = list.reduce((min, item) => item.timestamp ? Math.min(min, Number(item.timestamp)) : min, Infinity);
          if (cutoff && oldest <= cutoff) { reachedCutoff = true; break; }
          if (!hasMore || !before || !list.length) break;
        }

        const filtered = transactions.filter(tx => !cutoff || !tx.timestamp || Number(tx.timestamp) >= cutoff);
        const analytics = activityAnalytics(filtered, env.ANSEM_MINT || DEFAULT_ANSEM_MINT);
        const data = {
          address,
          range,
          signaturesAnalyzed: filtered.length,
          historyComplete: range === 'all' ? !hasMore : reachedCutoff || !hasMore,
          pagesFetched,
          oldestLoadedAt: filtered.length ? Math.min(...filtered.map(tx => Number(tx.timestamp || Infinity)).filter(Number.isFinite)) : null,
          newestLoadedAt: filtered.length ? Math.max(...filtered.map(tx => Number(tx.timestamp || 0))) : null,
          ...analytics,
          sources: ['Helius Wallet History API'],
          updatedAt: new Date().toISOString()
        };
        await storeSnapshot(env, cacheKey, data, DATA_POLICY.walletFreshMs);
        return data;
    });
    return json({ ok: true, data, updatedAt: data.updatedAt }, 200, cors);
  } catch (error) {
    const stale = await cacheGet(env, cacheKey + ':last-success');
    if (stale) return json({ ok: true, data: stale, cached: true, stale: true, updatedAt: stale.updatedAt, warning: 'Upstream refresh failed; showing last-known data.' }, 200, cors);
    throw error;
  }
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

async function fetchAnsemMarket(env) {
  const mint = env.ANSEM_MINT || DEFAULT_ANSEM_MINT;
  const response = await fetchWithPolicy(
    'https://api.dexscreener.com/latest/dex/tokens/' + encodeURIComponent(mint),
    { headers: { Accept: 'application/json' }, cf: { cacheTtl: 60, cacheEverything: true } }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`DexScreener HTTP ${response.status}`);
  const pairs = (Array.isArray(payload.pairs) ? payload.pairs : [])
    .filter(pair => !pair?.chainId || pair.chainId === 'solana')
    .sort((left, right) => finiteNumber(right?.liquidity?.usd) - finiteNumber(left?.liquidity?.usd));
  const pair = pairs[0];
  if (!pair) throw new Error('No Solana $ANSEM pair is available');
  const h24Tx = pair.txns?.h24 || {};
  return {
    priceUsd: finiteNumber(pair.priceUsd),
    priceChange24h: finiteNumber(pair.priceChange?.h24),
    liquidityUsd: finiteNumber(pair.liquidity?.usd),
    volume24h: finiteNumber(pair.volume?.h24),
    volume6h: finiteNumber(pair.volume?.h6),
    volume1h: finiteNumber(pair.volume?.h1),
    txCount24h: finiteNumber(h24Tx.buys) + finiteNumber(h24Tx.sells),
    txCount6h: finiteNumber(pair.txns?.h6?.buys) + finiteNumber(pair.txns?.h6?.sells),
    txCount1h: finiteNumber(pair.txns?.h1?.buys) + finiteNumber(pair.txns?.h1?.sells),
    marketCap: pair.marketCap == null ? null : finiteNumber(pair.marketCap),
    fdv: pair.fdv == null ? null : finiteNumber(pair.fdv),
    dexId: pair.dexId || null,
    pairAddress: pair.pairAddress || null,
    pairUrl: pair.url || null,
    pairCreatedAt: pair.pairCreatedAt || null
  };
}

function shortWallet(address) {
  const value = String(address || '');
  return value.length > 10 ? value.slice(0, 4) + '…' + value.slice(-4) : value;
}

async function topTradersByVolume(env, watchedAddresses, mint, priceUsd) {
  const volume = new Map();
  const netByWallet = new Map();
  const firstSeen = new Map();
  const lastSeen = new Map();
  const txCount = new Map();
  const addresses = [...new Set((watchedAddresses || []).filter(validAddress))].slice(0, 2);
  const ignored = new Set([TOKEN_PROGRAM, TOKEN_2022_PROGRAM, ...addresses]);
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const signatureLists = await Promise.all(addresses.map(address =>
    rpc(env, 'getSignaturesForAddress', [address, { limit: 32 }]).catch(() => [])
  ));
  const signatureItems = [...new Map(signatureLists
    .flat()
    .filter(item => item?.signature && (!item.blockTime || Number(item.blockTime) >= cutoff))
    .map(item => [item.signature, item])).values()]
    .sort((left, right) => finiteNumber(right.blockTime) - finiteNumber(left.blockTime))
    .slice(0, 24);
  const calls = signatureItems.map(item => ({
    method: 'getTransaction',
    params: [item.signature, {
      encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed'
    }]
  }));
  const transactions = [];
  for (let offset = 0; offset < calls.length; offset += 12) {
    transactions.push(...await rpcBatch(env, calls.slice(offset, offset + 12)));
  }
  for (let index = 0; index < transactions.length; index++) {
    const transaction = transactions[index];
    if (!transaction?.meta || transaction.meta.err) continue;
    const beforeByOwner = new Map(
      (transaction.meta.preTokenBalances || [])
        .filter(row => row.mint === mint && validAddress(row.owner))
        .map(row => [row.owner, finiteNumber(row.uiTokenAmount?.uiAmountString ?? row.uiTokenAmount?.uiAmount)])
    );
    const afterByOwner = new Map(
      (transaction.meta.postTokenBalances || [])
        .filter(row => row.mint === mint && validAddress(row.owner))
        .map(row => [row.owner, finiteNumber(row.uiTokenAmount?.uiAmountString ?? row.uiTokenAmount?.uiAmount)])
    );
    const signerOwners = new Set((transaction.transaction?.message?.accountKeys || [])
      .filter(key => key?.signer === true)
      .map(key => String(key?.pubkey || key || ''))
      .filter(validAddress));
    const timestamp = finiteNumber(transaction.blockTime || signatureItems[index]?.blockTime) * 1000;
    const owners = new Set([...beforeByOwner.keys(), ...afterByOwner.keys()]);
    for (const owner of owners) {
      if (ignored.has(owner) || (signerOwners.size && !signerOwners.has(owner))) continue;
      const delta = finiteNumber(afterByOwner.get(owner)) - finiteNumber(beforeByOwner.get(owner));
      if (!delta) continue;
      const usd = Math.abs(delta) * finiteNumber(priceUsd);
      volume.set(owner, finiteNumber(volume.get(owner)) + usd);
      netByWallet.set(owner, finiteNumber(netByWallet.get(owner)) + delta);
      txCount.set(owner, finiteNumber(txCount.get(owner)) + 1);
      if (!firstSeen.has(owner) || timestamp < firstSeen.get(owner)) firstSeen.set(owner, timestamp);
      if (!lastSeen.has(owner) || timestamp > lastSeen.get(owner)) lastSeen.set(owner, timestamp);
    }
  }
  return [...volume.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([wallet, volumeUsd]) => {
      const netAnsem = finiteNumber(netByWallet.get(wallet));
      return {
        wallet,
        display: shortWallet(wallet),
        volumeUsd,
        txCount: finiteNumber(txCount.get(wallet)),
        holdMs: Math.max(0, finiteNumber(lastSeen.get(wallet)) - finiteNumber(firstSeen.get(wallet))),
        netAnsem,
        direction: netAnsem > 0 ? 'accumulating' : netAnsem < 0 ? 'distributing' : 'neutral',
        firstSeen: firstSeen.get(wallet) || null,
        lastSeen: lastSeen.get(wallet) || null
      };
    });
}

function rateMomentum(currentWindow, currentHours, baselineWindow, baselineHours) {
  const currentRate = finiteNumber(currentWindow) / Math.max(1, currentHours);
  const baselineRate = finiteNumber(baselineWindow) / Math.max(1, baselineHours);
  const percentChange = baselineRate > 0 ? (currentRate - baselineRate) / baselineRate * 100 : null;
  return {
    currentPerHour: currentRate,
    baselinePerHour: baselineRate,
    percentChange,
    direction: percentChange == null ? 'unavailable' : percentChange >= 0 ? 'accelerating' : 'decelerating',
    method: `${currentHours}h rate versus ${baselineHours}h rate`
  };
}

async function refreshAnsemAnalytics(env) {
  const mint = env.ANSEM_MINT || DEFAULT_ANSEM_MINT;
  const holderKey = `ansem:holders:${mint}`;
  const warnings = [];
  const [market, holders] = await Promise.all([
    fetchAnsemMarket(env),
    cacheGet(env, holderKey).then(value => value || cacheGet(env, `${holderKey}:last-success`))
  ]);
  let notableWallets = [];
  if (env.HELIUS_API_KEY) {
    notableWallets = await topTradersByVolume(
      env,
      [market.pairAddress, mint],
      mint,
      market.priceUsd
    ).catch(error => {
      logFailure('upstream notable wallets', error);
      warnings.push('notable wallets: temporarily unavailable');
      return [];
    });
  } else {
    warnings.push('Helius enrichment is not configured; market analytics remain available.');
  }
  const updatedAt = new Date().toISOString();
  const data = {
    mint,
    updatedAt,
    partial: !holders?.holderCount || !notableWallets.length || warnings.length > 0,
    market,
    holders: {
      count: Number.isFinite(Number(holders?.holderCount)) ? Number(holders.holderCount) : null,
      fundedTokenAccounts: Number.isFinite(Number(holders?.fundedTokenAccounts)) ? Number(holders.fundedTokenAccounts) : null,
      top10Percent: Number.isFinite(Number(holders?.top10Percent)) ? Number(holders.top10Percent) : null,
      largestAccountPercent: Number.isFinite(Number(holders?.largestHolderPercent)) ? Number(holders.largestHolderPercent) : null,
      scanComplete: holders?.complete === true,
      refreshedAt: holders?.refreshedAt || null
    },
    notableWallets,
    momentum: {
      volume: rateMomentum(market.volume1h, 1, market.volume24h, 24),
      transactions: rateMomentum(market.txCount1h, 1, market.txCount24h, 24)
    },
    sources: {
      holders: {
        name: 'Helius DAS getTokenAccounts',
        authority: 'Solana token-account state indexed by Helius',
        url: 'https://docs.helius.dev/solana-apis/digital-asset-standard-das-api/get-token-accounts'
      },
      liquidity: {
        name: 'DexScreener deepest Solana pair',
        authority: 'DexScreener pair liquidity',
        url: market.pairUrl || 'https://dexscreener.com/solana/' + mint
      },
      volume: {
        name: 'DexScreener pair windows',
        authority: 'DexScreener 1h/24h volume and transaction counts',
        url: market.pairUrl || 'https://dexscreener.com/solana/' + mint
      },
      notableWallets: {
        name: 'Solana confirmed transaction balance changes',
        authority: 'Helius Solana RPC parsed transactions',
        sample: 'Up to 24 recent signatures from the deepest liquidity pair, with mint-address fallback',
        window: '24h'
      }
    },
    warnings
  };
  return storeSnapshot(env, ANSEM_ANALYTICS_KEY, data);
}

async function ansemAnalytics(env, cors, ctx) {
  const fresh = await cacheGet(env, ANSEM_ANALYTICS_KEY + ':fresh');
  if (fresh) {
    const age = Date.now() - Date.parse(fresh.updatedAt || 0);
    if (age > DATA_POLICY.freshMs / 2) ctx?.waitUntil?.(refreshAnsemAnalytics(env).catch(() => null));
    return json({
      ok: true, data: fresh, updatedAt: fresh.updatedAt,
      meta: { cached: true, stale: false, partial: fresh.partial === true, policy: 'cache-first-swr' }
    }, 200, cors, 'public, max-age=60, stale-while-revalidate=600');
  }
  const lastKnown = await cacheGet(env, ANSEM_ANALYTICS_KEY + ':last-success');
  if (lastKnown) {
    ctx?.waitUntil?.(refreshAnsemAnalytics(env).catch(() => null));
    return json({
      ok: true, data: lastKnown, updatedAt: lastKnown.updatedAt,
      meta: { cached: true, stale: true, partial: lastKnown.partial === true, policy: 'cache-first-swr' }
    }, 200, cors, 'public, max-age=30, stale-while-revalidate=600');
  }
  try {
    const built = await refreshAnsemAnalytics(env);
    return json({
      ok: true, data: built, updatedAt: built.updatedAt,
      meta: { cached: false, stale: false, partial: built.partial === true, policy: 'cold-cache-fill' }
    }, 200, cors, 'public, max-age=30');
  } catch (error) {
    logFailure('upstream ansem analytics', error);
    return json({
      ok: false,
      error: { message: 'Analytics cache is warming; retry shortly.' },
      meta: { cached: false, stale: true, partial: true, policy: 'no-silent-placeholder' }
    }, 503, cors, 'no-store');
  }
}
async function scanFundedHolders(env, mint, warnings) {
  const limit = 1000;
  const maxPages = 40;
  const owners = new Set();
  const ownerBalances = new Map();
  let totalRawAmount = 0n;
  let fundedTokenAccounts = 0;
  let pagesScanned = 0;

  const snapshot = complete => {
    const balances = [...ownerBalances.values()].sort((left, right) => left === right ? 0 : left > right ? -1 : 1);
    const topRaw = count => balances.slice(0, count).reduce((sum, value) => sum + value, 0n);
    const percent = raw => totalRawAmount > 0n ? Number(raw * 100000n / totalRawAmount) / 1000 : null;
    return {
      holderCount: owners.size,
      fundedTokenAccounts,
      pagesScanned,
      complete,
      totalRawAmount: totalRawAmount.toString(),
      top10Percent: percent(topRaw(10)),
      largestHolderPercent: percent(topRaw(1))
    };
  };

  for (let page = 1; page <= maxPages; page++) {
    const result = await rpc(env, 'getTokenAccounts', {
      mint,
      page,
      limit,
      options: { showZeroBalance: false }
    });
    const accounts = Array.isArray(result?.token_accounts) ? result.token_accounts : [];
    pagesScanned = page;

    for (const account of accounts) {
      let rawAmount = 0n;
      try { rawAmount = BigInt(String(account?.amount ?? '0')); }
      catch (_) { rawAmount = BigInt(Math.max(0, Math.floor(Number(account?.amount || 0)))); }
      if (rawAmount <= 0n) continue;
      fundedTokenAccounts++;
      totalRawAmount += rawAmount;
      if (validAddress(account?.owner)) {
        owners.add(account.owner);
        ownerBalances.set(account.owner, (ownerBalances.get(account.owner) || 0n) + rawAmount);
      }
    }

    if (accounts.length < limit) {
      return snapshot(true);
    }
  }

  warnings.push(`holder scan reached its ${maxPages * limit} account safety ceiling`);
  return snapshot(false);
}

const HOLDER_CACHE_TTL_MS = DATA_POLICY.freshMs;
const HOLDER_STALE_TTL_MS = DATA_POLICY.staleMs;
async function refreshAnsemHolderCount(env) {
  requireHelius(env);
  const mint = env.ANSEM_MINT || DEFAULT_ANSEM_MINT;
  const warnings = [];
  const result = await scanFundedHolders(env, mint, warnings);
  if (!Number.isFinite(Number(result?.holderCount)) || Number(result.holderCount) < 1) throw new Error('Holder refresh returned no funded owners');
  const value = { ...result, method: 'Helius DAS getTokenAccounts', refreshedAt: new Date().toISOString(), warnings };
  await Promise.all([
    cachePut(env, `ansem:holders:${mint}`, value, HOLDER_CACHE_TTL_MS),
    cachePut(env, `ansem:holders:${mint}:last-success`, value, HOLDER_STALE_TTL_MS)
  ]);
  return value;
}

/* Small cryptographic helpers shared by Google ID-token sessions. */
function base64url(bytes) {
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decodeBase64url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url data');
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}
async function sign(value, secret) {
  if (!secret) throw new Error('Signing secret is not configured');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}
async function issueToken(payload, secret) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  return body + '.' + await sign(body, secret);
}
async function readSignedPayload(token, env) {
  if (!env.AUTH_SESSION_SECRET) throw Object.assign(new Error('Signed sessions are not configured'), { status: 503 });
  const encoded = String(token || '');
  if (!encoded || encoded.length > MAX_SIGNED_TOKEN_CHARS) throw Object.assign(new Error('Invalid session'), { status: 401 });
  const [body, signature, extra] = encoded.split('.');
  if (!body || !signature || extra) throw Object.assign(new Error('Invalid session'), { status: 401 });
  const expected = await sign(body, env.AUTH_SESSION_SECRET);
  if (!secureEqual(signature, expected)) throw Object.assign(new Error('Invalid session'), { status: 401 });
  let payload;
  try { payload = jsonFromBase64url(body); }
  catch (_) { throw Object.assign(new Error('Invalid session'), { status: 401 }); }
  const now = Date.now();
  if (!payload || typeof payload !== 'object' || !Number.isFinite(payload.exp) || !Number.isFinite(payload.iat)) {
    throw Object.assign(new Error('Invalid session'), { status: 401 });
  }
  if (payload.exp < now || payload.iat > now + 120_000) throw Object.assign(new Error('Session expired'), { status: 401 });
  return payload;
}
/* Google Identity Services: verify the ID token signature and claims on the Worker. */
let googleKeysCache = { expiresAt: 0, keys: [] };
function googleConfig(env, cors) {
  const configured = Boolean(env.GOOGLE_CLIENT_ID && env.AUTH_SESSION_SECRET);
  return json({ ok: true, data: { configured, clientId: configured ? env.GOOGLE_CLIENT_ID : null } }, 200, cors, 'public, max-age=60');
}
function jsonFromBase64url(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64url(value)));
}
function secureEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
async function googleKeys(forceRefresh = false) {
  if (!forceRefresh && googleKeysCache.expiresAt > Date.now() && googleKeysCache.keys.length) return googleKeysCache.keys;
  const response = await fetchWithPolicy('https://www.googleapis.com/oauth2/v3/certs', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Google signing keys are temporarily unavailable');
  const payload = await response.json();
  const maxAgeMatch = String(response.headers.get('Cache-Control') || '').match(/(?:^|,)\s*max-age=(\d+)/i);
  const maxAgeSeconds = Math.min(6 * 3600, Math.max(300, Number(maxAgeMatch?.[1]) || 2700));
  googleKeysCache = { keys: Array.isArray(payload.keys) ? payload.keys : [], expiresAt: Date.now() + maxAgeSeconds * 1000 };
  return googleKeysCache.keys;
}
async function validateGoogleIdToken(token, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.AUTH_SESSION_SECRET) throw httpError('Google sign in is not configured', 503, false);
  const credential = String(token || '');
  if (!credential || credential.length > MAX_SIGNED_TOKEN_CHARS) throw httpError('Invalid Google credential', 401, false);
  const parts = credential.split('.');
  if (parts.length !== 3) throw new Error('Invalid Google credential');
  const [headerPart, payloadPart, signaturePart] = parts;
  let header, claims;
  try {
    header = jsonFromBase64url(headerPart);
    claims = jsonFromBase64url(payloadPart);
  } catch (_) {
    throw httpError('Invalid Google credential', 401, false);
  }
  if (!header || typeof header !== 'object' || !claims || typeof claims !== 'object') {
    throw httpError('Invalid Google credential', 401, false);
  }
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Google credential');
  let jwk = (await googleKeys()).find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) jwk = (await googleKeys(true)).find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('Google signing key was not found');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64url(signaturePart), encoder.encode(headerPart + '.' + payloadPart));
  if (!verified) throw new Error('Google credential signature is invalid');
  const now = Math.floor(Date.now() / 1000), audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) throw new Error('Google credential issuer is invalid');
  if (!audience.includes(env.GOOGLE_CLIENT_ID)) throw new Error('Google credential is for a different app');
  if ((audience.length > 1 || claims.azp) && claims.azp !== env.GOOGLE_CLIENT_ID) throw new Error('Google authorized party is invalid');
  if (!Number.isFinite(claims.exp) || !Number.isFinite(claims.iat) || claims.exp < now - 30 || claims.iat > now + 120 || (claims.nbf && claims.nbf > now + 30)) throw new Error('Google credential has expired or is not active');
  if (!/^[^\s]{1,255}$/.test(String(claims.sub || '')) || claims.email_verified !== true) throw new Error('A verified Google account is required');
  const name = String(claims.name || '').slice(0, 120);
  const email = String(claims.email || '').slice(0, 254);
  const handle = String(email.split('@')[0] || name || 'bull').toLowerCase().replace(/[^a-z0-9_.-]/g, '').replace(/^[_.-]+|[_.-]+$/g, '').slice(0, 24) || 'bull';
  return { sub: claims.sub, name, email, handle, picture: /^https:\/\//.test(claims.picture || '') ? claims.picture : null, verifiedAt: new Date().toISOString() };
}
async function issueGoogleSession(user, env) {
  return issueToken({ purpose: 'google-session', ...user, iat: Date.now(), exp: Date.now() + 7 * 86400_000 }, env.AUTH_SESSION_SECRET);
}
async function readGoogleSession(token, env) {
  const payload = await readSignedPayload(token, env);
  if (payload.purpose !== 'google-session' || !payload.sub) throw Object.assign(new Error('Invalid Google session'), { status: 401 });
  return { sub: payload.sub, name: payload.name || '', email: payload.email || '', handle: payload.handle || 'bull', picture: payload.picture || null, verifiedAt: payload.verifiedAt || null };
}
async function verifyGoogle(request, env, cors) {
  const body = await readJsonBody(request);
  try {
    const user = await validateGoogleIdToken(body.credential, env);
    const sessionToken = await issueGoogleSession(user, env);
    return json({ ok: true, data: { user, sessionToken, expiresIn: 7 * 86400 } }, 200, cors);
  } catch (error) {
    if (Number(error?.status) === 503) throw error;
    return json({ ok: false, error: { message: 'Google sign-in could not be verified.' } }, 401, cors);
  }
}
async function googleSession(request, env, cors) {
  const match = String(request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ ok: false, error: { message: 'Session token required' } }, 401, cors);
  try { return json({ ok: true, data: await readGoogleSession(match[1], env) }, 200, cors); }
  catch (_) { return json({ ok: false, error: { message: 'Session is invalid or expired' } }, 401, cors); }
}
async function playerSession(env, cors) {
  if (!env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Player sessions are not configured' } }, 503, cors);
  const accountId = await sha256Hex('player:' + crypto.randomUUID());
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 365 * 86400_000;
  const sessionToken = await issueToken({ purpose: 'player-session', accountId, iat: issuedAt, exp: expiresAt }, env.AUTH_SESSION_SECRET);
  return json({ ok: true, data: { sessionToken, expiresAt } }, 200, cors);
}
function bearerToken(request) {
  return String(request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] || '';
}
async function authenticatedAccount(request, env) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error('A signed player session is required'), { status: 401 });
  const payload = await readSignedPayload(token, env);
  if (payload.purpose === 'google-session' && payload.sub) {
    return { id: await sha256Hex('google:' + payload.sub), kind: 'google' };
  }
  if (payload.purpose === 'player-session' && /^[a-f0-9]{64}$/.test(String(payload.accountId || ''))) {
    return { id: payload.accountId, kind: 'anonymous' };
  }
  throw Object.assign(new Error('Unsupported player session'), { status: 401 });
}

function collectionMatch(asset) {
  return Array.isArray(asset?.grouping) && asset.grouping.some(group => group?.group_key === 'collection' && group?.group_value === BULL_PEN_COLLECTION);
}
async function magicEden(path, params = {}) {
  const url = new URL('https://api-mainnet.magiceden.dev' + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetchWithPolicy(url, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 120, cacheEverything: true } });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload == null) throw new Error(`Magic Eden HTTP ${response.status}`);
  return payload;
}
function salesWindow(sales, seconds) {
  const cutoff = Math.floor(Date.now() / 1000) - seconds;
  const included = sales.filter(item => Number(item.blockTime || 0) >= cutoff);
  const prices = included.map(item => Number(item.price || 0)).filter(value => Number.isFinite(value) && value > 0);
  const volumeSol = prices.reduce((sum, value) => sum + value, 0);
  return {
    sales: included.length,
    volumeSol: Number(volumeSol.toFixed(4)),
    averagePriceSol: prices.length ? Number((volumeSol / prices.length).toFixed(4)) : null,
    highPriceSol: prices.length ? Math.max(...prices) : null,
    lowPriceSol: prices.length ? Math.min(...prices) : null
  };
}
async function buildNftCollectionStats(env) {
  const cacheKey = 'nft-collection-stats:' + BULL_PEN_SYMBOL;
  const warnings = [];
  const [marketStats, salesResult] = await Promise.all([
    settled(magicEden(`/v2/collections/${BULL_PEN_SYMBOL}/stats`, { listingAggMode: true }), {}, warnings, 'Magic Eden market stats'),
    (async () => {
      const pageSize = 500, maxPages = 8, cutoff = Math.floor(Date.now() / 1000) - 30 * 86400;
      const sales = [];
      let complete30d = false;
      for (let page = 0; page < maxPages; page++) {
        const batch = await magicEden(`/v2/collections/${BULL_PEN_SYMBOL}/activities`, { offset: page * pageSize, limit: pageSize, type: 'buyNow' });
        const list = Array.isArray(batch) ? batch : [];
        sales.push(...list);
        const oldest = list.reduce((value, item) => Math.min(value, Number(item.blockTime || Infinity)), Infinity);
        if (list.length < pageSize || oldest <= cutoff) { complete30d = true; break; }
      }
      const unique = [...new Map(sales.map(item => [`${item.signature}:${item.tokenMint || ''}`, item])).values()];
      return { sales: unique, complete30d };
    })().catch(error => {
      logFailure('upstream Magic Eden sale history', error);
      warnings.push('Magic Eden sale history: temporarily unavailable');
      return { sales: [], complete30d: false };
    })
  ]);
  const data = {
    collection: BULL_PEN_COLLECTION,
    symbol: BULL_PEN_SYMBOL,
    floorPriceSol: Number.isFinite(Number(marketStats?.floorPrice)) ? Number(marketStats.floorPrice) / 1e9 : null,
    listedCount: Number.isFinite(Number(marketStats?.listedCount)) ? Number(marketStats.listedCount) : null,
    averagePrice24hSol: Number.isFinite(Number(marketStats?.avgPrice24hr)) ? Number(marketStats.avgPrice24hr) / 1e9 : null,
    windows: {
      '1d': salesWindow(salesResult.sales, 86400),
      '7d': salesWindow(salesResult.sales, 7 * 86400),
      '30d': salesWindow(salesResult.sales, 30 * 86400)
    },
    complete30d: salesResult.complete30d,
    salesAnalyzed: salesResult.sales.length,
    source: 'Magic Eden public Solana API',
    warnings,
    updatedAt: new Date().toISOString()
  };
  const hasMarket = data.floorPriceSol != null || data.listedCount != null || data.averagePrice24hSol != null;
  if (!hasMarket && !data.salesAnalyzed && warnings.length) throw new Error(warnings.join('; '));
  return storeSnapshot(env, cacheKey, data, 5 * 60_000);
}
async function nftCollectionStats(env, cors, ctx) {
  const cacheKey = 'nft-collection-stats:' + BULL_PEN_SYMBOL;
  const fresh = await cacheGet(env, cacheKey + ':fresh') || await cacheGet(env, cacheKey); // one-release key migration
  if (fresh) return json({ ok: true, data: fresh, cached: true, stale: false, updatedAt: fresh.updatedAt }, 200, cors, 'public, max-age=60');
  const lastKnown = await cacheGet(env, cacheKey + ':last-success');
  if (lastKnown) {
    ctx?.waitUntil?.(buildNftCollectionStats(env).catch(() => null));
    const stale = { ...lastKnown, stale: true };
    return json({ ok: true, data: stale, cached: true, stale: true, updatedAt: stale.updatedAt }, 200, cors, 'public, max-age=30, stale-while-revalidate=300');
  }
  const data = await buildNftCollectionStats(env);
  return json({ ok: true, data, cached: false, stale: false, updatedAt: data.updatedAt }, 200, cors, 'public, max-age=60');
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
async function fetchPublicJson(url, timeoutMs = 9000) {
    const response = await fetchWithPolicy(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'A-Bulls-App-Analytics/' + VERSION },
      cf: { cacheEverything: true, cacheTtl: 60 }
    }, { timeoutMs });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload == null) throw new Error(`Upstream HTTP ${response.status}`);
    return payload;
}
async function allBullPenCollectionAssets(env) {
  const assets = [];
  const pageSize = 1000;
  for (let page = 1; page <= 50; page++) {
    const result = await rpc(env, 'getAssetsByGroup', {
      groupKey: 'collection',
      groupValue: BULL_PEN_COLLECTION,
      page,
      limit: pageSize,
      displayOptions: { showCollectionMetadata: true }
    });
    const items = Array.isArray(result?.items) ? result.items : [];
    assets.push(...items.filter(collectionMatch));
    if (items.length < pageSize || (Number.isFinite(Number(result?.total)) && assets.length >= Number(result.total))) break;
  }
  return [...new Map(assets.filter(asset => validAddress(asset?.id)).map(asset => [asset.id, asset])).values()];
}
function kimjiStakeSignal(asset, configuredAuthority = '') {
  const ownership = asset?.ownership && typeof asset.ownership === 'object' ? asset.ownership : {};
  const authority = String(configuredAuthority || '').trim();
  if (authority) {
    const candidates = [ownership.owner, ownership.delegate, ownership.delegated_to, ownership.authority]
      .map(value => String(value || '').trim()).filter(Boolean);
    if (candidates.includes(authority)) return true;
  }
  // Kimji's non-custodial pool freezes an active NFT position on-chain. DAS's
  // indexed `ownership.frozen` flag is therefore the authoritative public state
  // signal when no explicit Kimji authority is configured. No wallet connect,
  // signature, transaction, or private Kimji integration is used here.
  return ownership.frozen === true;
}
async function kimjiBullPenStats(env) {
  requireHelius(env);
  const cached = await cacheGet(env, 'nft:kimji-staking:' + BULL_PEN_COLLECTION);
  if (cached) return { ...cached, cached: true };
  const assets = await allBullPenCollectionAssets(env);
  const authority = String(env.KIMJI_STAKING_AUTHORITY || '').trim();
  const staked = assets.filter(asset => kimjiStakeSignal(asset, authority)).length;
  const data = {
    totalStaked: staked,
    collectionAssetsIndexed: assets.length,
    source: 'Kimji public pool state verified on Solana',
    sourceUrl: KIMJI_LIVE,
    method: authority ? 'kimji-authority-or-onchain-freeze' : 'onchain-freeze',
    updatedAt: new Date().toISOString()
  };
  await cachePut(env, 'nft:kimji-staking:' + BULL_PEN_COLLECTION, data, 5 * 60_000);
  return data;
}
async function theBullsBuybackStats(env) {
  const cached = await cacheGet(env, 'nft:the-bulls-buybacks');
  if (cached) return { ...cached, cached: true };
  const stats = await fetchPublicJson(THE_BULLS_API + '/api/stats');
  const data = {
    solTwap: finiteOrNull(stats?.solBuyback),
    ansemBought: finiteOrNull(stats?.ansemBought),
    currentUsdValue: finiteOrNull(stats?.ansemCurrentUsdValue ?? stats?.ansemValueUsd) ?? ((finiteOrNull(stats?.ansemBought) || 0) * (finiteOrNull(stats?.avgBuybackUsd) || 0)),
    totalBuybacksToDate: finiteOrNull(stats?.totalBuybacks ?? stats?.buybackCount),
    source: 'thebulls.live public buyback feed',
    sourceUrl: THE_BULLS_LIVE,
    updatedAt: new Date().toISOString()
  };
  await cachePut(env, 'nft:the-bulls-buybacks', data, 60_000);
  return data;
}
async function buildNftEcosystemStats(env) {
  const [kimjiResult, buybackResult] = await Promise.allSettled([
    kimjiBullPenStats(env),
    theBullsBuybackStats(env)
  ]);
  const warnings = [];
  const kimji = kimjiResult.status === 'fulfilled' ? kimjiResult.value : null;
  const buybacks = buybackResult.status === 'fulfilled' ? buybackResult.value : null;
  if (!kimji) warnings.push('Kimji staking data is temporarily unavailable.');
  if (!buybacks) warnings.push('thebulls.live buyback data is temporarily unavailable.');
  if (!kimji && !buybacks) throw new Error(warnings.join(' '));
  const data = { collection: BULL_PEN_COLLECTION, kimji, buybacks, warnings, updatedAt: new Date().toISOString(), readOnly: true };
  if (kimji && buybacks) return storeSnapshot(env, 'nft:ecosystem-stats', data, 60_000);
  // Keep a partial response briefly without replacing a complete last-success.
  await cachePut(env, 'nft:ecosystem-stats:fresh', data, 15_000);
  return data;
}
async function nftEcosystemStats(env, cors, ctx) {
  const cacheKey = 'nft:ecosystem-stats';
  const fresh = await cacheGet(env, cacheKey + ':fresh') || await cacheGet(env, cacheKey); // one-release key migration
  if (fresh) return json({ ok: true, data: fresh, cached: true, stale: false, updatedAt: fresh.updatedAt }, 200, cors, 'public, max-age=30');
  const lastKnown = await cacheGet(env, cacheKey + ':last-success');
  if (lastKnown) {
    ctx?.waitUntil?.(buildNftEcosystemStats(env).catch(() => null));
    const stale = { ...lastKnown, stale: true };
    return json({ ok: true, data: stale, cached: true, stale: true, updatedAt: stale.updatedAt }, 200, cors, 'public, max-age=20, stale-while-revalidate=120');
  }
  const data = await buildNftEcosystemStats(env);
  return json({ ok: true, data, cached: false, stale: false, updatedAt: data.updatedAt }, 200, cors, 'public, max-age=30');
}
