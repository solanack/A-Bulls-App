/**
 * A Bulls App API Worker v8.1.1
 * Secrets: HELIUS_API_KEY, GOOGLE_CLIENT_ID, AUTH_SESSION_SECRET
 * Vars: ALLOWED_ORIGINS, ANSEM_MINT, COINGECKO_API_KEY (optional),
 *       KIMJI_STAKING_AUTHORITY (optional)
 * Optional bindings: RATE_LIMITER (Cloudflare Rate Limiting),
 *                    ANALYTICS_CACHE (Cloudflare KV),
 *                    LEADERBOARD_DB / BULL_INTELLIGENCE_DB (Cloudflare D1)
 *
 * Public analytics are cache-first and refreshed in the background. Google
 * Sign-In remains the identity system; this Worker has no payment surface.
 */
const VERSION = '8.2.0';
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
  'GET /api/leaderboard/top': Object.freeze({ group: 'leaderboard', access: 'public', rate: 75, handle: ({ url, env, cors }) => leaderboardTop(url, env, cors) }),
  'POST /api/leaderboard/challenge': Object.freeze({ group: 'leaderboard', access: 'origin', rate: 30, handle: ({ request, env, cors }) => leaderboardChallenge(request, env, cors) }),
  'POST /api/leaderboard/submit': Object.freeze({ group: 'leaderboard', access: 'origin', rate: 30, handle: ({ request, env, cors }) => leaderboardSubmit(request, env, cors) }),
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
  async scheduled() {}
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
    feesSol += Number(tx.fee || 0) / 1_000_000_000;
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
      feeSol: Number(tx.fee || 0) / 1_000_000_000,
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
        if (intelligenceIndexEnabled(env)) {
          try {
            await indexWalletActivityObservations(env, address, filtered, range);
          } catch (indexError) {
            logFailure('bull intelligence indexing', indexError);
          }
        }
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



