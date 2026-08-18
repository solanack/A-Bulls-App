/**
 * A Bulls App API Worker v5.5.1
 * Secrets: HELIUS_API_KEY, GOOGLE_CLIENT_ID, AUTH_SESSION_SECRET
 * Vars: ALLOWED_ORIGINS, ANSEM_MINT, COMMERCE_ENABLED,
 *       KIMJI_STAKING_AUTHORITY (optional)
 * Optional bindings: RATE_LIMITER (Cloudflare Rate Limiting),
 *                    ANALYTICS_CACHE (Cloudflare KV)
 */
const VERSION = '5.5.1';
const COMPETITIVE_GAMES = new Set(['bull-invaders', 'blitz-bowl']);
const DEFAULT_GOOGLE_PLAY_PACKAGE = 'com.abullsapp.app';
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
const leaderboardReady = new WeakMap();
const bullionReady = new WeakMap();
const retentionReady = new WeakMap();
let googlePlayAccessToken = { value: '', expiresAt: 0 };

// This is the single authoritative Bullion catalog. The Pages client never
// hardcodes pack values or item prices; it renders this Worker-supplied object.
// Bullion is closed-loop game currency: no transfer, cash-out, wallet,
// signature, crypto purchase, or blockchain transaction exists in this model.
// Non-Play purchases use Stripe-hosted card checkout; the App never receives
// card numbers and credits only a Stripe-signed successful webhook.
const BULLION_PACKS = Object.freeze({
  bullion_500: Object.freeze({ amount: 500, label: '500 Bullion', usdCents: 99 }),
  bullion_2800: Object.freeze({ amount: 2800, label: '2,800 Bullion', usdCents: 499 }),
  bullion_6500: Object.freeze({ amount: 6500, label: '6,500 Bullion', usdCents: 999 }),
  bullion_15000: Object.freeze({ amount: 15000, label: '15,000 Bullion', usdCents: 1999 }),
  bullion_40000: Object.freeze({ amount: 40000, label: '40,000 Bullion', usdCents: 4999 }),
  bullion_90000: Object.freeze({ amount: 90000, label: '90,000 Bullion', usdCents: 9999 })
});
const BULL_STORE_ITEMS = Object.freeze({
  ship_skin_surge: Object.freeze({ name:'Surge Ship Finish',price:1800,type:'cosmetic',description:'Visual ship finish only; no stat change.' }),
  ship_skin_blackout: Object.freeze({ name:'Blackout Ship Finish',price:2400,type:'cosmetic',description:'Visual ship finish only; no stat change.' }),
  blitz_uniform_afterglow: Object.freeze({ name:'Afterglow Uniform',price:1400,type:'cosmetic',description:'Blitz Bowl uniform colors only.' }),
  blitz_td_particles: Object.freeze({ name:'Validator Confetti',price:1200,type:'cosmetic',description:'Touchdown particles only.' }),
  profile_blitz_champ: Object.freeze({ name:'Blitz League Profile Plate',price:900,type:'status',description:'Profile presentation only.' })
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const publicRoute = isPublicApiRoute(url.pathname, request.method);
    const cors = corsHeaders(request, env, publicRoute);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // Wallet, NFT, market and leaderboard endpoints only expose public data or
    // anonymous, server-validated scores. They intentionally support the hosted
    // Pages site, an installed PWA/TWA, and read-only preview shells. Google
    // identity remains origin-restricted because it carries a user session.
    if (!publicRoute && !originAllowed(request, env)) return json({ ok: false, error: { message: 'Origin not allowed' } }, 403, cors);

    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const authRoute = url.pathname.startsWith('/api/auth/');
      const billingRoute = url.pathname.startsWith('/api/billing/');
      const imageRoute = url.pathname === '/api/nft/image';
      const lifeRoute = url.pathname === '/api/life/reflect';
      if (!await rateLimit(env, ip + ':' + url.pathname, lifeRoute ? 8 : billingRoute ? 30 : authRoute ? 20 : imageRoute ? 120 : 75, 60_000)) {
        return json({ ok: false, error: { message: 'Too many requests. Try again shortly.' } }, 429, cors);
      }
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({
          ok: true,
          version: VERSION,
          services: {
            googleAuth: Boolean(env.GOOGLE_CLIENT_ID && env.AUTH_SESSION_SECRET),
            nftAnalytics: Boolean(env.HELIUS_API_KEY),
            bullpenEcosystemAnalytics: Boolean(env.HELIUS_API_KEY),
            market: true,
            walletAnalytics: Boolean(env.HELIUS_API_KEY),
            ansemOnchain: Boolean(env.HELIUS_API_KEY),
            lifeReflection: Boolean(env.HELIUS_API_KEY && env.AI),
            leaderboard: Boolean(env.LEADERBOARD_DB && env.AUTH_SESSION_SECRET),
            leaderboardBound: Boolean(env.LEADERBOARD_DB),
            retention: Boolean(env.LEADERBOARD_DB && env.AUTH_SESSION_SECRET),
            bullionLedger: false,
            googlePlayBilling: false,
            stripeCardCheckout: false
          }
        }, 200, cors);
      }
      if (url.pathname === '/api/auth/google/config' && request.method === 'GET') return googleConfig(env, cors);
      if (url.pathname === '/api/auth/google' && request.method === 'POST') return verifyGoogle(request, env, cors);
      if (url.pathname === '/api/auth/google/session' && request.method === 'GET') return googleSession(request, env, cors);
      if (url.pathname === '/api/auth/player-session' && request.method === 'POST') return playerSession(env, cors);
      if (billingRoute && !commerceEnabled(env)) return json({ ok: false, error: { message: 'Commerce is not available in this release' } }, 404, cors);
      if (url.pathname === '/api/billing/config' && request.method === 'GET') return billingConfig(request, env, cors);
      if (url.pathname === '/api/billing/balance' && request.method === 'GET') return billingBalance(request, env, cors);
      if (url.pathname === '/api/billing/verify-purchase' && request.method === 'POST') return billingVerifyPurchase(request, env, cors);
      if (url.pathname === '/api/billing/spend' && request.method === 'POST') return billingSpend(request, env, cors);
      if (url.pathname === '/api/billing/stripe/checkout' && request.method === 'POST') return billingStripeCheckout(request, env, cors);
      if (url.pathname === '/api/billing/stripe/webhook' && request.method === 'POST') return billingStripeWebhook(request, env, cors);
      if (url.pathname === '/api/nft/profile' && request.method === 'GET') return nftProfile(url, env, cors);
      if (url.pathname === '/api/nft/collection-traits' && request.method === 'GET') return nftCollectionTraits(env, cors);
      if (url.pathname === '/api/nft/collection-stats' && request.method === 'GET') return nftCollectionStats(env, cors);
      if (url.pathname === '/api/nft/ecosystem-stats' && request.method === 'GET') return nftEcosystemStats(env, cors);
      if (url.pathname === '/api/nft/image' && request.method === 'GET') return nftImage(url, env, cors);
      if (url.pathname === '/api/leaderboard/top' && request.method === 'GET') return leaderboardTop(url, env, cors);
      if (url.pathname === '/api/leaderboard/challenge' && request.method === 'POST') return leaderboardChallenge(request, env, cors);
      if (url.pathname === '/api/leaderboard/submit' && request.method === 'POST') return leaderboardSubmit(request, env, cors);
      if (url.pathname === '/api/daily/today' && request.method === 'GET') return dailyToday(request, env, cors);
      if (url.pathname === '/api/weekly/today' && request.method === 'GET') return weeklyToday(env, cors);
      if (url.pathname === '/api/daily/submit' && request.method === 'POST') return dailySubmit(request, env, cors);
      if (url.pathname === '/api/daily/top' && request.method === 'GET') return dailyTop(url, env, cors);
      if (url.pathname === '/api/medals' && request.method === 'GET') return medalsGet(request, env, cors);
      if (url.pathname === '/api/crews/create' && request.method === 'POST') return crewsCreate(request, env, cors);
      if (url.pathname === '/api/crews/join' && request.method === 'POST') return crewsJoin(request, env, cors);
      if (url.pathname === '/api/crews/leave' && request.method === 'POST') return crewsLeave(request, env, cors);
      if (url.pathname === '/api/crews/status' && request.method === 'GET') return crewsStatus(request, env, cors);
      if (url.pathname === '/api/community/goal' && request.method === 'GET') return communityGoal(env, cors);

      if (url.pathname === '/api/ansem/market' && request.method === 'GET') return market(env, cors);
      if (url.pathname === '/api/ansem/onchain' && request.method === 'GET') return ansemOnchain(env, cors);
      if (url.pathname === '/api/wallet/overview' && request.method === 'POST') return walletOverview(request, env, cors);
      if (url.pathname === '/api/wallet/activity' && request.method === 'POST') return walletActivity(request, env, cors);
      if (url.pathname === '/api/life/reflect' && request.method === 'POST') return lifeReflect(request, env, cors);
      return json({ ok: false, error: { message: 'Route not found' } }, 404, cors);
    } catch (error) {
      return json({ ok: false, error: { message: error?.message || 'Unexpected Worker error' } }, Number(error?.status || 500), cors);
    }
  }
};

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://abullsapp.com,https://black-bull-run-sol.pages.dev,http://localhost:8788,http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map(value => value.trim()).filter(Boolean);
}
function isPublicApiRoute(pathname, method) {
  const verb = method === 'OPTIONS' ? null : method;
  if (pathname === '/api/health') return verb === null || verb === 'GET';
  if (pathname === '/api/nft/profile' || pathname === '/api/nft/collection-traits' || pathname === '/api/nft/collection-stats' || pathname === '/api/nft/ecosystem-stats' || pathname === '/api/nft/image') return verb === null || verb === 'GET';
  if (pathname === '/api/leaderboard/top') return verb === null || verb === 'GET';
  if (pathname === '/api/ansem/market' || pathname === '/api/ansem/onchain') return verb === null || verb === 'GET';
  if (pathname === '/api/wallet/overview' || pathname === '/api/wallet/activity') return verb === null || verb === 'POST';
  if (pathname === '/api/life/reflect') return verb === null || verb === 'POST';
  return false;
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
    headers: { ...extra, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff' }
  });
}
async function rateLimit(env, key, max, windowMs) {
  if (env.RATE_LIMITER?.limit) {
    const result = await env.RATE_LIMITER.limit({ key });
    return result?.success !== false;
  }
  const now = Date.now();
  const prior = memoryRates.get(key);
  if (!prior || now - prior.startedAt > windowMs) {
    memoryRates.set(key, { startedAt: now, count: 1 });
    if (memoryRates.size > 5000) memoryRates.delete(memoryRates.keys().next().value);
    return true;
  }
  prior.count++;
  return prior.count <= max;
}
function validAddress(value) { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || '')); }
function requireHelius(env) {
  if (!env.HELIUS_API_KEY) throw new Error('HELIUS_API_KEY is not configured');
  return env.HELIUS_API_KEY;
}
async function cacheGet(env, key) {
  if (env.ANALYTICS_CACHE?.get) {
    try {
      const shared = await env.ANALYTICS_CACHE.get(key, 'json');
      if (shared != null) return shared;
    } catch (_) {}
  }
  const entry = responseCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) { responseCache.delete(key); return null; }
  return structuredClone(entry.value);
}
async function cachePut(env, key, value, ttlMs) {
  responseCache.set(key, { expiresAt: Date.now() + ttlMs, value: structuredClone(value) });
  if (responseCache.size > 150) responseCache.delete(responseCache.keys().next().value);
  if (env.ANALYTICS_CACHE?.put) {
    try {
      await env.ANALYTICS_CACHE.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000)) });
    } catch (_) {}
  }
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
    db.prepare('CREATE INDEX IF NOT EXISTS idx_run_submissions_account_created ON run_submissions(account_id, created_at DESC)')
    ]).catch(error => { leaderboardReady.delete(db); throw error; });
    leaderboardReady.set(db, ready);
  }
  await ready;
  return db;
}
function boundedInt(value, max = 100_000_000) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= max ? number : null;
}
function cleanAlias(value) {
  return String(value || 'Bull').replace(/[^a-zA-Z0-9_. -]/g, '').trim().slice(0, 24) || 'Bull';
}
function physicallyPossibleRun(run) {
  const seconds = run.elapsedMs / 1000;
  if (run.elapsedMs < 1000 || run.elapsedMs > 6 * 60 * 60 * 1000) return false;
  return run.score <= seconds * 8500 + 250000 && run.kills <= seconds * 85 + 150 && run.bossesDefeated <= 19;
}
async function leaderboardChallenge(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Ranked play is not configured' } }, 503, cors);
  let account;
  try { account = await retentionAccount(request, env); }
  catch (error) { return json({ ok: false, error: { message: error.message } }, Number(error.status || 401), cors); }
  const body = await request.json().catch(() => ({}));
  const game = String(body.game || 'bull-invaders');
  const mode = String(body.mode || '');
  if (!COMPETITIVE_GAMES.has(game) || !['ranked', 'daily'].includes(mode)) {
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
  const account = await retentionAccount(request, env);
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
  const body = await request.json().catch(() => ({}));
  const game = String(body.game || '');
  if (!COMPETITIVE_GAMES.has(game)) return json({ ok: false, error: { message: 'Unsupported game' } }, 400, cors);
  const mode = String(body.mode || '');
  if (mode === 'arcade' || body.purchasedItemsActive === true) {
    return json({ ok: false, error: { message: 'Arcade runs are not eligible for the server-screened leaderboard' } }, 403, cors);
  }
  if (mode !== 'ranked') return json({ ok: false, error: { message: 'A Ranked mode tag is required' } }, 400, cors);
  const run = {
    game,
    score: boundedInt(body.score),
    elapsedMs: boundedInt(body.elapsedMs, 6 * 60 * 60 * 1000),
    kills: boundedInt(body.kills, 1_000_000),
    bossesDefeated: boundedInt(body.bossesDefeated, 19),
    nonce: String(body.nonce || '')
  };
  if (Object.values(run).some(value => value === null) || !/^[a-zA-Z0-9-]{8,80}$/.test(run.nonce)) return json({ ok: false, error: { message: 'Invalid run payload' } }, 400, cors);
  const challengeId = String(body.challengeId || '');
  const canonical = ['abulls-v7.0.1', mode, run.game, run.score, run.elapsedMs, run.kills, run.bossesDefeated, run.nonce, challengeId].join('|');
  const expectedHash = await sha256Hex(canonical);
  if (!/^[a-f0-9]{64}$/.test(String(body.replayHash || '')) || expectedHash !== body.replayHash) return json({ ok: false, error: { message: 'Replay hash validation failed' } }, 400, cors);
  if (!physicallyPossibleRun(run) || (game === 'blitz-bowl' && (run.elapsedMs > 900000 || run.score > 250000 || run.kills > 500 || run.bossesDefeated > 30))) return json({ ok: false, error: { message: 'Score failed physics sanity bounds' } }, 422, cors);
  let verified;
  try { verified = await verifyRunChallenge(request, body, env, game, mode); }
  catch (error) { return json({ ok: false, error: { message: error.message } }, Number(error.status || 401), cors); }
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
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)));
  const db = await ensureLeaderboard(env);
  const query = await db.prepare(`SELECT alias, score, elapsed_ms AS elapsedMs, kills,
    bosses_defeated AS bossesDefeated, created_at AS createdAt
    FROM leaderboard_scores WHERE game = ? ORDER BY score DESC, created_at ASC LIMIT ?`).bind(game, limit).all();
  return json({ ok: true, data: { game, scores: query?.results || [] } }, 200, cors, 'public, max-age=15');
}

