/* A Bulls App — Intelligence Mesh read-only API router */

import { coverageForWallet, marketSequence, recordDemand, runtimeStatus, sourceHealth, verificationForSignature } from './intelligence-mesh-runtime.mjs';

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s = v => String(v == null ? '' : v).trim();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});

async function body(request) { try { return await request.json(); } catch { return {}; } }

export async function handleIntelligenceMeshRequest(request, env = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/intelligence/')) return null;

  if (url.pathname === '/api/intelligence/mesh-status' && request.method === 'GET') {
    return json({ ok: true, status: await runtimeStatus(env) });
  }

  if (url.pathname === '/api/intelligence/source-health' && request.method === 'GET') {
    return json({ ok: true, sources: await sourceHealth(env) });
  }

  if (url.pathname === '/api/intelligence/index-coverage' && request.method === 'POST') {
    const payload = await body(request);
    const wallet = s(payload.wallet || payload.address);
    if (!WALLET_RE.test(wallet)) return json({ ok: false, error: 'invalid_public_wallet' }, 400);
    const started = Date.now();
    const coverage = await coverageForWallet(env, wallet);
    await recordDemand(env, 'index-coverage', 'wallet', wallet, Date.now() - started);
    return json({ ok: true, wallet, coverage, state: coverage?.complete_to_genesis ? 'complete-history' : coverage ? 'partial-history' : 'not-indexed' });
  }

  if (url.pathname === '/api/intelligence/verification' && request.method === 'POST') {
    const payload = await body(request);
    const wallet = s(payload.wallet || payload.address);
    const signature = s(payload.signature);
    if (!WALLET_RE.test(wallet) || !signature) return json({ ok: false, error: 'wallet_and_signature_required' }, 400);
    const started = Date.now();
    const verification = await verificationForSignature(env, wallet, signature);
    await recordDemand(env, 'verification', 'wallet-signature', `${wallet}:${signature.slice(0,16)}`, Date.now() - started);
    return json({ ok: true, wallet, signature, verification });
  }

  if (url.pathname === '/api/intelligence/market-sequence' && request.method === 'POST') {
    const payload = await body(request);
    const scopeType = s(payload.scopeType || payload.scope_type);
    const scopeValue = s(payload.scopeValue || payload.scope_value);
    if (!scopeType || !scopeValue) return json({ ok: false, error: 'scope_required' }, 400);
    const started = Date.now();
    const events = await marketSequence(env, scopeType, scopeValue, payload.limit);
    await recordDemand(env, 'market-sequence', scopeType, scopeValue, Date.now() - started);
    return json({ ok: true, scopeType, scopeValue, events, disclaimer: 'Chronological on-chain observations; sequence does not prove economic causation.' });
  }

  return null;
}