// ---------------------------------------------------------------------------
// Bull Intelligence Engine v1 — observed-index foundation
// Public-address only. No signing, custody, execution, or identity inference.
// ---------------------------------------------------------------------------
function intelligenceDb(env) {
  const db = env.BULL_INTELLIGENCE_DB || env.LEADERBOARD_DB || env.DB;
  return db && typeof db.prepare === 'function' ? db : null;
}
function intelligenceIndexEnabled(env) {
  return String(env.BULL_INDEXER_ENABLED || '').toLowerCase() === 'true' && Boolean(intelligenceDb(env));
}
function intelligenceArchivalEnabled(env) {
  return String(env.BULL_ARCHIVAL_ENABLED || '').toLowerCase() === 'true' && Boolean(intelligenceDb(env));
}
function intelligenceNftIndexEnabled(env) {
  return String(env.BULL_NFT_INDEXER_ENABLED || '').toLowerCase() === 'true' && Boolean(intelligenceDb(env));
}
function intelligenceCapabilities(env) {
  const db = Boolean(intelligenceDb(env));
  const indexer = intelligenceIndexEnabled(env);
  const archival = intelligenceArchivalEnabled(env);
  return {
    version: 1,
    readOnly: true,
    publicAddressOnly: true,
    d1: db,
    indexer,
    archival,
    features: {
      bullDna: { state: 'ready', source: 'wallet-analytics' },
      walletMuseum: { state: 'ready', source: 'wallet-analytics' },
      walletRivalries: { state: 'ready', source: 'wallet-analytics' },
      ghostLedger: { state: 'ready', source: 'decoded-flow' },
      activityConstellation: { state: 'limited', source: 'decoded-flow' },
      timeMachine: { state: indexer && db ? 'limited' : 'index-required', source: 'normalized-events' },
      ghostPortfolio: { state: archival ? 'limited' : 'index-required', source: 'normalized-events+historical-prices' },
      parallelUniverse: { state: archival ? 'limited' : 'index-required', source: 'normalized-events+historical-prices' },
      radar: { state: indexer ? 'limited' : 'index-required', source: 'observed-cohorts' },
      weather: { state: indexer ? 'limited' : 'index-required', source: 'observed-aggregates' },
      deepConstellation: { state: indexer ? 'limited' : 'index-required', source: 'relationship-edges' },
      nftMemory: { state: intelligenceNftIndexEnabled(env) ? 'limited' : 'index-required', source: 'normalized-nft-events' }
    },
    limitations: archival
      ? ['Indexed coverage grows from observed public activity; completeness depends on the configured archival source.']
      : ['Current free-tier mode indexes only public history returned by existing wallet analytics. Full archival history is not claimed.']
  };
}
function intelligenceCapabilitiesRoute(env, cors) {
  return json({ ok: true, capabilities: intelligenceCapabilities(env), generatedAt: Date.now() }, 200, cors, 'no-store');
}
function normalizeIntelligenceTx(address, tx) {
  const changes = Array.isArray(tx?.balanceChanges) ? tx.balanceChanges.filter(change => Number(change?.amount || 0) !== 0) : [];
  const mints = new Set(changes.map(change => String(change?.mint || '')).filter(Boolean));
  const hasIn = changes.some(change => Number(change?.amount || 0) > 0);
  const hasOut = changes.some(change => Number(change?.amount || 0) < 0);
  const eventClass = hasIn && hasOut && mints.size >= 2 ? 'swap-like' : 'transfer';
  const timestamp = Math.max(0, Math.round(Number(tx?.timestamp || tx?.blockTime || 0)));
  const signature = String(tx?.signature || '');
  const feeLamports = Math.max(0, Math.round(Number(tx?.fee || 0)));
  const rows = [];
  for (const change of changes) {
    const mint = String(change?.mint || '');
    if (!mint) continue;
    rows.push({
      signature,
      slot: Math.max(0, Math.round(Number(tx?.slot || 0))),
      blockTime: timestamp,
      wallet: address,
      counterparty: '',
      programId: '',
      mint,
      collection: '',
      eventClass,
      solDelta: SOL_MINTS.has(mint) ? Number(change?.amount || 0) : 0,
      tokenDelta: Number(change?.amount || 0),
      feeLamports,
      priceUsd: null,
      source: 'helius-wallet-history',
      confidence: tx?.error ? 0 : 1,
      decoderVersion: 'wallet-history-v1'
    });
  }
  if (!rows.length && signature) {
    rows.push({ signature, slot: Math.max(0, Math.round(Number(tx?.slot || 0))), blockTime: timestamp, wallet: address, counterparty: '', programId: '', mint: '', collection: '', eventClass: 'unknown', solDelta: 0, tokenDelta: 0, feeLamports, priceUsd: null, source: 'helius-wallet-history', confidence: tx?.error ? 0 : 1, decoderVersion: 'wallet-history-v1' });
  }
  return rows;
}
async function indexWalletActivityObservations(env, address, transactions, range) {
  const db = intelligenceDb(env);
  if (!db || !intelligenceIndexEnabled(env)) return { accepted: 0, state: 'disabled' };
  const rows = transactions.flatMap(tx => normalizeIntelligenceTx(address, tx));
  if (!rows.length) return { accepted: 0, state: 'empty' };
  const statements = rows.map(row => db.prepare(`
    INSERT OR IGNORE INTO bull_wallet_events
      (signature, slot, block_time, wallet, counterparty, program_id, mint, collection,
       event_class, sol_delta, token_delta, fee_lamports, price_usd, source, confidence, decoder_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(row.signature, row.slot || null, row.blockTime || null, row.wallet,
    row.counterparty || null, row.programId || null, row.mint || '', row.collection || null,
    row.eventClass, row.solDelta, row.tokenDelta, row.feeLamports, row.priceUsd,
    row.source, row.confidence, row.decoderVersion));
  if (typeof db.batch === 'function') {
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
  } else {
    for (const stmt of statements) await stmt.run();
  }
  await rebuildIntelligenceWindow(db, address, range, rows, env);
  await rebuildIntelligenceCohorts(db, rows);
  await refreshObservedIntelligenceAggregates(db);
  return { accepted: rows.length, state: 'indexed' };
}
async function rebuildIntelligenceWindow(db, address, range, rows, env) {
  const times = rows.map(row => row.blockTime).filter(Boolean);
  const windowStart = times.length ? Math.min(...times) : Math.floor(Date.now() / 1000);
  const windowEnd = times.length ? Math.max(...times) : windowStart;
  const signatures = new Set(rows.map(row => row.signature).filter(Boolean));
  const days = new Set(rows.filter(row => row.blockTime).map(row => new Date(row.blockTime * 1000).toISOString().slice(0, 10)));
  const mints = new Set(rows.map(row => row.mint).filter(Boolean));
  const swaps = new Set(rows.filter(row => row.eventClass === 'swap-like').map(row => row.signature).filter(Boolean)).size;
  const failures = new Set(rows.filter(row => row.confidence <= 0).map(row => row.signature).filter(Boolean)).size;
  const solIn = rows.filter(row => row.solDelta > 0).reduce((sum, row) => sum + row.solDelta, 0);
  const solOut = rows.filter(row => row.solDelta < 0).reduce((sum, row) => sum + Math.abs(row.solDelta), 0);
  const feesSol = [...new Map(rows.filter(row => row.signature).map(row => [row.signature, row.feeLamports])).values()].reduce((sum, fee) => sum + fee, 0) / 1e9;
  await db.prepare(`
    INSERT INTO bull_wallet_windows
      (wallet, window_key, window_start, window_end, tx_count, active_days, swaps,
       unique_mints, failures, sol_in, sol_out, fees_sol, payload_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(wallet, window_key, window_start) DO UPDATE SET
      window_end=excluded.window_end, tx_count=excluded.tx_count, active_days=excluded.active_days,
      swaps=excluded.swaps, unique_mints=excluded.unique_mints, failures=excluded.failures,
      sol_in=excluded.sol_in, sol_out=excluded.sol_out, fees_sol=excluded.fees_sol,
      payload_json=excluded.payload_json, updated_at=unixepoch()
  `).bind(address, range || 'observed', windowStart, windowEnd, signatures.size || rows.length,
    days.size, swaps, mints.size, failures, solIn, solOut, feesSol,
    JSON.stringify({ coverage: 'observed-wallet-history', archival: intelligenceArchivalEnabled(env) })).run();
}
async function rebuildIntelligenceCohorts(db, rows) {
  const bucketSeconds = 3600;
  const map = new Map();
  for (const row of rows) {
    if (!row.mint || !row.wallet || !row.blockTime) continue;
    const bucketStart = Math.floor(row.blockTime / bucketSeconds) * bucketSeconds;
    const key = `${row.mint}|${bucketStart}`;
    const item = map.get(key) || { mint: row.mint, bucketStart, wallet: row.wallet, inbound: 0, outbound: 0, eventCount: 0, lastSeen: 0 };
    if (row.tokenDelta > 0) item.inbound = 1;
    if (row.tokenDelta < 0) item.outbound = 1;
    item.eventCount += 1;
    item.lastSeen = Math.max(item.lastSeen, row.blockTime);
    map.set(key, item);
  }
  for (const item of map.values()) {
    await db.prepare(`
      INSERT INTO bull_token_wallet_buckets
        (mint, bucket_start, bucket_seconds, wallet, inbound, outbound, event_count, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(mint, bucket_start, bucket_seconds, wallet) DO UPDATE SET
        inbound=MAX(inbound, excluded.inbound), outbound=MAX(outbound, excluded.outbound),
        event_count=MAX(event_count, excluded.event_count), last_seen=MAX(last_seen, excluded.last_seen)
    `).bind(item.mint, item.bucketStart, bucketSeconds, item.wallet, item.inbound, item.outbound, item.eventCount, item.lastSeen).run();
    await db.prepare(`
      INSERT INTO bull_token_cohorts
        (mint, bucket_start, bucket_seconds, unique_wallets, inbound_wallets, outbound_wallets,
         long_duration_wallets, new_wallets, payload_json, updated_at)
      SELECT ?, ?, ?, COUNT(*), SUM(inbound), SUM(outbound), 0, 0,
             json_object('coverage','observed-wallets'), unixepoch()
      FROM bull_token_wallet_buckets
      WHERE mint=? AND bucket_start=? AND bucket_seconds=?
      ON CONFLICT(mint, bucket_start, bucket_seconds) DO UPDATE SET
        unique_wallets=excluded.unique_wallets, inbound_wallets=excluded.inbound_wallets,
        outbound_wallets=excluded.outbound_wallets, payload_json=excluded.payload_json,
        updated_at=unixepoch()
    `).bind(item.mint, item.bucketStart, bucketSeconds, item.mint, item.bucketStart, bucketSeconds).run();
  }
}
function intelligenceRatioScore(current, baseline, neutral = 35, scale = 42) {
  const c = Number(current || 0), b = Number(baseline || 0);
  if (b <= 0) return c > 0 ? Math.min(100, neutral + scale) : neutral;
  return Math.max(0, Math.min(100, neutral + (c / b - 1) * scale));
}
async function refreshObservedIntelligenceAggregates(db) {
  const currentBucket = Math.floor(Date.now() / 3600000) * 3600;
  const current = await db.prepare(`
    SELECT COALESCE(SUM(unique_wallets),0) unique_wallets,
           COALESCE(SUM(inbound_wallets),0) inbound_wallets,
           COALESCE(SUM(outbound_wallets),0) outbound_wallets
    FROM bull_token_cohorts WHERE bucket_start >= ?
  `).bind(currentBucket).first().catch(() => null);
  const baseline = await db.prepare(`
    SELECT COALESCE(AVG(unique_wallets),0) unique_wallets,
           COALESCE(AVG(inbound_wallets),0) inbound_wallets,
           COALESCE(AVG(outbound_wallets),0) outbound_wallets
    FROM bull_token_cohorts WHERE bucket_start >= ? AND bucket_start < ?
  `).bind(currentBucket - 24 * 3600, currentBucket).first().catch(() => null);
  const windows = await db.prepare(`
    SELECT COALESCE(SUM(tx_count),0) tx_count, COALESCE(SUM(swaps),0) swaps,
           COALESCE(SUM(unique_mints),0) unique_mints
    FROM bull_wallet_windows WHERE window_end >= ?
  `).bind(currentBucket - 3600).first().catch(() => null);
  const nftWindow = await db.prepare(`
    SELECT COALESCE(SUM(event_count),0) event_count, COALESCE(SUM(active_wallets),0) active_wallets
    FROM bull_nft_collection_cohorts WHERE bucket_start >= ?
  `).bind(currentBucket - 3600).first().catch(() => null);
  const uniqueWallets = Number(current?.unique_wallets || 0);
  const inbound = Number(current?.inbound_wallets || 0);
  const outbound = Number(current?.outbound_wallets || 0);
  const convergence = intelligenceRatioScore(uniqueWallets, Number(baseline?.unique_wallets || 0));
  const accumulation = intelligenceRatioScore(inbound, Number(baseline?.inbound_wallets || 0));
  const distribution = intelligenceRatioScore(outbound, Number(baseline?.outbound_wallets || 0));
  const severity = Math.max(convergence, accumulation, distribution) * Math.min(1, Math.max(.25, uniqueWallets / 25));
  if (uniqueWallets >= 2 && severity >= 55) {
    const ranked = [['wallet-convergence', convergence], ['inbound-convergence', accumulation], ['outbound-distribution', distribution]].sort((a,b)=>b[1]-a[1]);
    await db.prepare(`
      INSERT INTO bull_radar_anomalies
        (anomaly_key, scope_type, scope_value, observed_at, severity, baseline_value,
         observed_value, sample_size, evidence_json, expires_at)
      VALUES (?, 'chain-observed', NULL, ?, ?, ?, ?, ?, ?, ?)
    `).bind(ranked[0][0], currentBucket, Number(severity.toFixed(2)), Number(baseline?.unique_wallets || 0), uniqueWallets,
      uniqueWallets, JSON.stringify({ convergence, accumulation, distribution, coverage: 'observed-wallets' }), currentBucket + 7200).run().catch(() => null);
  }
  const txCount = Number(windows?.tx_count || 0);
  const swapCount = Number(windows?.swaps || 0);
  const nftEventCount = Number(nftWindow?.event_count || 0);
  const nftActiveWallets = Number(nftWindow?.active_wallets || 0);
  const activity = Math.max(0, Math.min(100, Math.log10(Math.max(1, txCount)) * 28));
  const rotation = txCount ? Math.max(0, Math.min(100, swapCount / txCount * 140)) : 0;
  const nftActivity = Math.max(0, Math.min(100, Math.log10(Math.max(1, nftEventCount + nftActiveWallets)) * 30));
  let regime = 'clear';
  if (activity <= 25) regime = 'calm';
  else if (rotation >= 72 && activity >= 55) regime = 'migration';
  else if (activity >= 78) regime = 'heat-wave';
  else if (convergence >= 72 && activity >= 45) regime = 'whale-migration';
  await db.prepare(`
    INSERT INTO bull_chain_weather
      (bucket_start, bucket_seconds, regime, activity_score, volatility_score,
       concentration_score, rotation_score, convergence_score, nft_activity_score,
       evidence_json, created_at)
    VALUES (?, 3600, ?, ?, NULL, NULL, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(bucket_start) DO UPDATE SET regime=excluded.regime,
      activity_score=excluded.activity_score, rotation_score=excluded.rotation_score,
      convergence_score=excluded.convergence_score, evidence_json=excluded.evidence_json
  `).bind(currentBucket, regime, activity, rotation, convergence, nftActivity,
    JSON.stringify({ txCount, swapCount, uniqueWallets, nftEventCount, nftActiveWallets, coverage: 'observed-wallets', forecast: false })).run().catch(() => null);
}
async function intelligenceWalletSummary(request, env, cors) {
  const body = await readJsonBody(request, 4096);
  const address = String(body.address || body.wallet || '').trim();
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  const db = intelligenceDb(env);
  if (!db || !intelligenceIndexEnabled(env)) return json({ ok: true, data: { address, indexed: null, relationships: [], capabilities: intelligenceCapabilities(env), limitations: ['Observed indexing is not enabled yet.'] } }, 200, cors, 'no-store');
  const window = await db.prepare(`SELECT * FROM bull_wallet_windows WHERE wallet=? ORDER BY window_end DESC LIMIT 1`).bind(address).first().catch(() => null);
  const bounds = await db.prepare(`SELECT COUNT(*) event_count, MIN(block_time) first_seen, MAX(block_time) last_seen FROM bull_wallet_events WHERE wallet=?`).bind(address).first().catch(() => null);
  const relationships = await db.prepare(`SELECT * FROM bull_wallet_relationships WHERE wallet_a=? OR wallet_b=? ORDER BY last_seen DESC LIMIT 40`).bind(address,address).all().then(x=>x?.results||[]).catch(()=>[]);
  return json({ ok: true, data: { address, indexed: { window, eventCount: Number(bounds?.event_count || 0), firstSeen: bounds?.first_seen || null, lastSeen: bounds?.last_seen || null, coverage: 'indexed-observed' }, relationships, capabilities: intelligenceCapabilities(env), limitations: intelligenceArchivalEnabled(env) ? [] : ['Indexed history contains only observations returned by the current data tier.'] } }, 200, cors, 'no-store');
}
async function intelligenceTimeMachine(request, env, cors) {
  const body = await readJsonBody(request, 4096);
  const address = String(body.address || body.wallet || '').trim();
  const timestamp = Math.max(0, Math.floor(Number(body.timestamp || 0)));
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  if (!timestamp) return json({ ok: false, error: { message: 'A historical timestamp is required' } }, 400, cors);
  const db = intelligenceDb(env);
  if (!db || !intelligenceIndexEnabled(env)) return json({ ok: true, state: 'index-required', data: null, capabilities: intelligenceCapabilities(env) }, 200, cors, 'no-store');
  const rows = await db.prepare(`
    SELECT signature, slot, block_time, mint, event_class, sol_delta, token_delta,
           fee_lamports, price_usd, source, confidence
    FROM bull_wallet_events WHERE wallet=? AND block_time<=?
    ORDER BY block_time ASC, id ASC LIMIT 5000
  `).bind(address, timestamp).all().then(x=>x?.results||[]).catch(()=>[]);
  const positions = new Map(); let solDelta = 0, fees = 0;
  const seenFees = new Set();
  for (const row of rows) {
    solDelta += Number(row.sol_delta || 0);
    if (row.signature && !seenFees.has(row.signature)) { fees += Number(row.fee_lamports || 0); seenFees.add(row.signature); }
    const mint = String(row.mint || ''); if (!mint) continue;
    const p = positions.get(mint) || { mint, quantityDelta: 0, events: 0, lastPriceUsd: null, lastSeen: null };
    p.quantityDelta += Number(row.token_delta || 0); p.events += 1;
    if (Number(row.price_usd) > 0) p.lastPriceUsd = Number(row.price_usd);
    if (row.block_time) p.lastSeen = Number(row.block_time);
    positions.set(mint,p);
  }
  const bounds = await db.prepare(`SELECT MIN(block_time) first_seen, MAX(block_time) last_seen, COUNT(*) event_count FROM bull_wallet_events WHERE wallet=?`).bind(address).first().catch(()=>null);
  return json({ ok: true, state: 'limited', data: { address, timestamp, eventCount: rows.length, solBalanceDelta: solDelta, feesSol: fees/1e9, positions: [...positions.values()].filter(x=>Math.abs(x.quantityDelta)>1e-12).sort((a,b)=>Math.abs(b.quantityDelta)-Math.abs(a.quantityDelta)), coverage: { source: 'indexed-observed', complete: intelligenceArchivalEnabled(env), firstIndexedAt: bounds?.first_seen || null, lastIndexedAt: bounds?.last_seen || null, indexedEvents: Number(bounds?.event_count || 0), statement: intelligenceArchivalEnabled(env) ? 'Reconstruction uses the configured indexed archival dataset.' : 'Reconstruction uses only public wallet observations indexed by A Bulls App; it is not claimed to be complete wallet history.' } } }, 200, cors, 'no-store');
}
async function intelligenceParallelUniverse(request, env, cors) {
  const body = await readJsonBody(request, 4096);
  const address = String(body.address || body.wallet || '').trim();
  const holdDays = Math.max(1, Math.min(3650, Math.round(Number(body.holdDays || 30))));
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  const db = intelligenceDb(env);
  if (!db || !intelligenceIndexEnabled(env)) return json({ ok: true, state: 'index-required', simulation: null, capabilities: intelligenceCapabilities(env) }, 200, cors, 'no-store');
  const rows = await db.prepare(`SELECT block_time, mint, event_class, token_delta, price_usd FROM bull_wallet_events WHERE wallet=? AND price_usd IS NOT NULL AND price_usd>0 ORDER BY block_time ASC`).bind(address).all().then(x=>x?.results||[]).catch(()=>[]);
  const buys = rows.filter(r=>r.event_class==='swap-like' && Number(r.token_delta)>0 && Number(r.price_usd)>0);
  if (!buys.length) return json({ ok: true, state: 'price-history-required', simulation: null, coverage: { complete: false, statement: 'No defensible historical price observations are indexed for swap-like entries yet.' }, capabilities: intelligenceCapabilities(env) }, 200, cors, 'no-store');
  const byMint = new Map();
  rows.forEach(r=>{ const m=String(r.mint||''); if(!m) return; if(!byMint.has(m)) byMint.set(m,[]); byMint.get(m).push({time:Number(r.block_time||0),price:Number(r.price_usd||0)}); });
  const legs=[]; let entryValue=0, exitValue=0, priced=0;
  for(const buy of buys){ const qty=Number(buy.token_delta); const entry=qty*Number(buy.price_usd); const target=Number(buy.block_time)+holdDays*86400; const exit=(byMint.get(String(buy.mint))||[]).find(p=>p.time>=target && p.price>0); entryValue+=entry; if(!exit){legs.push({mint:buy.mint,quantity:qty,entryTime:buy.block_time,entryPriceUsd:buy.price_usd,targetTime:target,exitPriceUsd:null,pnlUsd:null});continue;} const out=qty*exit.price; exitValue+=out; priced++; legs.push({mint:buy.mint,quantity:qty,entryTime:buy.block_time,entryPriceUsd:Number(buy.price_usd),targetTime:target,exitTime:exit.time,exitPriceUsd:exit.price,pnlUsd:out-entry}); }
  const pricedEntry=legs.filter(x=>x.pnlUsd!=null).reduce((sum,x)=>sum+x.quantity*x.entryPriceUsd,0);
  return json({ ok:true, state: priced ? 'limited' : 'price-history-required', simulation:{ rule:{type:'fixed-hold',holdDays}, buyLegs:buys.length, pricedLegs:priced, missingExitPrice:buys.length-priced, pricedEntryValueUsd:pricedEntry, simulatedExitValueUsd:exitValue, simulatedPnlUsd:exitValue-pricedEntry, returnPercent:pricedEntry>0?(exitValue/pricedEntry-1)*100:null, legs }, coverage:{ complete:intelligenceArchivalEnabled(env)&&priced===buys.length, statement:'Historical simulation uses only indexed observed prices and does not recommend a strategy or predict future performance.' } },200,cors,'no-store');
}
async function intelligenceRadar(env, cors) {
  const db=intelligenceDb(env), caps=intelligenceCapabilities(env);
  if(!db||!intelligenceIndexEnabled(env)) return json({ok:true,state:'index-required',anomalies:[],capabilities:caps},200,cors,'no-store');
  const rows=await db.prepare(`SELECT anomaly_key,scope_type,scope_value,observed_at,severity,baseline_value,observed_value,sample_size,evidence_json,expires_at FROM bull_radar_anomalies WHERE expires_at IS NULL OR expires_at>unixepoch() ORDER BY observed_at DESC,severity DESC LIMIT 50`).all().then(x=>x?.results||[]).catch(()=>[]);
  return json({ok:true,state:'limited',anomalies:rows,coverage:{source:'observed-wallet-cohorts',complete:false,statement:'Radar reflects only public wallets indexed by A Bulls App and is not a market prediction.'},capabilities:caps},200,cors,'public, max-age=30');
}
async function intelligenceWeather(env, cors) {
  const db=intelligenceDb(env), caps=intelligenceCapabilities(env);
  if(!db||!intelligenceIndexEnabled(env)) return json({ok:true,state:'index-required',weather:null,capabilities:caps},200,cors,'no-store');
  const row=await db.prepare(`SELECT bucket_start,bucket_seconds,regime,activity_score,volatility_score,concentration_score,rotation_score,convergence_score,nft_activity_score,evidence_json FROM bull_chain_weather ORDER BY bucket_start DESC LIMIT 1`).first().catch(()=>null);
  return json({ok:true,state:row?'limited':'collecting',weather:row,coverage:{source:'observed-wallet-windows',complete:false,statement:'Solana Weather is a visual metaphor for indexed observations, not a market forecast.'},capabilities:caps},200,cors,'public, max-age=30');
}

async function intelligenceNftMemory(request, env, cors) {
  const body = await readJsonBody(request, 4096);
  const address = String(body.address || body.wallet || '').trim();
  const limit = Math.max(1, Math.min(100, Math.round(Number(body.limit || 40))));
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  const db = intelligenceDb(env);
  const caps = intelligenceCapabilities(env);
  if (!db || !intelligenceNftIndexEnabled(env)) {
    return json({
      ok: true,
      state: 'index-required',
      events: [],
      collections: [],
      coverage: {
        source: 'normalized-nft-events',
        complete: false,
        statement: 'NFT Memory activates after migration 0008 and a normalized public NFT ingest source are enabled. Current holdings are never presented as complete ownership history.'
      },
      capabilities: caps
    }, 200, cors, 'no-store');
  }
  const events = await db.prepare(`
    SELECT signature, slot, block_time, asset_id, collection, event_class, marketplace,
           counterparty, sol_value, usd_value, source, confidence, metadata_json
    FROM bull_nft_wallet_events
    WHERE wallet=?
    ORDER BY block_time DESC, id DESC
    LIMIT ?
  `).bind(address, limit).all().then(x => x?.results || []).catch(() => []);
  const collections = await db.prepare(`
    SELECT collection, window_start, window_end, acquired_count, disposed_count,
           transfer_in_count, transfer_out_count, unique_assets, first_seen, last_seen,
           observed_sol_in, observed_sol_out, payload_json, updated_at
    FROM bull_nft_wallet_collection_windows
    WHERE wallet=?
    ORDER BY window_end DESC
    LIMIT 40
  `).bind(address).all().then(x => x?.results || []).catch(() => []);
  const bounds = await db.prepare(`
    SELECT COUNT(*) event_count, MIN(block_time) first_seen, MAX(block_time) last_seen
    FROM bull_nft_wallet_events WHERE wallet=?
  `).bind(address).first().catch(() => null);
  return json({
    ok: true,
    state: events.length || collections.length ? 'limited' : 'collecting',
    events,
    collections,
    coverage: {
      source: 'normalized-nft-events',
      complete: false,
      indexedEvents: Number(bounds?.event_count || 0),
      firstIndexedAt: bounds?.first_seen || null,
      lastIndexedAt: bounds?.last_seen || null,
      statement: 'NFT Memory contains only public NFT observations indexed by A Bulls App. It never treats partial indexing as complete ownership history or identity evidence.'
    },
    capabilities: caps
  }, 200, cors, 'no-store');
}

async function bullVisionHistory(env, address, maxPages = 4, pageSize = 100) {
  const transactions = [];
  let before = null;
  for (let page = 0; page < maxPages; page++) {
    const payload = await heliusWallet(env, `/v1/wallet/${encodeURIComponent(address)}/history`, {
      limit: pageSize,
      before,
      tokenAccounts: 'balanceChanged'
    });
    const list = Array.isArray(payload.data) ? payload.data : [];
    transactions.push(...list);
    before = payload.pagination?.nextCursor || null;
    if (!payload.pagination?.hasMore || !before || !list.length) break;
  }
  return transactions;
}

async function bullVisionTokenMarket(mint) {
  try {
    const response = await fetchWithPolicy('https://api.dexscreener.com/latest/dex/tokens/' + encodeURIComponent(mint), {
      headers: { Accept: 'application/json' }, cf: { cacheTtl: 60, cacheEverything: true }
    });
    const payload = await response.json().catch(() => ({}));
    const pairs = (Array.isArray(payload.pairs) ? payload.pairs : [])
      .filter(pair => !pair?.chainId || pair.chainId === 'solana')
      .sort((a, b) => finiteNumber(b?.liquidity?.usd) - finiteNumber(a?.liquidity?.usd));
    const pair = pairs[0];
    if (!pair) return null;
    return {
      name: pair.baseToken?.name || null,
      symbol: pair.baseToken?.symbol || null,
      priceUsd: finiteNumber(pair.priceUsd, null),
      marketCapUsd: pair.marketCap == null ? null : finiteNumber(pair.marketCap, null),
      liquidityUsd: pair.liquidity?.usd == null ? null : finiteNumber(pair.liquidity.usd, null),
      pairUrl: pair.url || null
    };
  } catch (error) {
    logFailure('bull vision market', error);
    return null;
  }
}

function bullVisionAnalyzeTransactions(transactions, mint) {
  const events = [];
  let tokenIn = 0;
  let tokenOut = 0;
  let buys = 0;
  let sells = 0;
  let transfers = 0;
  let feesSol = 0;
  const activeDays = new Set();
  for (const tx of transactions) {
    const changes = Array.isArray(tx.balanceChanges) ? tx.balanceChanges.filter(c => Number(c.amount || 0) !== 0) : [];
    const target = changes.find(c => String(c.mint || '') === mint);
    if (!target) continue;
    const amount = Number(target.amount || 0);
    const quoteChanges = changes.filter(c => String(c.mint || '') !== mint);
    const hasQuoteIn = quoteChanges.some(c => Number(c.amount || 0) > 0 && (SOL_MINTS.has(String(c.mint || '')) || c.mint === USDC_MINT || c.mint === USDT_MINT));
    const hasQuoteOut = quoteChanges.some(c => Number(c.amount || 0) < 0 && (SOL_MINTS.has(String(c.mint || '')) || c.mint === USDC_MINT || c.mint === USDT_MINT));
    let side = 'TRANSFER';
    if (amount > 0 && hasQuoteOut) { side = 'BUY'; buys++; }
    else if (amount < 0 && hasQuoteIn) { side = 'SELL'; sells++; }
    else transfers++;
    if (amount > 0) tokenIn += amount; else tokenOut += Math.abs(amount);
    const timestamp = Number(tx.timestamp || 0);
    if (timestamp) activeDays.add(new Date(timestamp * 1000).toISOString().slice(0, 10));
    feesSol += Number(tx.fee || 0) / 1_000_000_000;
    events.push({ signature: tx.signature || null, timestamp: timestamp || null, side, amount, quoteChanges: quoteChanges.slice(0, 6) });
  }
  events.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
  const holdSpanSec = events.length > 1 ? Math.max(0, Number(events.at(-1).timestamp || 0) - Number(events[0].timestamp || 0)) : 0;
  const netTokens = tokenIn - tokenOut;
  const signals = [];
  if (buys >= 3) signals.push({ id: 'scaled-entry', label: 'Scaled Entry', strength: buys >= 6 ? 'strong' : 'observed', detail: `${buys} buy-like swaps were observed for this mint.` });
  if (sells >= 3) signals.push({ id: 'staged-exit', label: 'Staged Exit', strength: sells >= 6 ? 'strong' : 'observed', detail: `${sells} sell-like swaps were observed for this mint.` });
  if (events.length >= 8 && holdSpanSec > 0 && holdSpanSec / Math.max(1, events.length - 1) < 3600) signals.push({ id: 'rapid-rotation', label: 'Rapid Rotation', strength: 'observed', detail: 'Token-related actions clustered closely together in time.' });
  if (transfers >= 2) signals.push({ id: 'transfer-activity', label: 'Transfer Activity', strength: 'context', detail: `${transfers} token movements did not present as clear swaps and are kept separate from trade-like activity.` });
  return { events, buys, sells, transfers, tokenIn, tokenOut, netTokens, feesSol, activeDays: activeDays.size, holdSpanSec, signals };
}

async function bullVisionLite(url, env, cors) {
  const mint = String(url.searchParams.get('mint') || '').trim();
  const wallet = String(url.searchParams.get('wallet') || '').trim();
  if (!validAddress(mint) || !validAddress(wallet)) return json({ ok: false, error: 'valid mint and public wallet are required' }, 400, cors);
  requireHelius(env);
  const cacheKey = `bullvision:lite:${wallet}:${mint}`;
  const cached = await cacheGet(env, cacheKey + ':fresh');
  if (cached) return json({ ok: true, ...cached, cached: true }, 200, cors);
  const [transactions, market] = await Promise.all([bullVisionHistory(env, wallet), bullVisionTokenMarket(mint)]);
  const analysis = bullVisionAnalyzeTransactions(transactions, mint);
  if (!analysis.events.length) return json({ ok: false, error: 'No token activity was found in the history available on the current Helius plan.' }, 404, cors);
  const data = {
    mode: 'lite',
    capabilities: { tradeAutopsy: true, compare: true, lifeSignals: true, whatIf: false, exactPnl: false, historicalCandles: false, cinematicReplay: false },
    mint, wallet,
    token: { name: market?.name || null, symbol: market?.symbol || null, priceUsd: market?.priceUsd ?? null, marketCapUsd: market?.marketCapUsd ?? null, liquidityUsd: market?.liquidityUsd ?? null, marketUrl: market?.pairUrl || null },
    vision: {
      metrics: {
        holdSpanSec: analysis.holdSpanSec,
        buys: analysis.buys, sells: analysis.sells, transfers: analysis.transfers,
        tokenIn: analysis.tokenIn, tokenOut: analysis.tokenOut, netTokens: analysis.netTokens,
        feesSol: analysis.feesSol, activeDays: analysis.activeDays,
        currentNetValueUsd: market?.priceUsd == null ? null : analysis.netTokens * market.priceUsd
      },
      autopsy: { first: analysis.events[0] || null, last: analysis.events.at(-1) || null, eventCount: analysis.events.length, peak: null },
      signals: analysis.signals
    },
    events: analysis.events.slice(-100),
    updatedAt: new Date().toISOString()
  };
  await storeSnapshot(env, cacheKey, data, DATA_POLICY.walletFreshMs);
  return json({ ok: true, ...data }, 200, cors, 'no-store');
}

async function bullVisionCompareLite(url, env, cors) {
  const mint = String(url.searchParams.get('mint') || '').trim();
  const walletA = String(url.searchParams.get('walletA') || '').trim();
  const walletB = String(url.searchParams.get('walletB') || '').trim();
  if (!validAddress(mint) || !validAddress(walletA) || !validAddress(walletB) || walletA === walletB) return json({ ok: false, error: 'valid mint and two different public wallets are required' }, 400, cors);
  const [aTx, bTx, market] = await Promise.all([bullVisionHistory(env, walletA), bullVisionHistory(env, walletB), bullVisionTokenMarket(mint)]);
  const a = bullVisionAnalyzeTransactions(aTx, mint);
  const b = bullVisionAnalyzeTransactions(bTx, mint);
  const score = x => x.buys + x.sells + x.activeDays + Math.min(10, Math.abs(x.netTokens) > 0 ? 1 : 0);
  const winner = score(a) === score(b) ? null : score(a) > score(b) ? 'a' : 'b';
  return json({ ok: true, mode: 'lite', mint, token: { name: market?.name || null, symbol: market?.symbol || null }, a: { wallet: walletA, vision: { metrics: a, signals: a.signals } }, b: { wallet: walletB, vision: { metrics: b, signals: b.signals } }, comparison: { winner, summary: winner ? `Wallet ${winner.toUpperCase()} shows more observed activity on this mint in the available history.` : 'The two wallets show similar observed activity on this mint in the available history.' }, capabilities: { exactPnl: false } }, 200, cors, 'no-store');
}

async function bullVisionWhatIfLite(url, env, cors) {
  const mint = String(url.searchParams.get('mint') || '').trim();
  const wallet = String(url.searchParams.get('wallet') || '').trim();
  if (!validAddress(mint) || !validAddress(wallet)) return json({ ok: false, error: 'valid mint and public wallet are required' }, 400, cors);
  return json({ ok: true, mode: 'lite', mint, wallet, scenarios: [{ label: 'ARCHIVAL UPGRADE', detail: 'Historical What If requires archival transaction access and historical pricing. It will unlock when the Helius plan is upgraded.' }], capability: { available: false, reason: 'Historical What If requires archival transaction access and historical pricing.' } }, 200, cors, 'no-store');
}

function bullVisionReplayLite(cors) {
  return new Response('<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Bull Vision Replay</title><body style="margin:0;background:#08090b;color:#f5f5f5;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><main style="max-width:640px;padding:28px"><h1>Bull Vision Replay</h1><p style="line-height:1.6;color:#aeb4bd">Cinematic historical candle replay is reserved for the archival Bull Vision engine. Your current free Helius plan still supports Worker-backed Trade Autopsy, observed token activity, Wallet vs Wallet, and LIFE signals. This screen will unlock automatically after the Helius plan is upgraded.</p></main></body>', { status: 200, headers: { ...API_SECURITY_HEADERS, ...cors, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function bullVisionLifeSignalsLite(url, env, cors) {
  const mint = String(url.searchParams.get('mint') || '').trim();
  const wallet = String(url.searchParams.get('wallet') || '').trim();
  if (!validAddress(mint) || !validAddress(wallet)) return json({ ok: false, error: 'valid mint and public wallet are required' }, 400, cors);
  const transactions = await bullVisionHistory(env, wallet);
  const analysis = bullVisionAnalyzeTransactions(transactions, mint);
  return json({ ok: true, mode: 'lite', mint, wallet, observed: { buys: analysis.buys, sells: analysis.sells, transfers: analysis.transfers, holdSpanSec: analysis.holdSpanSec, activeDays: analysis.activeDays, netTokens: analysis.netTokens, signals: analysis.signals } }, 200, cors, 'no-store');
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

async function ansemAnalytics(env, cors, ctx, url) {
  const force = url?.searchParams?.get('refresh') === '1';
  if (force) {
    try {
      const built = await refreshAnsemAnalytics(env);
      return json({
        ok: true, data: built, updatedAt: built.updatedAt,
        meta: { cached: false, stale: false, partial: built.partial === true, policy: 'manual-refresh' }
      }, 200, cors, 'no-store');
    } catch (error) {
      logFailure('manual ansem refresh', error);
    }
  }
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

const ANSEMIO_SNAPSHOT_KEY = 'ansemio:protocol:v1';
const ANSEMIO_REFERENCE = Object.freeze({
  projectsLaunched: 1153,
  airdroppedToHolders: '23.2B',
  volumeTraded: '$334.09M',
  curated: Object.freeze([
    { name: 'Bullshit Coin', ticker: '$BULLSHIT', tier: 'GOLD' },
    { name: 'dogwifpants', ticker: '$PANTS', tier: 'DIAMOND' },
    { name: "BULLS'S EYE", ticker: '$EYE', tier: 'DIAMOND' },
    { name: 'RETURN TO MEMES', ticker: '$RTM', tier: 'GOLD' },
    { name: 'Z', ticker: '$Z', tier: 'DIAMOND' },
    { name: 'Yes, This is Dog', ticker: '$YESDOG', tier: 'GOLD' },
    { name: 'Magic Internet Money', ticker: '$MIM', tier: 'GOLD' },
    { name: 'The Black Baby Bull', ticker: '$BABYANSEM', tier: 'GOLD' },
    { name: 'kimchi', ticker: '$KIMICHI', tier: 'GOLD' },
    { name: 'ANSEM6900', ticker: '$ANSEM6900', tier: 'GOLD' }
  ])
});
function compactHtmlText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#36;/g, '$')
    .replace(/\s+/g, ' ')
    .trim();
}
function metricAfterLabel(text, label, pattern) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index < 0) return null;
  const window = text.slice(index + label.length, index + label.length + 180);
  const match = window.match(pattern);
  return match ? match[1] : null;
}
function curatedRowsFromHtml(html) {
  const rows = [];
  for (const match of String(html || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const text = compactHtmlText(match[1]);
    const tierMatch = text.match(/\b(GOLD|DIAMOND)\b/i);
    const tickerMatch = text.match(/(\$[A-Z0-9_]{1,20})/i);
    if (!tierMatch || !tickerMatch) continue;
    const beforeTicker = text.slice(0, text.indexOf(tickerMatch[1]))
      .replace(/^\s*\d+\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!beforeTicker) continue;
    rows.push({ name: beforeTicker.slice(0, 64), ticker: tickerMatch[1].toUpperCase(), tier: tierMatch[1].toUpperCase() });
    if (rows.length >= 10) break;
  }
  return rows;
}
async function refreshAnsemIoSnapshot(env) {
  const [homeResponse, z500Response] = await Promise.all([
    fetchWithPolicy('https://ansem.io/', {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'A-Bulls-App-Analytics/' + VERSION }
    }, { timeoutMs: 9000 }),
    fetchWithPolicy('https://ansem.io/z500', {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'A-Bulls-App-Analytics/' + VERSION }
    }, { timeoutMs: 9000 })
  ]);
  const homeHtml = homeResponse.ok ? await homeResponse.text() : '';
  const z500Html = z500Response.ok ? await z500Response.text() : '';
  const text = compactHtmlText(homeHtml);

  const projectRaw = metricAfterLabel(text, 'Projects launched', /([0-9][0-9,]*)/);
  const airdropRaw = metricAfterLabel(text, 'Airdropped to holders', /([~≈]?\s*\$?[0-9][0-9.,]*\s*[KMBT]?)/i);
  const volumeRaw = metricAfterLabel(text, 'Volume traded', /(\$[0-9][0-9.,]*\s*[KMBT]?)/i);
  const curated = curatedRowsFromHtml(z500Html);

  const data = {
    projectsLaunched: projectRaw ? Number(projectRaw.replaceAll(',', '')) : ANSEMIO_REFERENCE.projectsLaunched,
    airdroppedToHolders: airdropRaw ? airdropRaw.replace(/\s+/g, '') : ANSEMIO_REFERENCE.airdroppedToHolders,
    volumeTraded: volumeRaw ? volumeRaw.replace(/\s+/g, '') : ANSEMIO_REFERENCE.volumeTraded,
    curated: curated.length >= 5 ? curated : ANSEMIO_REFERENCE.curated,
    updatedAt: new Date().toISOString(),
    upstream: {
      home: homeResponse.status,
      z500: z500Response.status
    }
  };
  await cachePut(env, ANSEMIO_SNAPSHOT_KEY, data, 5 * 60_000);
  return data;
}
async function ansemIoSnapshot(env, cors, ctx, url) {
  const force = url?.searchParams?.get('refresh') === '1';
  if (force) {
    try {
      const data = await refreshAnsemIoSnapshot(env);
      return json({ ok: true, data, cached: false, updatedAt: data.updatedAt }, 200, cors, 'no-store');
    } catch (error) {
      logFailure('manual ansem.io refresh', error);
      const cached = await cacheGet(env, ANSEMIO_SNAPSHOT_KEY);
      if (cached) return json({ ok: true, data: cached, cached: true, updatedAt: cached.updatedAt }, 200, cors, 'no-store');
      return json({ ok: true, data: { ...ANSEMIO_REFERENCE, updatedAt: new Date().toISOString() }, cached: true }, 200, cors, 'no-store');
    }
  }
  const cached = await cacheGet(env, ANSEMIO_SNAPSHOT_KEY);
  if (cached) {
    ctx?.waitUntil?.(refreshAnsemIoSnapshot(env).catch(() => null));
    return json({ ok: true, data: cached, cached: true, updatedAt: cached.updatedAt }, 200, cors, 'public, max-age=60, stale-while-revalidate=300');
  }
  try {
    const data = await refreshAnsemIoSnapshot(env);
    return json({ ok: true, data, cached: false, updatedAt: data.updatedAt }, 200, cors, 'public, max-age=60');
  } catch (error) {
    logFailure('ansem.io snapshot', error);
    const data = { ...ANSEMIO_REFERENCE, updatedAt: new Date().toISOString() };
    return json({ ok: true, data, cached: true, updatedAt: data.updatedAt }, 200, cors, 'public, max-age=60');
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
async function nftCollectionStats(env, cors, ctx, url) {
  const cacheKey = 'nft-collection-stats:' + BULL_PEN_SYMBOL;
  if (url?.searchParams?.get('refresh') === '1') {
    const data = await buildNftCollectionStats(env);
    return json({ ok: true, data, cached: false, stale: false, updatedAt: data.updatedAt }, 200, cors, 'no-store');
  }
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
async function kimjiBullPenStats(env, force = false) {
  requireHelius(env);
  if (!force) {
    const cached = await cacheGet(env, 'nft:kimji-staking:' + BULL_PEN_COLLECTION);
    if (cached) return { ...cached, cached: true };
  }
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
async function theBullsBuybackStats(env, force = false) {
  if (!force) {
    const cached = await cacheGet(env, 'nft:the-bulls-buybacks');
    if (cached) return { ...cached, cached: true };
  }
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
async function buildNftEcosystemStats(env, force = false) {
  const [kimjiResult, buybackResult] = await Promise.allSettled([
    kimjiBullPenStats(env, force),
    theBullsBuybackStats(env, force)
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
async function nftEcosystemStats(env, cors, ctx, url) {
  const cacheKey = 'nft:ecosystem-stats';
  if (url?.searchParams?.get('refresh') === '1') {
    const data = await buildNftEcosystemStats(env, true);
    return json({ ok: true, data, cached: false, stale: false, updatedAt: data.updatedAt }, 200, cors, 'no-store');
  }
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


// ---------------------------------------------------------------------------
// Intelligence Mesh v1 — neutral, provider-agnostic progressive history
// Standard Solana RPC works on the current tier. Helius is only an optional
// standard-RPC adapter; paid history endpoints are not required.
// ---------------------------------------------------------------------------
function intelligenceMeshEnabled(env) {
  return String(env.INTELLIGENCE_MESH_ENABLED || '').toLowerCase() === 'true' && Boolean(intelligenceDb(env));
}
function intelligenceRpcSource(env) {
  const explicit = String(env.INTELLIGENCE_RPC_URL || env.SOLANA_RPC_URL || '').trim();
  if (explicit) return { name: 'configured-rpc', kind: 'rpc', url: explicit };
  const key = String(env.HELIUS_API_KEY || '').trim();
  if (key) return { name: 'helius-standard-rpc', kind: 'rpc', url: `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}` };
  return { name: 'solana-public-rpc', kind: 'rpc', url: 'https://api.mainnet-beta.solana.com' };
}
async function intelligenceRpcCall(source, method, params) {
  const started = Date.now();
  const response = await fetch(source.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  if (!response.ok) throw Object.assign(new Error(`${source.name}:${method}:http_${response.status}`), { status: 502 });
  const payload = await response.json();
  if (payload?.error) throw Object.assign(new Error(`${source.name}:${method}:${payload.error.code || 'rpc'}:${String(payload.error.message || '')}`), { status: 502 });
  return { result: payload?.result, latencyMs: Date.now() - started };
}
async function intelligenceMeshStatus(env, cors) {
  const db = intelligenceDb(env);
  const source = intelligenceRpcSource(env);
  const tables = db ? await Promise.all([
    db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='intelligence_index_coverage'`).first().catch(()=>null),
    db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='intelligence_price_candles'`).first().catch(()=>null)
  ]) : [];
  return json({ ok:true, status:{
    version: 1,
    enabled: intelligenceMeshEnabled(env),
    readOnly: true,
    publicAddressOnly: true,
    rpcSource: source.name,
    schemaReady: Boolean(tables[0]),
    capabilities: {
      historyEngine: Boolean(tables[0]),
      verificationEngine: Boolean(tables[0]),
      liveDataPlane: false,
      tradeRoutes: Boolean(tables[1]),
      onChainCandles: Boolean(tables[1]),
      marketSequence: Boolean(tables[1]),
      demandEngine: Boolean(tables[1]),
      yellowstoneRichat: 'adapter-ready',
      substreamsSvm: 'adapter-ready',
      oldFaithful: 'adapter-ready'
    }
  } }, 200, cors, 'no-store');
}
async function intelligenceSourceHealth(env, cors) {
  const db = intelligenceDb(env);
  if (!db) return json({ok:true,sources:[]},200,cors,'no-store');
  const rows = await db.prepare(`SELECT source,source_kind,state,last_ok_at,last_error_at,latency_ms,gap_count,details_json,updated_at FROM intelligence_source_health ORDER BY updated_at DESC LIMIT 50`).all().then(x=>x?.results||[]).catch(()=>[]);
  return json({ok:true,sources:rows},200,cors,'no-store');
}
async function getNeutralCoverage(env, address) {
  const db=intelligenceDb(env); if(!db) return null;
  return db.prepare(`SELECT wallet,newest_signature,oldest_signature,newest_slot,oldest_slot,newest_block_time,oldest_block_time,indexed_events,indexed_transactions,complete_to_genesis,status,source_set_json,last_error,updated_at FROM intelligence_index_coverage WHERE wallet=?`).bind(address).first().catch(()=>null);
}
async function intelligenceIndexCoverage(request, env, cors) {
  const body=await readJsonBody(request,4096); const address=String(body.wallet||body.address||'').trim();
  if(!validAddress(address)) return json({ok:false,error:{message:'Invalid Solana address'}},400,cors);
  const coverage=await getNeutralCoverage(env,address);
  return json({ok:true,wallet:address,coverage,state:coverage?.complete_to_genesis?'complete-history':coverage?'partial-history':'not-indexed'},200,cors,'no-store');
}
async function upsertNeutralSourceHealth(db, source, state, latencyMs=null, detail='') {
  await db.prepare(`INSERT INTO intelligence_source_health(source,source_kind,state,last_ok_at,last_error_at,latency_ms,details_json,updated_at)
    VALUES(?,?,?,?,?,?,?,unixepoch()) ON CONFLICT(source) DO UPDATE SET source_kind=excluded.source_kind,state=excluded.state,
    last_ok_at=CASE WHEN excluded.state='ok' THEN excluded.last_ok_at ELSE last_ok_at END,
    last_error_at=CASE WHEN excluded.state='error' THEN excluded.last_error_at ELSE last_error_at END,
    latency_ms=excluded.latency_ms,details_json=excluded.details_json,updated_at=unixepoch()`)
    .bind(source.name,source.kind,state,state==='ok'?Math.floor(Date.now()/1000):null,state==='error'?Math.floor(Date.now()/1000):null,latencyMs,JSON.stringify(detail?{detail}:{})).run();
}
function rpcAccountKeys(tx) {
  return (tx?.transaction?.message?.accountKeys||[]).map(k=>typeof k==='string'?k:String(k?.pubkey||''));
}
function rpcTokenDeltas(meta,address) {
  const map=new Map();
  for(const row of meta?.preTokenBalances||[]){ if(String(row.owner||'')!==address) continue; const key=`${row.accountIndex}|${row.mint}`; map.set(key,{mint:String(row.mint||''),pre:Number(row.uiTokenAmount?.uiAmountString??row.uiTokenAmount?.uiAmount??0),post:0}); }
  for(const row of meta?.postTokenBalances||[]){ if(String(row.owner||'')!==address) continue; const key=`${row.accountIndex}|${row.mint}`; const cur=map.get(key)||{mint:String(row.mint||''),pre:0,post:0}; cur.post=Number(row.uiTokenAmount?.uiAmountString??row.uiTokenAmount?.uiAmount??0); map.set(key,cur); }
  return [...map.values()].map(x=>({...x,delta:x.post-x.pre})).filter(x=>Number.isFinite(x.delta)&&Math.abs(x.delta)>1e-18);
}
function normalizeRpcHistoryTx(address,sigRow,tx,sourceName){
  if(!tx) return [];
  const meta=tx.meta||{}; const keys=rpcAccountKeys(tx); const idx=keys.indexOf(address);
  const solDelta=idx>=0?(Number(meta.postBalances?.[idx]||0)-Number(meta.preBalances?.[idx]||0))/1e9:0;
  const deltas=rpcTokenDeltas(meta,address); const signature=String(sigRow?.signature||tx?.transaction?.signatures?.[0]||'');
  const slot=Number(tx.slot||sigRow?.slot||0); const blockTime=Number(tx.blockTime||sigRow?.blockTime||0); const failed=Boolean(meta.err||sigRow?.err);
  if(!deltas.length) return [{signature,slot,blockTime,wallet:address,mint:'',eventClass:'transfer',solDelta,tokenDelta:0,feeLamports:Number(meta.fee||0),source:sourceName,confidence:failed?0:0.7,decoderVersion:'intelligence-history-rpc-v1'}];
  const hasIn=deltas.some(x=>x.delta>0),hasOut=deltas.some(x=>x.delta<0);
  return deltas.map(x=>({signature,slot,blockTime,wallet:address,mint:x.mint,eventClass:hasIn&&hasOut?'swap-like':'transfer',solDelta,tokenDelta:x.delta,feeLamports:Number(meta.fee||0),source:sourceName,confidence:failed?0:0.8,decoderVersion:'intelligence-history-rpc-v1'}));
}
async function persistNeutralHistoryRows(env,address,rows,source) {
  const db=intelligenceDb(env); if(!db||!rows.length) return 0;
  const statements=rows.map(row=>db.prepare(`INSERT OR IGNORE INTO bull_wallet_events
    (signature,slot,block_time,wallet,counterparty,program_id,mint,collection,event_class,sol_delta,token_delta,fee_lamports,price_usd,source,confidence,decoder_version)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(row.signature,row.slot||null,row.blockTime||null,address,null,null,row.mint||'',null,row.eventClass,row.solDelta,row.tokenDelta,row.feeLamports,null,row.source,row.confidence,row.decoderVersion));
  if(typeof db.batch==='function'){ for(let i=0;i<statements.length;i+=50) await db.batch(statements.slice(i,i+50)); } else for(const stmt of statements) await stmt.run();
  return rows.length;
}
async function persistNeutralProvenance(db,address,source,txRows){
  for(const item of txRows){ const signature=String(item.sig?.signature||''); if(!signature) continue;
    await db.prepare(`INSERT INTO intelligence_event_provenance(signature,wallet,source,source_kind,observed_at,slot,commitment,verified)
      VALUES(?,?,?,?,unixepoch(),?,'confirmed',?) ON CONFLICT(signature,wallet,source) DO UPDATE SET observed_at=unixepoch(),slot=excluded.slot,verified=MAX(verified,excluded.verified)`)
      .bind(signature,address,source.name,source.kind,Number(item.sig?.slot||0)||null,item.tx?1:0).run(); }
}
async function upsertNeutralCoverage(db,address,source,sigs,accepted,complete){
  const newest=sigs[0]||{},oldest=sigs[sigs.length-1]||{};
  await db.prepare(`INSERT INTO intelligence_index_coverage
    (wallet,newest_signature,oldest_signature,newest_slot,oldest_slot,newest_block_time,oldest_block_time,indexed_events,indexed_transactions,complete_to_genesis,status,source_set_json,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,unixepoch()) ON CONFLICT(wallet) DO UPDATE SET
    newest_signature=COALESCE(intelligence_index_coverage.newest_signature,excluded.newest_signature),oldest_signature=COALESCE(excluded.oldest_signature,intelligence_index_coverage.oldest_signature),
    newest_slot=MAX(COALESCE(intelligence_index_coverage.newest_slot,0),COALESCE(excluded.newest_slot,0)),
    oldest_slot=CASE WHEN intelligence_index_coverage.oldest_slot IS NULL THEN excluded.oldest_slot WHEN excluded.oldest_slot IS NULL THEN intelligence_index_coverage.oldest_slot ELSE MIN(intelligence_index_coverage.oldest_slot,excluded.oldest_slot) END,
    newest_block_time=MAX(COALESCE(intelligence_index_coverage.newest_block_time,0),COALESCE(excluded.newest_block_time,0)),
    oldest_block_time=CASE WHEN intelligence_index_coverage.oldest_block_time IS NULL THEN excluded.oldest_block_time WHEN excluded.oldest_block_time IS NULL THEN intelligence_index_coverage.oldest_block_time ELSE MIN(intelligence_index_coverage.oldest_block_time,excluded.oldest_block_time) END,
    indexed_events=intelligence_index_coverage.indexed_events+excluded.indexed_events,indexed_transactions=intelligence_index_coverage.indexed_transactions+excluded.indexed_transactions,
    complete_to_genesis=MAX(intelligence_index_coverage.complete_to_genesis,excluded.complete_to_genesis),status=excluded.status,source_set_json=excluded.source_set_json,updated_at=unixepoch()`)
    .bind(address,String(newest.signature||'')||null,String(oldest.signature||'')||null,Number(newest.slot||0)||null,Number(oldest.slot||0)||null,Number(newest.blockTime||0)||null,Number(oldest.blockTime||0)||null,accepted,sigs.length,complete?1:0,complete?'complete':'partial',JSON.stringify([source.name])).run();
}
async function runHistoryPass(env,address,{before='',pageSize=25}={}){
  if(!intelligenceMeshEnabled(env)) throw Object.assign(new Error('Intelligence Mesh is disabled'),{status:503});
  const db=intelligenceDb(env); const source=intelligenceRpcSource(env); const limit=Math.max(1,Math.min(25,Math.round(Number(pageSize||25))));
  try{
    const cfg={limit,commitment:'confirmed'}; if(before) cfg.before=String(before);
    const sigResponse=await intelligenceRpcCall(source,'getSignaturesForAddress',[address,cfg]); const sigs=Array.isArray(sigResponse.result)?sigResponse.result:[];
    const txRows=[]; let totalLatency=sigResponse.latencyMs;
    const pending=sigs.slice();
    const workers=Array.from({length:Math.min(5,pending.length)},async()=>{ while(pending.length){ const sig=pending.shift(); try{ const t=await intelligenceRpcCall(source,'getTransaction',[sig.signature,{commitment:'confirmed',maxSupportedTransactionVersion:0,encoding:'jsonParsed'}]); totalLatency+=t.latencyMs; txRows.push({sig,tx:t.result}); } catch(error){ txRows.push({sig,tx:null,error:String(error.message||error)}); } } });
    await Promise.all(workers);
    const normalized=txRows.flatMap(x=>normalizeRpcHistoryTx(address,x.sig,x.tx,source.name)); const accepted=await persistNeutralHistoryRows(env,address,normalized,source);
    const nextCursor=String(sigs[sigs.length-1]?.signature||''); const complete=sigs.length<limit||!nextCursor;
    await persistNeutralProvenance(db,address,source,txRows); await upsertNeutralCoverage(db,address,source,sigs,accepted,complete);
    await upsertNeutralSourceHealth(db,source,'ok',Math.round(totalLatency/Math.max(1,1+txRows.length)));
    return {ok:true,wallet:address,source:source.name,signatures:sigs.length,transactionsFetched:txRows.filter(x=>x.tx).length,acceptedEvents:accepted,complete,nextCursor:complete?null:nextCursor,state:complete?'complete-history':'partial-history'};
  }catch(error){ await upsertNeutralSourceHealth(db,source,'error',null,String(error.message||error)).catch(()=>null); throw error; }
}
async function intelligenceHistoryPassRoute(request,env,cors){
  const body=await readJsonBody(request,4096); const address=String(body.wallet||body.address||'').trim(); if(!validAddress(address)) return json({ok:false,error:{message:'Invalid Solana address'}},400,cors);
  try{return json(await runHistoryPass(env,address,{before:body.before,pageSize:body.pageSize}),200,cors,'no-store');}catch(error){throw error;}
}
async function intelligenceHistoryQueue(request,env,cors){
  const body=await readJsonBody(request,4096); const address=String(body.wallet||body.address||'').trim(); if(!validAddress(address)) return json({ok:false,error:{message:'Invalid Solana address'}},400,cors);
  if(!intelligenceMeshEnabled(env)) return json({ok:false,error:{message:'Intelligence Mesh is disabled'}},503,cors);
  const db=intelligenceDb(env); const existing=await db.prepare(`SELECT id,state FROM intelligence_index_jobs WHERE wallet=? AND job_type='wallet-backfill' AND state IN ('queued','running') ORDER BY updated_at DESC LIMIT 1`).bind(address).first().catch(()=>null);
  if(existing?.id) return json({ok:true,wallet:address,jobId:existing.id,state:existing.state,reused:true},202,cors,'no-store');
  const pageSize=Math.max(1,Math.min(25,Math.round(Number(body.pageSize||25)))); const result=await db.prepare(`INSERT INTO intelligence_index_jobs(wallet,job_type,state,cursor_before,page_size,next_attempt_at,created_at,updated_at) VALUES(?,'wallet-backfill','queued',?,?,unixepoch(),unixepoch(),unixepoch())`).bind(address,String(body.before||'')||null,pageSize).run();
  return json({ok:true,wallet:address,jobId:result?.meta?.last_row_id||null,state:'queued',reused:false},202,cors,'no-store');
}
async function continueIntelligenceHistoryJobs(env,limit=2){
  const db=intelligenceDb(env); if(!db||!intelligenceMeshEnabled(env)) return {processed:0};
  const jobs=await db.prepare(`SELECT id,wallet,cursor_before,page_size FROM intelligence_index_jobs WHERE state='queued' AND (next_attempt_at IS NULL OR next_attempt_at<=unixepoch()) ORDER BY updated_at ASC LIMIT ?`).bind(Math.max(1,Math.min(4,Number(limit||2)))).all().then(x=>x?.results||[]).catch(()=>[]);
  let processed=0;
  for(const job of jobs){ await db.prepare(`UPDATE intelligence_index_jobs SET state='running',updated_at=unixepoch() WHERE id=?`).bind(job.id).run();
    try{ const result=await runHistoryPass(env,job.wallet,{before:job.cursor_before||'',pageSize:job.page_size||25}); await db.prepare(`UPDATE intelligence_index_jobs SET state=?,cursor_before=?,pages_completed=pages_completed+1,signatures_seen=signatures_seen+?,transactions_ingested=transactions_ingested+?,source=?,last_error=NULL,next_attempt_at=?,updated_at=unixepoch() WHERE id=?`).bind(result.complete?'complete':'queued',result.nextCursor||null,result.signatures,result.transactionsFetched,result.source,result.complete?null:Math.floor(Date.now()/1000)+30,job.id).run(); processed++; }
    catch(error){ await db.prepare(`UPDATE intelligence_index_jobs SET state='queued',last_error=?,next_attempt_at=?,updated_at=unixepoch() WHERE id=?`).bind(String(error.message||error).slice(0,1000),Math.floor(Date.now()/1000)+180,job.id).run(); }
  }
  return {processed};
}
async function intelligenceWalletDna(request,env,cors){
  const body=await readJsonBody(request,4096); const address=String(body.wallet||body.address||'').trim(); if(!validAddress(address)) return json({ok:false,error:{message:'Invalid Solana address'}},400,cors);
  const db=intelligenceDb(env); if(!db) return json({ok:true,dna:null,state:'database-unavailable'},200,cors,'no-store');
  const row=await db.prepare(`SELECT COUNT(DISTINCT signature) tx_count,COUNT(DISTINCT CASE WHEN mint<>'' THEN mint END) mint_count,SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) swap_events,SUM(CASE WHEN token_delta>0 THEN 1 ELSE 0 END) inbound,SUM(CASE WHEN token_delta<0 THEN 1 ELSE 0 END) outbound,SUM(fee_lamports)/1000000000.0 fees_sol,MIN(block_time) first_seen,MAX(block_time) last_seen FROM bull_wallet_events WHERE wallet=?`).bind(address).first().catch(()=>null);
  const tx=Math.max(1,Number(row?.tx_count||0)); if(!Number(row?.tx_count||0)) return json({ok:true,wallet:address,dna:{state:'not-indexed',coverage:await getNeutralCoverage(env,address)}},200,cors,'no-store');
  const days=row?.first_seen&&row?.last_seen?Math.max(1,(Number(row.last_seen)-Number(row.first_seen))/86400):1; const rotation=Math.min(1,Number(row.swap_events||0)/tx); const breadth=Math.min(1,Number(row.mint_count||0)/20); const cadence=Math.min(1,tx/Math.max(1,days*5)); const churn=Math.min(1,(Number(row.inbound||0)+Number(row.outbound||0))/Math.max(1,tx*2));
  return json({ok:true,wallet:address,dna:{state:(await getNeutralCoverage(env,address))?.complete_to_genesis?'complete-history':'partial-history',dimensions:{rotation,breadth,cadence,churn},evidence:{txCount:Number(row.tx_count||0),swapEvents:Number(row.swap_events||0),uniqueMints:Number(row.mint_count||0),feesSol:Number(row.fees_sol||0),firstSeen:row.first_seen||null,lastSeen:row.last_seen||null},disclaimer:'Descriptive fingerprint of observed public-chain activity; not identity, personality, skill, or investment advice.'}},200,cors,'no-store');
}
async function intelligenceMuseum(request,env,cors){
  const body=await readJsonBody(request,4096),address=String(body.wallet||body.address||'').trim(); if(!validAddress(address)) return json({ok:false,error:{message:'Invalid Solana address'}},400,cors); const db=intelligenceDb(env);
  const first=await db.prepare(`SELECT signature,block_time,event_class,mint,sol_delta,token_delta,source FROM bull_wallet_events WHERE wallet=? AND block_time>0 ORDER BY block_time ASC LIMIT 1`).bind(address).first().catch(()=>null); const latest=await db.prepare(`SELECT signature,block_time,event_class,mint,sol_delta,token_delta,source FROM bull_wallet_events WHERE wallet=? AND block_time>0 ORDER BY block_time DESC LIMIT 1`).bind(address).first().catch(()=>null); const largest=await db.prepare(`SELECT signature,block_time,event_class,mint,sol_delta,source FROM bull_wallet_events WHERE wallet=? ORDER BY ABS(sol_delta) DESC LIMIT 1`).bind(address).first().catch(()=>null); const mints=await db.prepare(`SELECT mint,COUNT(*) event_count,SUM(ABS(token_delta)) observed_turnover FROM bull_wallet_events WHERE wallet=? AND mint<>'' GROUP BY mint ORDER BY event_count DESC LIMIT 8`).bind(address).all().then(x=>x?.results||[]).catch(()=>[]); return json({ok:true,museum:{wallet:address,firstEvent:first,latestEvent:latest,largestObservedSolMovement:largest,topObservedMints:mints,coverage:await getNeutralCoverage(env,address)}},200,cors,'no-store');
}
async function intelligenceConstellation(request,env,cors){
  const body=await readJsonBody(request,4096),address=String(body.wallet||body.address||'').trim(); if(!validAddress(address)) return json({ok:false,error:{message:'Invalid Solana address'}},400,cors); const db=intelligenceDb(env); const edges=await db.prepare(`SELECT wallet_a,wallet_b,first_seen,last_seen,interaction_count,sol_volume,token_event_count,relationship_types FROM bull_wallet_relationships WHERE wallet_a=? OR wallet_b=? ORDER BY interaction_count DESC,last_seen DESC LIMIT 100`).bind(address,address).all().then(x=>x?.results||[]).catch(()=>[]); return json({ok:true,wallet:address,edges,disclaimer:'Observed public transaction relationships do not prove common ownership or identity.'},200,cors,'no-store');
}
async function intelligenceChainLens(request,env,cors){
  const body=await readJsonBody(request,4096),address=String(body.wallet||body.address||'').trim(),signature=String(body.signature||'').trim(); if(!validAddress(address)||!signature) return json({ok:false,error:{message:'Wallet and signature are required'}},400,cors); const db=intelligenceDb(env); const hops=await db.prepare(`SELECT hop_index,program_id,venue,pool,input_mint,output_mint,input_amount,output_amount,fee_amount,fee_mint,slot,block_time,source,confidence FROM intelligence_trade_routes WHERE wallet=? AND signature=? ORDER BY hop_index ASC`).bind(address,signature).all().then(x=>x?.results||[]).catch(()=>[]); const sources=await db.prepare(`SELECT source,source_kind,commitment,archive_ref,verified,observed_at,slot FROM intelligence_event_provenance WHERE wallet=? AND signature=? ORDER BY verified DESC,observed_at DESC`).bind(address,signature).all().then(x=>x?.results||[]).catch(()=>[]); const state=sources.some(x=>Number(x.verified)===1)?'verified':sources.some(x=>x.commitment==='finalized')?'finalized':sources.some(x=>x.commitment==='confirmed')?'confirmed':sources.length?'observed':'unknown'; return json({ok:true,lens:{wallet:address,signature,hops,verification:{state,sources}},disclaimer:'Reconstruction reflects observed on-chain route evidence only.'},200,cors,'no-store');
}
async function intelligenceCandles(request,env,cors){
  const body=await readJsonBody(request,4096),mint=String(body.mint||'').trim(),quote=String(body.quoteMint||body.quote_mint||'').trim(); if(!mint||!quote) return json({ok:false,error:{message:'Mint and quote mint are required'}},400,cors); const bucket=Math.max(60,Number(body.bucketSeconds||body.bucket_seconds||60)); const limit=Math.max(1,Math.min(1000,Number(body.limit||300))); const db=intelligenceDb(env); const rows=await db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? ORDER BY bucket_start DESC LIMIT ?`).bind(mint,quote,bucket,limit).all().then(x=>x?.results||[]).catch(()=>[]); return json({ok:true,mint,quoteMint:quote,candles:rows.reverse(),source:'observed-on-chain-swaps'},200,cors,'no-store');
}
async function intelligenceGhostPortfolio(request,env,cors){
  const body=await readJsonBody(request,4096),address=String(body.wallet||body.address||'').trim(),quote=String(body.quoteMint||body.quote_mint||USDC_MINT).trim(); if(!validAddress(address)) return json({ok:false,error:{message:'Invalid Solana address'}},400,cors); const db=intelligenceDb(env); const buys=await db.prepare(`SELECT signature,block_time,mint,token_delta,source,confidence FROM bull_wallet_events WHERE wallet=? AND event_class='swap-like' AND token_delta>0 AND mint<>'' ORDER BY block_time ASC LIMIT 100`).bind(address).all().then(x=>x?.results||[]).catch(()=>[]); const positions=[]; let delta=0,comparable=0;
  for(const row of buys){ const entry=await db.prepare(`SELECT bucket_start,close,confidence FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_start>=? ORDER BY bucket_start ASC LIMIT 1`).bind(row.mint,quote,row.block_time).first().catch(()=>null); const latest=await db.prepare(`SELECT bucket_start,close,confidence FROM intelligence_price_candles WHERE mint=? AND quote_mint=? ORDER BY bucket_start DESC LIMIT 1`).bind(row.mint,quote).first().catch(()=>null); const amount=Number(row.token_delta||0),item={signature:row.signature,blockTime:row.block_time,mint:row.mint,observedAcquiredAmount:amount,entryPrice:entry?.close||null,latestIndexedPrice:latest?.close||null}; if(entry&&latest&&Number(entry.close)>0){item.hypotheticalChangeQuote=amount*(Number(latest.close)-Number(entry.close));delta+=item.hypotheticalChangeQuote;comparable++;} positions.push(item); }
  return json({ok:true,simulation:{wallet:address,quoteMint:quote,positions,comparablePositions:comparable,hypotheticalAggregateChangeQuote:delta,coverage:await getNeutralCoverage(env,address),disclaimer:'Counterfactual hold calculation over observed buy-like balance changes and indexed on-chain candles. Not realized P&L and not investment advice.'}},200,cors,'no-store');
}
async function intelligenceWalletRivalry(request,env,cors){
  const body=await readJsonBody(request,4096),a=String(body.walletA||body.a||'').trim(),b=String(body.walletB||body.b||'').trim(); if(!validAddress(a)||!validAddress(b)) return json({ok:false,error:{message:'Two valid Solana addresses are required'}},400,cors); const db=intelligenceDb(env); const summarize=address=>db.prepare(`SELECT COUNT(DISTINCT signature) tx_count,COUNT(DISTINCT CASE WHEN mint<>'' THEN mint END) mint_count,SUM(CASE WHEN event_class='swap-like' THEN 1 ELSE 0 END) swap_events,SUM(fee_lamports)/1000000000.0 fees_sol,MIN(block_time) first_seen,MAX(block_time) last_seen FROM bull_wallet_events WHERE wallet=?`).bind(address).first().catch(()=>({})); const [ra,rb]=await Promise.all([summarize(a),summarize(b)]); return json({ok:true,comparison:{walletA:a,walletB:b,a:ra,b:rb,differences:{tx:Number(ra?.tx_count||0)-Number(rb?.tx_count||0),mintBreadth:Number(ra?.mint_count||0)-Number(rb?.mint_count||0),swapEvents:Number(ra?.swap_events||0)-Number(rb?.swap_events||0),feesSol:Number(ra?.fees_sol||0)-Number(rb?.fees_sol||0)},disclaimer:'Comparison of observed public activity only. It does not rank skill, intelligence, identity, or ownership.'}},200,cors,'no-store');
}
async function intelligenceChainRadar(env,cors){
  const db=intelligenceDb(env); if(!db||!intelligenceIndexEnabled(env)) return json({ok:true,state:'index-required',anomalies:[],disclaimer:'Observed anomalies are descriptive and are not price predictions or recommendations.'},200,cors,'no-store');
  const rows=await db.prepare(`SELECT anomaly_key,scope_type,scope_value,observed_at,severity,baseline_value,observed_value,sample_size,evidence_json,expires_at FROM bull_radar_anomalies WHERE expires_at IS NULL OR expires_at>unixepoch() ORDER BY observed_at DESC,severity DESC LIMIT 100`).all().then(x=>x?.results||[]).catch(()=>[]);
  return json({ok:true,state:rows.length?'ready':'collecting',anomalies:rows,disclaimer:'Chain Radar describes unusual patterns in indexed public activity. It is not a price prediction or recommendation.'},200,cors,'public, max-age=30');
}
async function intelligenceChainWeather(env,cors){
  const db=intelligenceDb(env); if(!db||!intelligenceIndexEnabled(env)) return json({ok:true,state:'index-required',weather:null,disclaimer:'Chain Weather is not a market forecast.'},200,cors,'no-store');
  const row=await db.prepare(`SELECT bucket_start,bucket_seconds,regime,activity_score,volatility_score,concentration_score,rotation_score,convergence_score,nft_activity_score,evidence_json FROM bull_chain_weather ORDER BY bucket_start DESC LIMIT 1`).first().catch(()=>null);
  return json({ok:true,state:row?'ready':'collecting',weather:row,disclaimer:'Chain Weather visualizes observed aggregate network conditions; it is not a market forecast.'},200,cors,'public, max-age=30');
}
async function intelligenceTimeline(request,env,cors){
  const body=await readJsonBody(request,4096),address=String(body.wallet||body.address||'').trim(); if(!validAddress(address)) return json({ok:false,error:{message:'Invalid Solana address'}},400,cors); const limit=Math.max(1,Math.min(1000,Number(body.limit||250))); const db=intelligenceDb(env); if(!db) return json({ok:true,wallet:address,events:[],coverage:null},200,cors,'no-store');
  const rows=await db.prepare(`SELECT signature,slot,block_time,counterparty,program_id,mint,collection,event_class,sol_delta,token_delta,fee_lamports,price_usd,source,confidence FROM bull_wallet_events WHERE wallet=? ORDER BY block_time ASC,id ASC LIMIT ?`).bind(address,limit).all().then(x=>x?.results||[]).catch(()=>[]);
  return json({ok:true,wallet:address,events:rows,coverage:await getNeutralCoverage(env,address),disclaimer:'Timeline reflects indexed public observations and may be partial until history coverage is complete.'},200,cors,'no-store');
}
async function intelligenceCommunityIntegrations(env,cors){ const db=intelligenceDb(env); if(!db) return json({ok:true,integrations:[]},200,cors,'no-store'); const rows=await db.prepare(`SELECT integration_key,display_name,category,enabled,legacy,config_json,updated_at FROM community_integrations ORDER BY legacy DESC,display_name ASC`).all().then(x=>x?.results||[]).catch(()=>[]); return json({ok:true,integrations:rows,note:'Community integrations are optional and separate from universal Intelligence.'},200,cors,'no-store'); }