async function rpc(env, method, params) {
  const key = requireHelius(env);
  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `Helius RPC ${method} failed`);
  return payload.result;
}
async function heliusWallet(env, path, params = {}) {
  const key = requireHelius(env);
  const url = new URL('https://api.helius.xyz' + path);
  url.searchParams.set('api-key', key);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(name, String(value));
  });
  const response = await fetch(url, { headers: { Accept: 'application/json', 'X-Api-Key': key } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || payload.message || `Helius Wallet API HTTP ${response.status}`);
  return payload;
}
async function settled(promise, fallback, warnings, label) {
  try { return await promise; }
  catch (error) { warnings.push(label + ': ' + error.message); return fallback; }
}

async function walletOverview(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const address = String(body.address || '');
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  requireHelius(env);
  const cacheKey = 'overview:' + address;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json({ ok: true, data: cached, cached: true, updatedAt: new Date().toISOString() }, 200, cors);

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
    warnings
  };
  await cachePut(env, cacheKey, data, 10_000);
  return json({ ok: true, data, updatedAt: new Date().toISOString() }, 200, cors);
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
  const daily = new Map();
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
      daily.set(day, (daily.get(day) || 0) + 1);
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
    dailyBuckets: [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count })),
    heatCells: heat.map((v, index) => ({ v, label: 'activity-' + index })),
    recent
  };
}

async function walletActivity(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const address = String(body.address || '');
  const range = ['24h', '7d', '30d', '90d', 'all'].includes(body.range) ? body.range : '24h';
  const limit = Math.min(100, Math.max(1, Number(body.limit) || 100));
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  requireHelius(env);
  const cacheKey = `activity:${address}:${range}`;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json({ ok: true, data: cached, cached: true, updatedAt: new Date().toISOString() }, 200, cors);

  const cutoff = range === 'all' ? 0 : Math.floor(Date.now() / 1000) - rangeSeconds(range);
  const maxPages = range === '24h' ? 2 : range === '7d' ? 3 : 4;
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
    sources: ['Helius Wallet History API']
  };
  await cachePut(env, cacheKey, data, 15_000);
  return json({ ok: true, data, updatedAt: new Date().toISOString() }, 200, cors);
}

const LIFE_SYSTEM_PROMPT = `You generate Socratic reflection questions from public blockchain trading patterns.
Rules: output only a JSON array of 6 to 8 concise questions. Every item must end with a question mark.
Ask; never diagnose, assert motives, or claim why a person acted. Never infer anxiety, addiction, panic,
financial stress, mental health, income, relationships, or personal circumstances. Do not give financial advice.
Use conditional, observational language such as "What, if anything..." and "How did you decide...".
Treat transfers as ambiguous: they may not be trades. Do not identify the wallet owner.`;

function safeLifeQuestions(analytics) {
  const trading = analytics.trading || {};
  const questions = [
    `What, if anything, do you notice about being most active around ${trading.busiestHour == null ? 'different times' : `${String(trading.busiestHour).padStart(2, '0')}:00 UTC` }?`,
    `How did you decide which of the ${trading.uniqueMints || 0} visible assets were worth revisiting?`,
    `When activity clustered on ${trading.busiestWeekday || 'particular days'}, what information were you using at the time?`,
    `What criteria helped you distinguish a planned trade from a quick reaction?`,
    `Looking across ${trading.activeDays || 0} active days, which decisions would you want to understand more clearly?`,
    `What would you record before a future trade so you could evaluate the decision later without relying on its outcome?`
  ];
  return questions;
}
function sanitizeLifeQuestions(value, fallback) {
  const banned = /\b(anxious|anxiety|addict|addiction|panic|depress|manic|trauma|financial stress|you are|you were|you felt|because you)\b/i;
  const source = Array.isArray(value) ? value : [];
  const safe = source.map(item => String(item || '').trim()).filter(item =>
    item.endsWith('?') && item.length >= 18 && item.length <= 260 && !banned.test(item)
  ).slice(0, 8);
  return safe.length >= 6 ? safe : fallback;
}
async function lifeReflect(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const address = String(body.address || '').trim();
  if (!validAddress(address)) return json({ ok: false, error: { message: 'Invalid Solana address' } }, 400, cors);
  requireHelius(env);
  const transactions = [];
  let before = null, hasMore = true, pagesFetched = 0;
  for (let page = 0; page < 50 && hasMore; page++) {
    const payload = await heliusWallet(env, `/v1/wallet/${encodeURIComponent(address)}/history`, { limit: 100, before, tokenAccounts: 'balanceChanged' });
    const list = Array.isArray(payload.data) ? payload.data : [];
    transactions.push(...list); pagesFetched++;
    hasMore = payload.pagination?.hasMore === true;
    before = payload.pagination?.nextCursor || null;
    if (!list.length || !before) break;
  }
  const analytics = activityAnalytics(transactions, env.ANSEM_MINT || DEFAULT_ANSEM_MINT);
  const fallback = safeLifeQuestions(analytics);
  let generated = fallback;
  if (env.AI?.run) {
    const compact = {
      transactions: transactions.length, pagesFetched, historyComplete: !hasMore,
      trading: analytics.trading, flow: analytics.flow,
      dailyBuckets: analytics.dailyBuckets.slice(-90),
      topFlows: analytics.topFlows.slice(0, 12).map(({ symbol, in: incoming, out, net }) => ({ symbol, incoming, out, net })),
      recent: analytics.recent.slice(0, 24).map(({ blockTime, type, summary }) => ({ blockTime, type, summary }))
    };
    const result = await env.AI.run(env.LIFE_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'system', content: LIFE_SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify(compact) }],
      temperature: .45, max_tokens: 900
    });
    const raw = String(result?.response || result || '');
    let parsed = [];
    try { parsed = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch (_) {}
    generated = sanitizeLifeQuestions(parsed, fallback);
  }
  return json({ ok: true, data: {
    questions: generated, signaturesAnalyzed: transactions.length, pagesFetched,
    historyComplete: !hasMore, publicDataOnly: true, persisted: false,
    disclaimer: 'Reflection and entertainment only; not financial or psychological advice.'
  } }, 200, cors);
}

