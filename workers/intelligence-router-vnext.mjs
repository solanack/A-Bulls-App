/* A Bulls App — next Intelligence router composition.
 * Neutral mesh routes are tried first, then compatibility routes.
 */

import { handleIntelligenceMeshIngestRequest } from './intelligence-mesh-ingest.mjs';
import { handleIntelligenceAdapterRequest } from './intelligence-adapter-router.mjs';
import { handleIntelligenceMeshRequest } from './intelligence-mesh-router.mjs';
import { backfillHistoryPass } from './intelligence-history-engine.mjs';
import { queueHistoryJob } from './intelligence-mesh-scheduler.mjs';
import { handleBullIntelligenceRequest } from './bull-intelligence-extension.mjs';

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s = v => String(v == null ? '' : v).trim();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff' }
});
async function readJson(request) { try { return await request.json(); } catch { return {}; } }
function enabled(env = {}) { return String(env.INTELLIGENCE_MESH_ENABLED || '').toLowerCase() === 'true'; }

async function handleHistoryRoutes(request, env = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/intelligence/history/')) return null;
  if (!enabled(env)) return json({ ok:true, state:'disabled', message:'Intelligence Mesh is not enabled.' });

  if (url.pathname === '/api/intelligence/history/queue' && request.method === 'POST') {
    const body = await readJson(request);
    const wallet = s(body.wallet || body.address);
    if (!WALLET_RE.test(wallet)) return json({ ok:false, error:'invalid_public_wallet' }, 400);
    const job = await queueHistoryJob(env, wallet, { before: body.before, pageSize: body.pageSize });
    return json({ ok:true, wallet, ...job, state:'indexing' });
  }

  if (url.pathname === '/api/intelligence/history/pass' && request.method === 'POST') {
    const body = await readJson(request);
    const wallet = s(body.wallet || body.address);
    if (!WALLET_RE.test(wallet)) return json({ ok:false, error:'invalid_public_wallet' }, 400);
    try {
      return json(await backfillHistoryPass(env, wallet, { before: body.before, pageSize: body.pageSize }));
    } catch (error) {
      return json({ ok:false, error:s(error?.message || error) }, 400);
    }
  }

  return json({ ok:false, error:'not_found' }, 404);
}

export async function handleIntelligenceVNext(request, env = {}) {
  let response = await handleIntelligenceMeshIngestRequest(request, env);
  if (response) return response;
  response = await handleIntelligenceAdapterRequest(request, env);
  if (response) return response;
  response = await handleHistoryRoutes(request, env);
  if (response) return response;
  response = await handleIntelligenceMeshRequest(request, env);
  if (response) return response;
  return handleBullIntelligenceRequest(request, env);
}