async function market(env, cors) {
  const mint = env.ANSEM_MINT || DEFAULT_ANSEM_MINT;
  const cacheKey = 'market:' + mint;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json({ ok: true, data: cached, cached: true, updatedAt: new Date().toISOString(), source: ['DexScreener'] }, 200, cors, 'public, max-age=10');
  const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + encodeURIComponent(mint), { headers: { Accept: 'application/json' }, cf: { cacheTtl: 15, cacheEverything: true } });
  if (!response.ok) throw new Error('DexScreener is unavailable');
  const payload = await response.json();
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  const pair = pairs.sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0))[0];
  if (!pair) throw new Error('No Solana market pair found');
  const data = {
    priceUsd: Number(pair.priceUsd),
    priceChange: pair.priceChange || {},
    liquidityUsd: Number(pair.liquidity?.usd || 0),
    volume: pair.volume || {},
    txns: pair.txns || {},
    marketCap: pair.marketCap == null ? null : Number(pair.marketCap),
    fdv: pair.fdv == null ? null : Number(pair.fdv),
    dexId: pair.dexId,
    pairAddress: pair.pairAddress,
    pairUrl: pair.url,
    pairCreatedAt: pair.pairCreatedAt || null,
    baseToken: pair.baseToken,
    quoteToken: pair.quoteToken,
    quoteSymbol: pair.quoteToken?.symbol || null
  };
  await cachePut(env, cacheKey, data, 15_000);
  return json({ ok: true, data, updatedAt: new Date().toISOString(), source: ['DexScreener'] }, 200, cors, 'public, max-age=10');
}

async function scanFundedHolders(env, mint, warnings) {
  const limit = 1000;
  const maxPages = 40;
  const owners = new Set();
  let fundedTokenAccounts = 0;
  let pagesScanned = 0;

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
      let funded = false;
      try { funded = BigInt(String(account?.amount ?? '0')) > 0n; }
      catch (_) { funded = Number(account?.amount || 0) > 0; }
      if (!funded) continue;
      fundedTokenAccounts++;
      if (validAddress(account?.owner)) owners.add(account.owner);
    }

    if (accounts.length < limit) {
      return {
        holderCount: owners.size,
        fundedTokenAccounts,
        pagesScanned,
        complete: true
      };
    }
  }

  warnings.push(`holder scan reached its ${maxPages * limit} account safety ceiling`);
  return {
    holderCount: owners.size,
    fundedTokenAccounts,
    pagesScanned,
    complete: false
  };
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function encodeBase58(bytes) {
  if (!bytes?.length) return '';
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index++) {
      const value = digits[index] * 256 + carry;
      digits[index] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let result = '';
  for (let index = 0; index < bytes.length - 1 && bytes[index] === 0; index++) result += '1';
  for (let index = digits.length - 1; index >= 0; index--) result += BASE58_ALPHABET[digits[index]];
  return result;
}
function littleEndianU64(bytes, offset = 0) {
  let value = 0n;
  for (let index = 7; index >= 0; index--) value = value * 256n + BigInt(bytes[offset + index] || 0);
  return value;
}
async function scanProgramHolders(env, programId, mint) {
  const accounts = await rpc(env, 'getProgramAccounts', [programId, {
    commitment: 'confirmed',
    encoding: 'base64',
    filters: [{ memcmp: { offset: 0, bytes: mint } }],
    dataSlice: { offset: 32, length: 40 }
  }]);
  const owners = new Set();
  let fundedTokenAccounts = 0;
  for (const item of Array.isArray(accounts) ? accounts : []) {
    const encoded = Array.isArray(item?.account?.data) ? item.account.data[0] : item?.account?.data;
    if (typeof encoded !== 'string') continue;
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    if (bytes.length < 40 || littleEndianU64(bytes, 32) <= 0n) continue;
    const owner = encodeBase58(bytes.slice(0, 32));
    fundedTokenAccounts++;
    if (validAddress(owner)) owners.add(owner);
  }
  return { holderCount: owners.size, fundedTokenAccounts, pagesScanned: 1, complete: true, method: 'Solana getProgramAccounts' };
}

async function ansemOnchain(env, cors) {
  const mint = env.ANSEM_MINT || DEFAULT_ANSEM_MINT;
  const cacheKey = 'ansem:onchain:' + mint;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json({ ok: true, data: cached, cached: true, updatedAt: new Date().toISOString(), source: ['Helius DAS', 'Solana RPC'] }, 200, cors, 'public, max-age=10');
  requireHelius(env);

  const warnings = [];
  const [asset, dasHolders, supply, largest] = await Promise.all([
    settled(rpc(env, 'getAsset', { id: mint, displayOptions: { showFungible: true } }), null, warnings, 'token metadata'),
    settled(scanFundedHolders(env, mint, warnings), { holderCount: null, fundedTokenAccounts: null, pagesScanned: 0, complete: false }, warnings, 'holder scan'),
    settled(rpc(env, 'getTokenSupply', [mint, { commitment: 'confirmed' }]), null, warnings, 'token supply'),
    settled(rpc(env, 'getTokenLargestAccounts', [mint, { commitment: 'confirmed' }]), { value: [] }, warnings, 'largest accounts')
  ]);

  let holders = dasHolders;
  if (!Number.isFinite(Number(holders?.holderCount)) || Number(holders.holderCount) <= 1 || holders?.complete !== true) {
    const detectedProgram = validAddress(asset?.token_info?.token_program) ? asset.token_info.token_program : TOKEN_2022_PROGRAM;
    const programCandidates = [...new Set([detectedProgram, TOKEN_2022_PROGRAM, TOKEN_PROGRAM])];
    for (const programId of programCandidates) {
      try {
        const verified = await scanProgramHolders(env, programId, mint);
        if (verified.fundedTokenAccounts > 0 || programId === programCandidates.at(-1)) {
          if (Number(verified.holderCount) >= Number(holders?.holderCount || 0)) holders = verified;
          break;
        }
      } catch (error) {
        warnings.push(`raw holder verification (${programId.slice(0, 6)}…): ${error.message}`);
      }
    }
  }

  const decimals = Number(asset?.token_info?.decimals ?? supply?.value?.decimals ?? 0);
  const rawSupply = Number(asset?.token_info?.supply ?? supply?.value?.amount ?? 0);
  const displaySupply = supply?.value?.uiAmountString != null ? Number(supply.value.uiAmountString) : rawSupply / (10 ** decimals);
  const largestValues = Array.isArray(largest?.value) ? largest.value.map(item => Number(item.uiAmountString ?? item.uiAmount ?? 0)) : [];
  const share = count => displaySupply > 0 ? Number((largestValues.slice(0, count).reduce((sum, value) => sum + value, 0) / displaySupply * 100).toFixed(3)) : null;
  const data = {
    mint,
    name: asset?.content?.metadata?.name || asset?.token_info?.symbol || 'ANSEM',
    symbol: asset?.content?.metadata?.symbol || 'ANSEM',
    decimals,
    supply: displaySupply,
    holderCount: Number.isFinite(Number(holders?.holderCount)) ? Number(holders.holderCount) : null,
    holderAccounts: Number.isFinite(Number(holders?.holderCount)) ? Number(holders.holderCount) : null,
    fundedTokenAccounts: Number.isFinite(Number(holders?.fundedTokenAccounts)) ? Number(holders.fundedTokenAccounts) : null,
    holderPagesScanned: Number(holders?.pagesScanned || 0),
    holderScanComplete: holders?.complete === true,
    holderMethod: holders?.method || 'Helius DAS getTokenAccounts',
    top10Percent: share(10),
    top20Percent: share(20),
    largestAccountPercent: share(1),
    largestAccountsAnalyzed: largestValues.length,
    mintAuthority: asset?.token_info?.mint_authority ?? null,
    freezeAuthority: asset?.token_info?.freeze_authority ?? null,
    tokenProgram: asset?.token_info?.token_program || null,
    warnings
  };
  await cachePut(env, cacheKey, data, 60_000);
  return json({ ok: true, data, updatedAt: new Date().toISOString(), source: ['Helius DAS', 'Solana RPC'] }, 200, cors, 'public, max-age=10');
}

/* Small cryptographic helpers shared by Google ID-token sessions. */
function base64url(bytes) {
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decodeBase64url(value) {
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
  const [body, signature, extra] = String(token || '').split('.');
  if (!body || !signature || extra) throw Object.assign(new Error('Invalid session'), { status: 401 });
  const expected = await sign(body, env.AUTH_SESSION_SECRET);
  if (!secureEqual(signature, expected)) throw Object.assign(new Error('Invalid session'), { status: 401 });
  const payload = jsonFromBase64url(body);
  if (!payload.exp || payload.exp < Date.now()) throw Object.assign(new Error('Session expired'), { status: 401 });
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
async function googleKeys() {
  if (googleKeysCache.expiresAt > Date.now() && googleKeysCache.keys.length) return googleKeysCache.keys;
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Google signing keys are temporarily unavailable');
  const payload = await response.json();
  googleKeysCache = { keys: Array.isArray(payload.keys) ? payload.keys : [], expiresAt: Date.now() + 45 * 60_000 };
  return googleKeysCache.keys;
}
async function validateGoogleIdToken(token, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.AUTH_SESSION_SECRET) throw new Error('Google sign in is not configured');
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid Google credential');
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = jsonFromBase64url(headerPart), claims = jsonFromBase64url(payloadPart);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Google credential');
  const jwk = (await googleKeys()).find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) { googleKeysCache.expiresAt = 0; throw new Error('Google signing key was not found; retry once'); }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64url(signaturePart), encoder.encode(headerPart + '.' + payloadPart));
  if (!verified) throw new Error('Google credential signature is invalid');
  const now = Math.floor(Date.now() / 1000), audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) throw new Error('Google credential issuer is invalid');
  if (!audience.includes(env.GOOGLE_CLIENT_ID)) throw new Error('Google credential is for a different app');
  if (!claims.exp || claims.exp < now - 30 || claims.iat > now + 120 || (claims.nbf && claims.nbf > now + 30)) throw new Error('Google credential has expired or is not active');
  if (!claims.sub || claims.email_verified !== true) throw new Error('A verified Google account is required');
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
  const body = await request.json().catch(() => ({}));
  const user = await validateGoogleIdToken(body.credential, env);
  const sessionToken = await issueGoogleSession(user, env);
  return json({ ok: true, data: { user, sessionToken, expiresIn: 7 * 86400 } }, 200, cors);
}
async function googleSession(request, env, cors) {
  const match = String(request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ ok: false, error: { message: 'Session token required' } }, 401, cors);
  try { return json({ ok: true, data: await readGoogleSession(match[1], env) }, 200, cors); }
  catch (error) { return json({ ok: false, error: { message: error.message } }, 401, cors); }
}
async function playerSession(env, cors) {
  if (!env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Player sessions are not configured' } }, 503, cors);
  const accountId = await sha256Hex('player:' + crypto.randomUUID());
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 365 * 86400_000;
  const sessionToken = await issueToken({ purpose: 'player-session', accountId, iat: issuedAt, exp: expiresAt }, env.AUTH_SESSION_SECRET);
  return json({ ok: true, data: { sessionToken, expiresAt } }, 200, cors);
}
async function retentionAccount(request, env) {
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

/* Closed-loop Bullion ledger and Google Play Billing verification. */
function commerceEnabled(env) {
  return String(env.COMMERCE_ENABLED || '').toLowerCase() === 'true';
}
function bearerToken(request) {
  return String(request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1] || '';
}
async function billingAccount(request, env) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error('Google sign-in is required for Bullion'), { status: 401 });
  const user = await readGoogleSession(token, env).catch(error => {
    throw Object.assign(new Error(error.message), { status: 401 });
  });
  return { id: await sha256Hex('google:' + user.sub), user };
}
function bullionDb(env) {
  if (!env.LEADERBOARD_DB) throw Object.assign(new Error('Bullion ledger is not configured'), { status: 503 });
  return env.LEADERBOARD_DB;
}
async function ensureBullion(env) {
  const db = bullionDb(env);
  let ready = bullionReady.get(db);
  if (!ready) {
    ready = db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS bullion_balance (
      account_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
      updated_at TEXT NOT NULL,
      last_operation_id TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS bullion_transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('purchase_credit', 'item_debit', 'entitlement_use')),
      amount INTEGER NOT NULL,
      item_id TEXT,
      product_id TEXT,
      source_ref TEXT UNIQUE,
      created_at TEXT NOT NULL
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_bullion_transactions_account_created ON bullion_transactions(account_id, created_at DESC)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS bullion_entitlements (
      account_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      unlocked_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_operation_id TEXT,
      PRIMARY KEY (account_id, item_id)
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_bullion_entitlements_account ON bullion_entitlements(account_id)')
    ]).catch(error => { bullionReady.delete(db); throw error; });
    bullionReady.set(db, ready);
  }
  await ready;
  return db;
}
function bullionCatalog(env) {
  const enabled = commerceEnabled(env);
  const googlePlayEnabled = enabled && Boolean(env.LEADERBOARD_DB && env.GOOGLE_PLAY_SERVICE_ACCOUNT);
  const stripeCardEnabled = enabled && Boolean(env.LEADERBOARD_DB && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
  return {
    currency: { id: 'bullion', name: 'Bullion', transferable: false, redeemable: false, crypto: false },
    billingChannels: { googlePlay: googlePlayEnabled, stripeCard: stripeCardEnabled },
    packageName: String(env.GOOGLE_PLAY_PACKAGE_NAME || DEFAULT_GOOGLE_PLAY_PACKAGE),
    purchaseEnabled: googlePlayEnabled || stripeCardEnabled,
    packs: Object.entries(BULLION_PACKS).map(([id, value]) => ({
      id, amount: value.amount, label: value.label,
      fiat: { currency: 'USD', amount: value.usdCents, formatted: '$' + (value.usdCents / 100).toFixed(2) }
    })),
    items: Object.entries(BULL_STORE_ITEMS).map(([id, value]) => ({ id, ...value }))
  };
}
async function bullionSnapshot(db, accountId) {
  const balanceRow = await db.prepare('SELECT balance, updated_at AS updatedAt FROM bullion_balance WHERE account_id = ?').bind(accountId).first();
  const entitlementsQuery = await db.prepare(`SELECT item_id AS itemId, quantity, unlocked_at AS unlockedAt, updated_at AS updatedAt
    FROM bullion_entitlements WHERE account_id = ? AND quantity > 0 ORDER BY item_id`).bind(accountId).all();
  const entitlements = {};
  for (const row of entitlementsQuery?.results || []) entitlements[row.itemId] = {
    quantity: Number(row.quantity || 0), unlockedAt: row.unlockedAt, updatedAt: row.updatedAt
  };
  return { balance: Number(balanceRow?.balance || 0), updatedAt: balanceRow?.updatedAt || null, entitlements };
}
function billingError(error, cors) {
  return json({ ok: false, error: { message: error?.message || 'Billing request failed' } }, Number(error?.status || 500), cors);
}
async function billingConfig(_request, env, cors) {
  return json({ ok: true, data: bullionCatalog(env) }, 200, cors, 'private, max-age=60');
}
async function billingBalance(request, env, cors) {
  try {
    const account = await billingAccount(request, env);
    const db = await ensureBullion(env);
    return json({ ok: true, data: await bullionSnapshot(db, account.id) }, 200, cors);
  } catch (error) { return billingError(error, cors); }
}

async function creditBullionPurchase(db, accountId, productId, amount, sourceRef) {
  const operationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const results = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO bullion_transactions
      (id, account_id, kind, amount, product_id, source_ref, created_at)
      VALUES (?, ?, 'purchase_credit', ?, ?, ?, ?)`).bind(operationId, accountId, amount, productId, sourceRef, now),
    db.prepare(`INSERT OR IGNORE INTO bullion_balance (account_id, balance, updated_at, last_operation_id)
      VALUES (?, 0, ?, NULL)`).bind(accountId, now),
    db.prepare(`UPDATE bullion_balance SET balance = balance + ?, updated_at = ?, last_operation_id = ?
      WHERE account_id = ? AND EXISTS (SELECT 1 FROM bullion_transactions WHERE id = ? AND account_id = ?)`)
      .bind(amount, now, operationId, accountId, operationId, accountId)
  ]);
  if (Number(results?.[0]?.meta?.changes || 0) !== 1) return { credited: false, snapshot: await bullionSnapshot(db, accountId) };
  return { credited: true, snapshot: await bullionSnapshot(db, accountId) };
}
function serviceAccount(env) {
  let parsed;
  try { parsed = JSON.parse(String(env.GOOGLE_PLAY_SERVICE_ACCOUNT || '')); }
  catch (_) { throw Object.assign(new Error('Google Play service account is invalid'), { status: 503 }); }
  if (!parsed?.client_email || !parsed?.private_key) throw Object.assign(new Error('Google Play service account is incomplete'), { status: 503 });
  return parsed;
}
function pkcs8Bytes(pem) {
  const value = String(pem || '').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, '');
  if (!value) throw new Error('Google Play private key is missing');
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
async function googlePlayToken(env) {
  if (googlePlayAccessToken.value && googlePlayAccessToken.expiresAt > Date.now() + 60_000) return googlePlayAccessToken.value;
  const account = serviceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64url(encoder.encode(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: account.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })));
  const signingInput = header + '.' + claims;
  const key = await crypto.subtle.importKey('pkcs8', pkcs8Bytes(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = base64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput))));
  const tokenUrl = account.token_uri || 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signingInput + '.' + signature })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw Object.assign(new Error(payload.error_description || 'Google Play authorization failed'), { status: 503 });
  googlePlayAccessToken = { value: payload.access_token, expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 3600)) * 1000 };
  return googlePlayAccessToken.value;
}
function playPurchaseUrl(env, productId, purchaseToken) {
  const packageName = encodeURIComponent(String(env.GOOGLE_PLAY_PACKAGE_NAME || DEFAULT_GOOGLE_PLAY_PACKAGE));
  return `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
}
async function verifyPlayPurchase(env, productId, purchaseToken) {
  const accessToken = await googlePlayToken(env);
  const response = await fetch(playPurchaseUrl(env, productId, purchaseToken), { headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.message || 'Google Play purchase verification failed'), { status: response.status === 404 ? 400 : 502 });
  if (Number(payload.purchaseState) !== 0) throw Object.assign(new Error('Google Play purchase is not completed'), { status: 409 });
  return { quantity: Math.min(10, Math.max(1, Number(payload.quantity || 1))), orderId: String(payload.orderId || ''), purchaseTimeMillis: Number(payload.purchaseTimeMillis || 0) };
}
async function consumePlayPurchase(env, productId, purchaseToken) {
  const accessToken = await googlePlayToken(env);
  const response = await fetch(playPurchaseUrl(env, productId, purchaseToken) + ':consume', { method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: '{}' });
  return response.ok;
}
async function billingVerifyPurchase(request, env, cors) {
  try {
    const account = await billingAccount(request, env);
    const body = await request.json().catch(() => ({}));
    const productId = String(body.productId || '');
    const purchaseToken = String(body.purchaseToken || '');
    const pack = BULLION_PACKS[productId];
    if (!pack || purchaseToken.length < 20 || purchaseToken.length > 4096) throw Object.assign(new Error('Invalid Google Play purchase payload'), { status: 400 });
    const verified = await verifyPlayPurchase(env, productId, purchaseToken);
    const amount = pack.amount * verified.quantity;
    const sourceRef = await sha256Hex('play:' + purchaseToken);
    const db = await ensureBullion(env);
    const credit = await creditBullionPurchase(db, account.id, productId, amount, sourceRef);
    if (!credit.credited) throw Object.assign(new Error('This Google Play purchase was already credited'), { status: 409 });
    const finalized = await consumePlayPurchase(env, productId, purchaseToken).catch(() => false);
    return json({ ok: true, data: { ...credit.snapshot, credited: amount, productId, finalized } }, 200, cors);
  } catch (error) { return billingError(error, cors); }
}

function stripeReturnOrigin(env) {
  const value = String(env.STRIPE_RETURN_ORIGIN || 'https://abullsapp.com').replace(/\/$/, '');
  let url;
  try { url = new URL(value); }
  catch (_) { throw Object.assign(new Error('Stripe return origin is invalid'), { status: 503 }); }
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
    throw Object.assign(new Error('Stripe return origin must be an HTTPS origin'), { status: 503 });
  }
  return url.origin;
}
function stripeSecret(env) {
  const value = String(env.STRIPE_SECRET_KEY || '');
  if (!/^sk_(test|live)_/.test(value)) throw Object.assign(new Error('Stripe card checkout is not configured'), { status: 503 });
  return value;
}
async function billingStripeCheckout(request, env, cors) {
  try {
    const account = await billingAccount(request, env);
    const body = await request.json().catch(() => ({}));
    const productId = String(body.productId || '');
    const channel = body.channel === 'solana' ? 'solana' : body.channel === 'web' ? 'web' : '';
    const pack = BULLION_PACKS[productId];
    if (!pack || !channel) throw Object.assign(new Error('Invalid Stripe checkout request'), { status: 400 });
    const origin = stripeReturnOrigin(env);
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('payment_method_types[0]', 'card');
    params.set('success_url', `${origin}/?channel=${channel}&stripe_checkout=success`);
    params.set('cancel_url', `${origin}/?channel=${channel}&stripe_checkout=cancel`);
    params.set('client_reference_id', account.id);
    if (account.user?.email) params.set('customer_email', account.user.email);
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][unit_amount]', String(pack.usdCents));
    params.set('line_items[0][price_data][product_data][name]', pack.label);
    params.set('line_items[0][price_data][product_data][description]', 'Closed-loop A Bulls App game currency; no cash or crypto value.');
    params.set('metadata[account_id]', account.id);
    params.set('metadata[product_id]', productId);
    params.set('metadata[bullion_amount]', String(pack.amount));
    params.set('metadata[checkout_channel]', channel);
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + stripeSecret(env), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload?.error?.message || 'Stripe checkout could not be created'), { status: response.status >= 500 ? 502 : 400 });
    const checkoutUrl = String(payload.url || '');
    if (!/^https:\/\/checkout\.stripe\.com\//.test(checkoutUrl) || !String(payload.id || '').startsWith('cs_')) {
      throw Object.assign(new Error('Stripe returned an invalid checkout session'), { status: 502 });
    }
    return json({ ok: true, data: { url: checkoutUrl, sessionId: payload.id, productId } }, 200, cors);
  } catch (error) { return billingError(error, cors); }
}
async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return [...signature].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function verifyStripeWebhook(rawBody, signatureHeader, env) {
  const secret = String(env.STRIPE_WEBHOOK_SECRET || '');
  if (!secret.startsWith('whsec_')) throw Object.assign(new Error('Stripe webhook is not configured'), { status: 503 });
  const parts = String(signatureHeader || '').split(',').map(part => part.trim().split('='));
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1] || 0);
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatures.length) {
    throw Object.assign(new Error('Invalid or expired Stripe webhook signature'), { status: 400 });
  }
  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  if (!signatures.some(signature => secureEqual(signature, expected))) {
    throw Object.assign(new Error('Invalid Stripe webhook signature'), { status: 400 });
  }
}
async function billingStripeWebhook(request, env, cors) {
  try {
    const rawBody = await request.text();
    await verifyStripeWebhook(rawBody, request.headers.get('Stripe-Signature'), env);
    const event = JSON.parse(rawBody);
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(String(event?.type || ''))) {
      return json({ ok: true, received: true, ignored: true }, 200, cors);
    }
    const session = event?.data?.object || {};
    if (session.payment_status !== 'paid') return json({ ok: true, received: true, pending: true }, 200, cors);
    const productId = String(session.metadata?.product_id || '');
    const accountId = String(session.metadata?.account_id || '');
    const pack = BULLION_PACKS[productId];
    const cardOnly = Array.isArray(session.payment_method_types) && session.payment_method_types.length === 1 && session.payment_method_types[0] === 'card';
    if (!pack || !/^[a-f0-9]{64}$/.test(accountId) || String(session.client_reference_id || '') !== accountId ||
        Number(session.metadata?.bullion_amount) !== pack.amount || Number(session.amount_total) !== pack.usdCents ||
        String(session.currency || '').toLowerCase() !== 'usd' || session.mode !== 'payment' || !cardOnly || !String(session.id || '').startsWith('cs_')) {
      throw Object.assign(new Error('Stripe checkout metadata did not match the Bullion catalog'), { status: 400 });
    }
    const db = await ensureBullion(env);
    const sourceRef = await sha256Hex('stripe:' + session.id);
    const credit = await creditBullionPurchase(db, accountId, productId, pack.amount, sourceRef);
    return json({ ok: true, received: true, credited: credit.credited }, 200, cors);
  } catch (error) { return billingError(error, cors); }
}

async function billingSpend(request, env, cors) {
  try {
    const account = await billingAccount(request, env);
    const body = await request.json().catch(() => ({}));
    const itemId = String(body.itemId || '');
    const item = BULL_STORE_ITEMS[itemId];
    if (!item) throw Object.assign(new Error('Unknown Bull Store item'), { status: 400 });
    const immediateUse = body.immediateUse === true;
    if (immediateUse && item.type !== 'consumable') throw Object.assign(new Error('Only consumables can be used immediately'), { status: 400 });
    const db = await ensureBullion(env);
    const owned = await db.prepare('SELECT quantity FROM bullion_entitlements WHERE account_id = ? AND item_id = ?').bind(account.id, itemId).first();
    const ownedQuantity = Number(owned?.quantity || 0);
    const operationId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (immediateUse && ownedQuantity > 0) {
      const results = await db.batch([
        db.prepare(`UPDATE bullion_entitlements SET quantity = quantity - 1, updated_at = ?, last_operation_id = ?
          WHERE account_id = ? AND item_id = ? AND quantity > 0`).bind(now, operationId, account.id, itemId),
        db.prepare(`INSERT INTO bullion_transactions (id, account_id, kind, amount, item_id, source_ref, created_at)
          SELECT ?, ?, 'entitlement_use', 0, ?, ?, ? WHERE EXISTS
          (SELECT 1 FROM bullion_entitlements WHERE account_id = ? AND item_id = ? AND last_operation_id = ?)`)
          .bind(operationId, account.id, itemId, operationId, now, account.id, itemId, operationId)
      ]);
      if (Number(results?.[0]?.meta?.changes || 0) !== 1) throw Object.assign(new Error('Consumable is no longer available'), { status: 409 });
      return json({ ok: true, data: { ...(await bullionSnapshot(db, account.id)), itemId, consumed: true, paid: 0 } }, 200, cors);
    }

    if (!immediateUse && item.type !== 'consumable' && ownedQuantity > 0) throw Object.assign(new Error('This item is already unlocked'), { status: 409 });
    const permanentGuard = item.type === 'consumable' ? '1 = 1' : 'NOT EXISTS (SELECT 1 FROM bullion_entitlements WHERE account_id = ? AND item_id = ? AND quantity > 0)';
    const updateBindings = item.type === 'consumable'
      ? [item.price, now, operationId, account.id, item.price]
      : [item.price, now, operationId, account.id, item.price, account.id, itemId];
    const statements = [
      db.prepare(`INSERT OR IGNORE INTO bullion_balance (account_id, balance, updated_at, last_operation_id) VALUES (?, 0, ?, NULL)`).bind(account.id, now),
      db.prepare(`UPDATE bullion_balance SET balance = balance - ?, updated_at = ?, last_operation_id = ?
        WHERE account_id = ? AND balance >= ? AND ${permanentGuard}`).bind(...updateBindings),
      db.prepare(`INSERT INTO bullion_transactions (id, account_id, kind, amount, item_id, source_ref, created_at)
        SELECT ?, ?, 'item_debit', ?, ?, ?, ? WHERE EXISTS
        (SELECT 1 FROM bullion_balance WHERE account_id = ? AND last_operation_id = ?)`)
        .bind(operationId, account.id, -item.price, itemId, operationId, now, account.id, operationId)
    ];
    if (!immediateUse) statements.push(db.prepare(`INSERT INTO bullion_entitlements
      (account_id, item_id, quantity, unlocked_at, updated_at, last_operation_id)
      SELECT ?, ?, 1, ?, ?, ? WHERE EXISTS
      (SELECT 1 FROM bullion_balance WHERE account_id = ? AND last_operation_id = ?)
      ON CONFLICT(account_id, item_id) DO UPDATE SET
        quantity = CASE WHEN ? = 'consumable' THEN bullion_entitlements.quantity + 1 ELSE 1 END,
        updated_at = excluded.updated_at,
        last_operation_id = excluded.last_operation_id`)
      .bind(account.id, itemId, now, now, operationId, account.id, operationId, item.type));
    const results = await db.batch(statements);
    if (Number(results?.[1]?.meta?.changes || 0) !== 1) throw Object.assign(new Error('Insufficient Bullion or item already unlocked'), { status: 409 });
    return json({ ok: true, data: { ...(await bullionSnapshot(db, account.id)), itemId, consumed: immediateUse, paid: item.price } }, 200, cors);
  } catch (error) { return billingError(error, cors); }
}

/* Collection-only, read-only NFT analytics. No wallet adapter or signing route exists. */
function collectionMatch(asset) {
  return Array.isArray(asset?.grouping) && asset.grouping.some(group => group?.group_key === 'collection' && group?.group_value === BULL_PEN_COLLECTION);
}
function safeMediaHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.port && parsed.port !== '443')) return null;
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
    if (!host || host === 'localhost' || host.endsWith('.local') || (!host.includes('.') && !host.includes(':'))) return null;
    if (host.includes(':')) {
      const prefixTwo = host.slice(0, 2);
      const prefixThree = host.slice(0, 3);
      if (host === '::1' || host === '::' || prefixTwo === 'fc' || prefixTwo === 'fd' ||
          ['fe8', 'fe9', 'fea', 'feb'].includes(prefixThree) || host.startsWith('::ffff:')) return null;
    } else {
      const rawParts = host.split('.');
      const isIpv4 = rawParts.length === 4 && rawParts.every(part => part.length >= 1 && part.length <= 3 &&
        [...part].every(character => character >= '0' && character <= '9'));
      if (!isIpv4) return parsed.toString();
      const parts = rawParts.map(Number);
      if (parts.some(part => part > 255) || parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
          (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
          (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168) || parts[0] >= 224) return null;
    }
    return parsed.toString();
  } catch (_) { return null; }
}
function mediaUrl(value) {
  const url = String(value || '');
  if (url.startsWith('ipfs://')) return safeMediaHttpUrl('https://nftstorage.link/ipfs/' + url.slice(7));
  if (url.startsWith('ar://')) return safeMediaHttpUrl('https://arweave.net/' + url.slice(5));
  return safeMediaHttpUrl(url);
}
async function safeMediaFetch(value, init = {}, redirects = 0) {
  const target = safeMediaHttpUrl(value);
  if (!target) throw new Error('Unsafe media URL');
  const response = await fetch(target, { ...init, redirect: 'manual' });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 3) throw new Error('Too many media redirects');
    const next = response.headers.get('Location');
    if (!next) throw new Error('Media redirect is missing a destination');
    return safeMediaFetch(new URL(next, target).toString(), init, redirects + 1);
  }
  return response;
}
async function limitedBody(response, maxBytes) {
  const declared = Number(response.headers.get('Content-Length') || 0);
  if (declared > maxBytes) throw new Error('Remote media is too large');
  if (!response.body?.getReader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error('Remote media is too large');
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new Error('Remote media is too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
function assetImageCandidates(asset) {
  const files = Array.isArray(asset?.content?.files) ? asset.content.files : [];
  const values = [
    asset?.content?.links?.image,
    asset?.content?.metadata?.image,
    ...files.flatMap(file => [file?.cdn_uri, file?.uri])
  ];
  return [...new Set(values.map(mediaUrl).filter(Boolean))].slice(0, 12);
}
function mapNftAsset(asset) {
  const imageCandidates = assetImageCandidates(asset);
  return {
    id: asset.id,
    name: String(asset?.content?.metadata?.name || 'The Bull Pen NFT').slice(0, 140),
    image: imageCandidates[0] || null,
    imageCandidates,
    compressed: asset?.compression?.compressed === true,
    interface: asset.interface || null,
    attributes: Array.isArray(asset?.content?.metadata?.attributes) ? asset.content.metadata.attributes.slice(0, 40) : []
  };
}
async function nftCollectionTraits(env, cors) {
  requireHelius(env);
  const cacheKey = 'nft:collection-traits:' + BULL_PEN_COLLECTION;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json(cached, 200, cors, 'public, max-age=3600');
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
    for (const asset of items) {
      const attributes = (Array.isArray(asset?.content?.metadata?.attributes) ? asset.content.metadata.attributes : [])
        .filter(attribute => attribute && attribute.trait_type != null && attribute.value != null)
        .slice(0, 40)
        .map(attribute => ({ trait_type: String(attribute.trait_type).slice(0, 80), value: String(attribute.value).slice(0, 120) }));
      assets.push({ mint: String(asset.id || ''), name: String(asset?.content?.metadata?.name || 'The Bull Pen NFT').slice(0, 140), attributes });
    }
    if (items.length < pageSize || (Number.isFinite(Number(result?.total)) && assets.length >= Number(result.total))) break;
  }
  const payload = { ok: true, data: { collection: BULL_PEN_COLLECTION, updatedAt: new Date().toISOString(), assets } };
  // Collection traits only change when new mints appear, never on trade.
  await cachePut(env, cacheKey, payload, 6 * 60 * 60_000);
  return json(payload, 200, cors, 'public, max-age=3600');
}
async function nftImage(url, env, cors) {
  const assetId = String(url.searchParams.get('asset') || '').trim();
  if (!validAddress(assetId)) return json({ ok: false, error: { message: 'Invalid NFT asset address' } }, 400, cors);
  requireHelius(env);
  const asset = await rpc(env, 'getAsset', { id: assetId, displayOptions: { showCollectionMetadata: true } });
  if (!collectionMatch(asset)) return json({ ok: false, error: { message: 'Asset is not in The Bull Pen collection' } }, 404, cors);
  let candidates = assetImageCandidates(asset);
  const jsonUri = mediaUrl(asset?.content?.json_uri);
  if (jsonUri) {
    try {
      const metadataResponse = await safeMediaFetch(jsonUri, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 3600, cacheEverything: true } });
      if (metadataResponse.ok) {
        const metadataBytes = await limitedBody(metadataResponse, 1024 * 1024);
        const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
        candidates = [...new Set([...candidates, mediaUrl(metadata?.image), mediaUrl(metadata?.image_url), mediaUrl(metadata?.animation_url)].filter(Boolean))];
      }
    } catch (_) {}
  }
  for (const candidate of candidates) {
    try {
      const response = await safeMediaFetch(candidate, { headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/*' }, cf: { cacheTtl: 86400, cacheEverything: true } });
      const type = String(response.headers.get('Content-Type') || '').split(';')[0].trim();
      if (!response.ok || !/^image\/(?:avif|webp|png|jpeg|gif)$/i.test(type)) continue;
      const bytes = await limitedBody(response, 15 * 1024 * 1024);
      return new Response(bytes, {
        status: 200,
        headers: { ...cors, 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' }
      });
    } catch (_) {}
  }
  return json({ ok: false, error: { message: 'NFT image is unavailable from its metadata providers' } }, 404, cors);
}
function txMintCandidates(transaction) {
  const values = [];
  const nftItems = transaction?.events?.nft?.nfts;
  if (Array.isArray(nftItems)) nftItems.forEach(item => values.push(item?.mint || item?.id));
  if (transaction?.events?.nft?.mint) values.push(transaction.events.nft.mint);
  if (Array.isArray(transaction?.tokenTransfers)) transaction.tokenTransfers.forEach(item => values.push(item?.mint));
  if (Array.isArray(transaction?.accountData)) transaction.accountData.forEach(account => {
    (account?.tokenBalanceChanges || []).forEach(change => values.push(change?.mint));
  });
  [transaction?.tokenMint, transaction?.mint, transaction?.tokenAddress, transaction?.nft?.mint, transaction?.nft?.address]
    .forEach(value => values.push(value));
  return values.filter(validAddress);
}
function nftSolAmount(event) {
  const value = Number(event?.amount || event?.price || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1_000_000 ? value / 1e9 : value;
}
function mapNftActivity(transaction, wallet) {
  const event = transaction?.events?.nft || {};
  const buyer = String(event.buyer || ''), seller = String(event.seller || '');
  let type = String(transaction.type || 'NFT_ACTIVITY').replaceAll('_', ' ');
  if (buyer === wallet) type = 'BUY'; else if (seller === wallet) type = 'SELL'; else if (/TRANSFER/i.test(type)) type = 'TRANSFER';
  return {
    type,
    signature: transaction.signature,
    timestamp: transaction.timestamp ? new Date(Number(transaction.timestamp) * 1000).toISOString() : null,
    description: String(transaction.description || '').slice(0, 240),
    amountSol: nftSolAmount(event), buyer, seller, source: transaction.source || null
  };
}
async function allOwnedCollectionAssets(env, wallet, warnings) {
  const assets = [];
  const pageSize = 1000;
  for (let page = 1; page <= 10; page++) {
    const result = await settled(rpc(env, 'searchAssets', {
      ownerAddress: wallet,
      grouping: ['collection', BULL_PEN_COLLECTION],
      tokenType: 'nonFungible',
      page,
      limit: pageSize,
      displayOptions: { showCollectionMetadata: true }
    }), { items: [] }, warnings, `collection holdings page ${page}`);
    const items = Array.isArray(result?.items) ? result.items : [];
    assets.push(...items.filter(collectionMatch));
    if (items.length < pageSize || (Number.isFinite(Number(result?.total)) && assets.length >= Number(result.total))) break;
  }
  return [...new Map(assets.map(asset => [asset.id, asset])).values()];
}

async function magicEden(path, params = {}) {
  const url = new URL('https://api-mainnet.magiceden.dev' + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 120, cacheEverything: true } });
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
async function nftCollectionStats(env, cors) {
  const cacheKey = 'nft-collection-stats:' + BULL_PEN_SYMBOL;
  const cached = await cacheGet(env, cacheKey);
  if (cached) return json({ ok: true, data: cached, cached: true }, 200, cors, 'public, max-age=60');
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
    })().catch(error => { warnings.push('Magic Eden sale history: ' + error.message); return { sales: [], complete30d: false }; })
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
  await cachePut(env, cacheKey, data, 5 * 60_000);
  return json({ ok: true, data }, 200, cors, 'public, max-age=60');
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
async function fetchPublicJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'A-Bulls-App-Analytics/' + VERSION },
      signal: controller.signal,
      cf: { cacheEverything: true, cacheTtl: 60 }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload == null) throw new Error(`Upstream HTTP ${response.status}`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
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
  const [stats, buybacks] = await Promise.all([
    fetchPublicJson(THE_BULLS_API + '/api/stats'),
    fetchPublicJson(THE_BULLS_API + '/api/buybacks?limit=12')
  ]);
  const rows = (Array.isArray(buybacks) ? buybacks : []).slice(0, 12).map(row => {
    const signature = String(row?.signature || '').trim();
    return {
      signature: /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature) ? signature : '',
      sol: finiteOrNull(row?.sol),
      ansem: finiteOrNull(row?.ansem),
      blockTime: finiteOrNull(row?.blockTime)
    };
  }).filter(row => row.signature && (row.sol != null || row.ansem != null));
  const data = {
    solTwap: finiteOrNull(stats?.solBuyback),
    ansemBought: finiteOrNull(stats?.ansemBought),
    averageBuybackUsd: finiteOrNull(stats?.avgBuybackUsd),
    treasury: validAddress(stats?.treasury) ? String(stats.treasury) : '',
    recent: rows,
    source: 'thebulls.live public buyback feed',
    sourceUrl: THE_BULLS_LIVE,
    updatedAt: new Date().toISOString()
  };
  await cachePut(env, 'nft:the-bulls-buybacks', data, 60_000);
  return data;
}
async function nftEcosystemStats(env, cors) {
  const cached = await cacheGet(env, 'nft:ecosystem-stats');
  if (cached) return json({ ok: true, data: cached, cached: true }, 200, cors, 'public, max-age=30');
  const [kimjiResult, buybackResult] = await Promise.allSettled([
    kimjiBullPenStats(env),
    theBullsBuybackStats(env)
  ]);
  const warnings = [];
  const kimji = kimjiResult.status === 'fulfilled' ? kimjiResult.value : null;
  const buybacks = buybackResult.status === 'fulfilled' ? buybackResult.value : null;
  if (!kimji) warnings.push('Kimji staking data is temporarily unavailable.');
  if (!buybacks) warnings.push('thebulls.live buyback data is temporarily unavailable.');
  const data = { collection: BULL_PEN_COLLECTION, kimji, buybacks, warnings, updatedAt: new Date().toISOString(), readOnly: true };
  // Cache successful combined responses for one minute. Partial responses use a
  // shorter TTL so a recovered upstream appears promptly without hammering it.
  await cachePut(env, 'nft:ecosystem-stats', data, kimji && buybacks ? 60_000 : 15_000);
  return json({ ok: true, data }, 200, cors, 'public, max-age=30');
}
async function nftProfile(url, env, cors) {
  const wallet = String(url.searchParams.get('wallet') || '').trim();
  if (!validAddress(wallet)) return json({ ok: false, error: { message: 'Invalid Solana wallet address' } }, 400, cors);
  requireHelius(env);
  const cacheKey = 'nft-profile:' + wallet, cached = await cacheGet(env, cacheKey);
  if (cached) return json({ ok: true, data: cached, cached: true }, 200, cors, 'public, max-age=15');
  const warnings = [];
  const [ownedAssets, transactions, magicEdenActivity] = await Promise.all([
    allOwnedCollectionAssets(env, wallet, warnings),
    (async () => {
      const loaded = [];
      let before;
      for (let page = 0; page < 3; page++) {
        const batch = await heliusWallet(env, `/v0/addresses/${encodeURIComponent(wallet)}/transactions`, { limit: 100, commitment: 'confirmed', before });
        const items = Array.isArray(batch) ? batch : Array.isArray(batch?.data) ? batch.data : [];
        loaded.push(...items);
        if (items.length < 100 || !items.at(-1)?.signature) break;
        before = items.at(-1).signature;
      }
      return loaded;
    })().catch(error => { warnings.push('Helius NFT activity: ' + error.message); return []; }),
    settled(magicEden(`/v2/wallets/${encodeURIComponent(wallet)}/activities`, { offset: 0, limit: 200 }), [], warnings, 'Magic Eden wallet activity')
  ]);
  const assets = ownedAssets.map(mapNftAsset);
  const txs = Array.isArray(transactions) ? transactions : Array.isArray(transactions?.data) ? transactions.data : [];
  const meRows = Array.isArray(magicEdenActivity) ? magicEdenActivity : [];
  const candidateIds = [...new Set([...txs.flatMap(txMintCandidates), ...meRows.map(item => item?.tokenMint || item?.mint).filter(validAddress)])].slice(0, 1000);
  let collectionIds = new Set(assets.map(asset => asset.id));
  if (candidateIds.length) {
    const batch = await settled(rpc(env, 'getAssetBatch', { ids: candidateIds }), [], warnings, 'activity asset verification');
    (Array.isArray(batch) ? batch : []).filter(collectionMatch).forEach(asset => collectionIds.add(asset.id));
  }
  const heliusActivity = txs.filter(tx => txMintCandidates(tx).some(id => collectionIds.has(id))).map(tx => mapNftActivity(tx, wallet));
  const marketActivity = meRows.filter(item => collectionIds.has(item?.tokenMint || item?.mint)).map(item => {
    const buyer = String(item?.buyer || item?.buyerReferral || ''), seller = String(item?.seller || '');
    let type = String(item?.type || 'NFT ACTIVITY').replaceAll('_', ' ').toUpperCase();
    if (buyer === wallet) type = 'BUY'; else if (seller === wallet) type = 'SELL';
    return {
      type, signature: item?.signature || item?.txSignature || '',
      timestamp: item?.blockTime ? new Date(Number(item.blockTime) * 1000).toISOString() : null,
      description: String(item?.type || 'Magic Eden Bull Pen activity').slice(0, 240),
      amountSol: nftSolAmount(item), buyer, seller, source: 'MAGIC_EDEN'
    };
  });
  const activity = [...new Map([...heliusActivity, ...marketActivity]
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .map(item => [`${item.signature}:${item.type}:${item.timestamp}`, item])).values()].slice(0, 100);
  const buys = activity.filter(item => item.type === 'BUY').length, sells = activity.filter(item => item.type === 'SELL').length;
  const data = {
    wallet, collection: BULL_PEN_COLLECTION, assets, activity,
    stats: {
      holdings: assets.length,
      compressed: assets.filter(asset => asset.compressed).length,
      activityCount: activity.length,
      buys, sells,
      transfers: activity.filter(item => item.type === 'TRANSFER').length,
      volumeSol: activity.reduce((sum, item) => sum + item.amountSol, 0),
      lastActive: activity[0]?.timestamp || null
    },
    warnings, updatedAt: new Date().toISOString(), readOnly: true
  };
  await cachePut(env, cacheKey, data, 45_000);
  return json({ ok: true, data }, 200, cors, 'public, max-age=15');
}

/* ===== v5.2.1 signed-session retention APIs ===== */
const RETENTION_BOSSES = ['rugpaw','diamond-fang','candlewick','gasfee-golem','whale-song','ponzimouse','rekt-raven','slippage-slug','copium-cat','fud-hound','paperhand-phantom','moonboy-owl','dump-truck-turtle','airdrop-vulture','honeypot-wasp','gas-war-goat','snipe-serpent','bagholder-bear','exit-liquidity-eel'];
const RETENTION_MODS = ['swift','dense','glass','meteor','steady'];
const STREAK_MILESTONES = { 3: 'streak_badge_3', 7: 'streak_badge_7', 14: 'streak_badge_14', 30: 'streak_badge_30' };
const SEASON_LENGTH_DAYS = 30;
const COMMUNITY_THRESHOLD = 10000;

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function utcWeekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function dailySeedConfig(dayKey) {
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  return {
    dayKey,
    gameKey: h % 2 === 0 ? 'bull-invaders' : 'blitz-bowl',
    bossId: RETENTION_BOSSES[h % RETENTION_BOSSES.length],
    modifier: RETENTION_MODS[(h >>> 8) % RETENTION_MODS.length]
  };
}
async function ensureRetention(env) {
  const db = await ensureLeaderboard(env);
  let ready = retentionReady.get(db);
  if (!ready) {
    // Migrations remain authoritative; this one-time isolate guard keeps local
    // development usable without running DDL on every request.
    ready = db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS daily_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT, day_key TEXT NOT NULL, account_key TEXT NOT NULL DEFAULT '',
      alias TEXT NOT NULL, score INTEGER NOT NULL, elapsed_ms INTEGER NOT NULL, kills INTEGER NOT NULL DEFAULT 0,
      bosses_defeated INTEGER NOT NULL DEFAULT 0, boss_id TEXT NOT NULL, modifier TEXT NOT NULL,
      replay_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
      UNIQUE(day_key, account_key))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS player_streaks (
      account_key TEXT PRIMARY KEY, streak_count INTEGER NOT NULL DEFAULT 0,
      streak_last_completed_date TEXT, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS boss_medals (
      account_key TEXT NOT NULL, boss_id TEXT NOT NULL, no_damage INTEGER NOT NULL DEFAULT 0,
      under_time INTEGER NOT NULL DEFAULT 0, no_continue INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
      PRIMARY KEY (account_key, boss_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS crews (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, join_code TEXT NOT NULL UNIQUE, created_by TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS crew_members (
      crew_id TEXT NOT NULL, account_key TEXT NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY (crew_id, account_key))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS community_goals (
      week_key TEXT PRIMARY KEY, metric TEXT NOT NULL DEFAULT 'bosses_defeated', progress INTEGER NOT NULL DEFAULT 0,
      threshold INTEGER NOT NULL DEFAULT 10000, unlocked INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS cosmetic_unlocks (
      account_key TEXT NOT NULL, cosmetic_id TEXT NOT NULL, source TEXT NOT NULL, granted_at TEXT NOT NULL,
      PRIMARY KEY (account_key, cosmetic_id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS leaderboard_seasons_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT, season_id INTEGER NOT NULL, game TEXT NOT NULL, alias TEXT NOT NULL,
      score INTEGER NOT NULL, elapsed_ms INTEGER NOT NULL, kills INTEGER NOT NULL, bosses_defeated INTEGER NOT NULL,
      replay_hash TEXT NOT NULL, created_at TEXT NOT NULL, archived_at TEXT NOT NULL)`)
    ]).catch(error => { retentionReady.delete(db); throw error; });
    retentionReady.set(db, ready);
  }
  await ready;
  return db;
}

async function dailyToday(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Daily Runs are not configured' } }, 503, cors);
  const account = await retentionAccount(request, env);
  const day = utcDayKey();
  const cfg = dailySeedConfig(day);
  let attempted = false;
  try {
    const db = await ensureRetention(env);
    const row = await db.prepare('SELECT id FROM daily_scores WHERE day_key = ? AND account_key = ? LIMIT 1').bind(day, account.id).first();
    attempted = Boolean(row);
  } catch (_) {}
  const reset = new Date(Date.now());
  reset.setUTCDate(reset.getUTCDate() + 1); reset.setUTCHours(0, 0, 0, 0);
  return json({ ok: true, data: { ...cfg, attempted, resetAt: reset.toISOString() } }, 200, cors);
}

async function validateInvadersRunBody(body, modeRequired) {
  const game = String(body.game || '');
  if (!COMPETITIVE_GAMES.has(game)) return { error: 'Unsupported game', status: 400 };
  const mode = String(body.mode || '');
  if (body.purchasedItemsActive === true) return { error: 'Purchased loadouts cannot submit here', status: 403 };
  if (modeRequired && mode !== modeRequired) return { error: `Mode ${modeRequired} required`, status: 400 };
  const run = {
    game,
    score: boundedInt(body.score),
    elapsedMs: boundedInt(body.elapsedMs, 6 * 60 * 60 * 1000),
    kills: boundedInt(body.kills, 1_000_000),
    bossesDefeated: boundedInt(body.bossesDefeated, 19),
    nonce: String(body.nonce || '')
  };
  if (Object.values(run).some(v => v === null) || !/^[a-zA-Z0-9-]{8,80}$/.test(run.nonce)) {
    return { error: 'Invalid run payload', status: 400 };
  }
  // Same physics bounds as Ranked
  if (!physicallyPossibleRun(run) || (game === 'blitz-bowl' && (run.elapsedMs > 900000 || run.score > 250000 || run.kills > 500 || run.bossesDefeated > 30))) return { error: 'Score failed physics sanity bounds', status: 422 };
  const challengeId = String(body.challengeId || '');
  const canonical = ['abulls-v7.0.1', mode, run.game, run.score, run.elapsedMs, run.kills, run.bossesDefeated, run.nonce, challengeId].join('|');
  const expectedHash = await sha256Hex(canonical);
  if (!/^[a-f0-9]{64}$/.test(String(body.replayHash || '')) || expectedHash !== body.replayHash) {
    return { error: 'Replay hash validation failed', status: 400 };
  }
  return { run, expectedHash, mode, challengeId };
}

async function dailySubmit(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Daily Runs are not configured' } }, 503, cors);
  const body = await request.json().catch(() => ({}));
  const checked = await validateInvadersRunBody(body, 'daily');
  if (checked.error) return json({ ok: false, error: { message: checked.error } }, checked.status, cors);
  const day = utcDayKey();
  const cfg = dailySeedConfig(day);
  if (checked.run.game !== cfg.gameKey || body.bossId !== cfg.bossId || body.modifier !== cfg.modifier) {
    return json({ ok: false, error: { message: 'Daily configuration does not match today\'s challenge' } }, 409, cors);
  }
  let verified;
  try { verified = await verifyRunChallenge(request, body, env, checked.run.game, 'daily'); }
  catch (error) { return json({ ok: false, error: { message: error.message } }, Number(error.status || 401), cors); }
  const accountKey = verified.account.id;
  const alias = cleanAlias(body.alias);
  const db = await ensureRetention(env);
  const createdAt = new Date().toISOString();
  const inserted = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO run_submissions
      (challenge_id, account_id, replay_hash, game, mode, created_at) VALUES (?, ?, ?, ?, 'daily', ?)`)
      .bind(checked.challengeId, accountKey, checked.expectedHash, checked.run.game, createdAt),
    db.prepare(`INSERT OR IGNORE INTO daily_scores
      (day_key, account_key, alias, score, elapsed_ms, kills, bosses_defeated, boss_id, modifier, replay_hash, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM daily_scores WHERE day_key = ? AND account_key = ?)
        AND EXISTS (SELECT 1 FROM run_submissions
          WHERE challenge_id = ? AND account_id = ? AND replay_hash = ? AND created_at = ?)`)
      .bind(day, accountKey, alias, checked.run.score, checked.run.elapsedMs, checked.run.kills, checked.run.bossesDefeated,
        cfg.bossId, cfg.modifier, checked.expectedHash, createdAt, day, accountKey,
        checked.challengeId, accountKey, checked.expectedHash, createdAt)
  ]);
  const accepted = Number(inserted?.[0]?.meta?.changes || 0) === 1 && Number(inserted?.[1]?.meta?.changes || 0) === 1;
  if (!accepted) {
    const prior = await db.prepare('SELECT streak_count FROM player_streaks WHERE account_key = ?').bind(accountKey).first();
    return json({ ok: true, data: { accepted: false, dayKey: day, streak_count: Number(prior?.streak_count || 0), bossId: cfg.bossId, modifier: cfg.modifier } }, 200, cors);
  }

  // Streak update (UTC day)
  const streakRow = await db.prepare('SELECT streak_count, streak_last_completed_date FROM player_streaks WHERE account_key = ?')
    .bind(accountKey).first();
  let streak = 1;
  if (streakRow?.streak_last_completed_date === day) {
    streak = Number(streakRow.streak_count || 1);
  } else {
    const yest = utcDayKey(new Date(Date.now() - 86400000));
    if (streakRow?.streak_last_completed_date === yest) streak = Number(streakRow.streak_count || 0) + 1;
    else streak = 1;
    await db.prepare(`INSERT INTO player_streaks (account_key, streak_count, streak_last_completed_date, updated_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(account_key) DO UPDATE SET
      streak_count = excluded.streak_count, streak_last_completed_date = excluded.streak_last_completed_date, updated_at = excluded.updated_at`)
      .bind(accountKey, streak, day, createdAt).run();
    const cosmetic = STREAK_MILESTONES[streak];
    if (cosmetic) {
      await db.prepare(`INSERT OR IGNORE INTO cosmetic_unlocks (account_key, cosmetic_id, source, granted_at) VALUES (?, ?, 'streak', ?)`)
        .bind(accountKey, cosmetic, createdAt).run();
    }
  }

  // Community counter: bosses defeated this run
  const week = utcWeekKey();
  await db.prepare(`INSERT INTO community_goals (week_key, metric, progress, threshold, unlocked, updated_at)
    VALUES (?, 'bosses_defeated', ?, ?, 0, ?)
    ON CONFLICT(week_key) DO UPDATE SET progress = progress + excluded.progress, updated_at = excluded.updated_at,
      unlocked = CASE WHEN progress + excluded.progress >= threshold THEN 1 ELSE unlocked END`)
    .bind(week, checked.run.bossesDefeated, COMMUNITY_THRESHOLD, createdAt).run();

  const damageTaken = boundedInt(body.damageTaken, 1_000_000);
  const continuesUsed = boundedInt(body.continuesUsed, 100);
  const underTime = checked.run.elapsedMs <= 180000 ? 1 : 0;
  const medal = { no_damage: damageTaken === 0 ? 1 : 0, under_time: underTime, no_continue: continuesUsed === 0 ? 1 : 0 };
  await db.prepare(`INSERT INTO boss_medals (account_key, boss_id, no_damage, under_time, no_continue, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_key, boss_id) DO UPDATE SET
      no_damage = MAX(no_damage, excluded.no_damage), under_time = MAX(under_time, excluded.under_time),
      no_continue = MAX(no_continue, excluded.no_continue), updated_at = excluded.updated_at`)
    .bind(accountKey, cfg.bossId, medal.no_damage, medal.under_time, medal.no_continue, createdAt).run();

  return json({
    ok: true,
    data: {
      accepted,
      dayKey: day,
      score: checked.run.score,
      streak_count: streak,
      bossId: cfg.bossId,
      modifier: cfg.modifier,
      medals: medal
    }
  }, 200, cors);
}

async function dailyTop(url, env, cors) {
  if (!env.LEADERBOARD_DB) return json({ ok: false, error: { message: 'DB not configured' } }, 503, cors);
  const day = String(url.searchParams.get('day') || utcDayKey());
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)));
  const db = await ensureRetention(env);
  const rows = await db.prepare(`SELECT alias, score, elapsed_ms, kills, bosses_defeated, created_at as createdAt
    FROM daily_scores WHERE day_key = ? ORDER BY score DESC, created_at ASC LIMIT ?`).bind(day, limit).all();
  return json({ ok: true, data: { dayKey: day, scores: rows?.results || [] } }, 200, cors);
}

async function medalsGet(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Medals are not configured' } }, 503, cors);
  const accountKey = (await retentionAccount(request, env)).id;
  const db = await ensureRetention(env);
  const rows = await db.prepare('SELECT boss_id, no_damage, under_time, no_continue FROM boss_medals WHERE account_key = ?')
    .bind(accountKey).all();
  const medals = {};
  for (const r of (rows?.results || [])) {
    medals[r.boss_id] = { no_damage: !!r.no_damage, under_time: !!r.under_time, no_continue: !!r.no_continue };
  }
  return json({ ok: true, data: { medals } }, 200, cors);
}

async function medalsSubmit(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Medals are not configured' } }, 503, cors);
  const body = await request.json().catch(() => ({}));
  // Require same physics-validated run; medals derived only from server-checked fields
  const checked = await validateInvadersRunBody(body, body.mode === 'daily' ? 'daily' : 'ranked');
  if (checked.error) return json({ ok: false, error: { message: checked.error } }, checked.status, cors);
  const verified = await verifyRunChallenge(request, body, env, checked.run.game, checked.mode);
  const accountKey = verified.account.id;
  const bossId = String(body.bossId || '').slice(0, 32);
  if (!bossId) return json({ ok: false, error: { message: 'bossId required' } }, 400, cors);
  // Server-side medal rules from validated stats only (no client boolean trust)
  const noDamage = body.damageTaken === 0 && Number(body.damageTaken) === 0 ? 1 : 0;
  const underTime = checked.run.elapsedMs > 0 && checked.run.elapsedMs <= Number(body.timeThresholdMs || 180000) ? 1 : 0;
  const noContinue = body.continuesUsed === 0 || body.continuesUsed === '0' ? 1 : 0;
  // Only accept damage/continues if present as bounded ints (optional fields)
  const dmg = boundedInt(body.damageTaken, 1_000_000);
  const continues = boundedInt(body.continuesUsed, 100);
  const noDamageFinal = dmg === 0 ? 1 : 0;
  const noContinueFinal = continues === 0 ? 1 : 0;
  const db = await ensureRetention(env);
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO boss_medals (account_key, boss_id, no_damage, under_time, no_continue, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_key, boss_id) DO UPDATE SET
      no_damage = MAX(no_damage, excluded.no_damage),
      under_time = MAX(under_time, excluded.under_time),
      no_continue = MAX(no_continue, excluded.no_continue),
      updated_at = excluded.updated_at`)
    .bind(accountKey, bossId, noDamageFinal, underTime ? 1 : 0, noContinueFinal, now).run();
  return json({ ok: true, data: { bossId, no_damage: noDamageFinal, under_time: underTime ? 1 : 0, no_continue: noContinueFinal } }, 200, cors);
}

function randomJoinCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

async function crewsCreate(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Crews are not configured' } }, 503, cors);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || 'Crew').replace(/[^\w\s\-]/g, '').trim().slice(0, 24) || 'Crew';
  const accountKey = (await retentionAccount(request, env)).id;
  const db = await ensureRetention(env);
  const id = crypto.randomUUID();
  const code = randomJoinCode();
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO crews (id, name, join_code, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, code, accountKey, now).run();
  await db.prepare('INSERT INTO crew_members (crew_id, account_key, joined_at) VALUES (?, ?, ?)')
    .bind(id, accountKey, now).run();
  return json({ ok: true, data: { id, name, joinCode: code, members: 1 } }, 200, cors);
}

async function crewsJoin(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Crews are not configured' } }, 503, cors);
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const accountKey = (await retentionAccount(request, env)).id;
  if (!code) return json({ ok: false, error: { message: 'Join code required' } }, 400, cors);
  const db = await ensureRetention(env);
  const crew = await db.prepare('SELECT id, name FROM crews WHERE join_code = ?').bind(code).first();
  if (!crew) return json({ ok: false, error: { message: 'Crew not found' } }, 404, cors);
  const countRow = await db.prepare('SELECT COUNT(*) AS c FROM crew_members WHERE crew_id = ?').bind(crew.id).first();
  if (Number(countRow?.c || 0) >= 8) return json({ ok: false, error: { message: 'Crew is full (max 8)' } }, 400, cors);
  await db.prepare('INSERT OR IGNORE INTO crew_members (crew_id, account_key, joined_at) VALUES (?, ?, ?)')
    .bind(crew.id, accountKey, new Date().toISOString()).run();
  const members = await db.prepare('SELECT COUNT(*) AS c FROM crew_members WHERE crew_id = ?').bind(crew.id).first();
  return json({ ok: true, data: { id: crew.id, name: crew.name, members: Number(members?.c || 0) } }, 200, cors);
}

async function crewsLeave(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Crews are not configured' } }, 503, cors);
  const body = await request.json().catch(() => ({}));
  const accountKey = (await retentionAccount(request, env)).id;
  const crewId = String(body.crewId || '');
  if (!crewId) return json({ ok: false, error: { message: 'crewId required' } }, 400, cors);
  const db = await ensureRetention(env);
  await db.prepare('DELETE FROM crew_members WHERE crew_id = ? AND account_key = ?').bind(crewId, accountKey).run();
  return json({ ok: true, data: { left: true } }, 200, cors);
}

async function crewsStatus(request, env, cors) {
  if (!env.LEADERBOARD_DB || !env.AUTH_SESSION_SECRET) return json({ ok: false, error: { message: 'Crews are not configured' } }, 503, cors);
  const accountKey = (await retentionAccount(request, env)).id;
  const db = await ensureRetention(env);
  const crew = await db.prepare(`SELECT c.id, c.name, c.join_code AS joinCode
    FROM crews c JOIN crew_members cm ON cm.crew_id = c.id
    WHERE cm.account_key = ? ORDER BY cm.joined_at DESC LIMIT 1`).bind(accountKey).first();
  if (!crew) return json({ ok: true, data: { crew: null, members: [], weeklyTotal: 0 } }, 200, cors);
  const since = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const result = await db.prepare(`SELECT cm.account_key AS accountKey,
      COALESCE(MAX(ds.alias), 'Bull') AS alias, COUNT(ds.id) AS contribution
    FROM crew_members cm
    LEFT JOIN daily_scores ds ON ds.account_key = cm.account_key AND ds.day_key >= ?
    WHERE cm.crew_id = ? GROUP BY cm.account_key ORDER BY contribution DESC, cm.joined_at ASC`)
    .bind(since, crew.id).all();
  const members = (result.results || []).map(row => ({
    alias: String(row.alias || 'Bull').slice(0, 24),
    contribution: Number(row.contribution || 0),
    you: row.accountKey === accountKey
  }));
  return json({ ok: true, data: { crew, members, weeklyTotal: members.reduce((sum, member) => sum + member.contribution, 0), since } }, 200, cors);
}

async function communityGoal(env, cors) {
  if (!env.LEADERBOARD_DB) return json({ ok: false, error: { message: 'DB not configured' } }, 503, cors);
  const week = utcWeekKey();
  const db = await ensureRetention(env);
  let row = await db.prepare('SELECT week_key as weekKey, progress, threshold, unlocked FROM community_goals WHERE week_key = ?')
    .bind(week).first();
  if (!row) {
    const now = new Date().toISOString();
    await db.prepare(`INSERT OR IGNORE INTO community_goals (week_key, metric, progress, threshold, unlocked, updated_at)
      VALUES (?, 'bosses_defeated', 0, ?, 0, ?)`).bind(week, COMMUNITY_THRESHOLD, now).run();
    row = { weekKey: week, progress: 0, threshold: COMMUNITY_THRESHOLD, unlocked: 0 };
  }
  return json({
    ok: true,
    data: {
      weekKey: row.weekKey || week,
      progress: Number(row.progress || 0),
      threshold: Number(row.threshold || COMMUNITY_THRESHOLD),
      unlocked: Boolean(row.unlocked)
    }
  }, 200, cors);
}

async function communityIncrement(request, env, cors) {
  void request; void env;
  return json({ ok: false, error: { message: 'Direct community increments are disabled; accepted Daily Runs update the goal once.' } }, 410, cors);
}


async function weeklyToday(env, cors) {
  const day = utcDayKey();
  // Week key stable modifier: use week number seed
  const week = utcWeekKey();
  let h = 0;
  for (let i = 0; i < week.length; i++) h = (h * 31 + week.charCodeAt(i)) >>> 0;
  const modifier = RETENTION_MODS[h % RETENTION_MODS.length];
  const elite = (h >>> 4) % 2 === 1;
  return json({ ok: true, data: { weekKey: week, modifier, eliteEnemies: elite, note: 'Weekly rotation — cosmetic/difficulty flag only; Ranked rules unchanged' } }, 200, cors);
}
