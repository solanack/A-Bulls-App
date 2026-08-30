/* A Bulls App — protected adapter router for Intelligence Mesh */

import { normalizeAdapterBatch } from './intelligence-adapters.mjs';
import { ingestIntelligenceBatch } from './intelligence-mesh-ingest.mjs';
import { buildOhlc, persistCandles, persistTradeRoute } from './intelligence-mesh-runtime.mjs';
import { ingestNftObservations } from './intelligence-nft-layer.mjs';
import { finishExternalRetrievalTask } from './intelligence-retrieval-tasks.mjs';

const s = v => String(v == null ? '' : v).trim();
const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const ALLOWED = new Set(['yellowstone', 'richat', 'substreams', 'old-faithful']);

function token(request) {
  const h = s(request.headers.get('authorization'));
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}
function authorized(request, env = {}) {
  const expected = s(env.INTELLIGENCE_MESH_INGEST_TOKEN);
  const supplied = token(request);
  return Boolean(expected) && expected.length === supplied.length && expected === supplied;
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } });

export async function handleIntelligenceAdapterRequest(request, env = {}) {
  const url = new URL(request.url);
  const prefix = '/api/internal/intelligence/adapters/';
  if (!url.pathname.startsWith(prefix)) return null;
  const kind = s(url.pathname.slice(prefix.length)).toLowerCase();
  if (!ALLOWED.has(kind)) return json({ ok:false, error:'unsupported_adapter' }, 404);
  if (request.method !== 'POST') return json({ ok:false, error:'method_not_allowed' }, 405);
  if (!authorized(request, env)) return json({ ok:false, error:'unauthorized' }, 401);

  let payload = {};
  try { payload = await request.json(); } catch { return json({ ok:false, error:'invalid_json' }, 400); }
  const wallet = s(payload.wallet || payload.address);
  const source = s(payload.source || kind);
  const rows = Array.isArray(payload.rows) ? payload.rows : Array.isArray(payload.events) ? payload.events : [];
  const nftRows = Array.isArray(payload.nftRows) ? payload.nftRows : Array.isArray(payload.nft_events) ? payload.nft_events : [];
  const taskId = Number.isInteger(Number(payload.taskId ?? payload.task_id)) && Number(payload.taskId ?? payload.task_id) > 0 ? Number(payload.taskId ?? payload.task_id) : null;
  if (!wallet) return json({ ok:false, error:'wallet_required' }, 400);
  if (!rows.length && !nftRows.length) return json({ ok:false, error:'rows_required' }, 400);
  if (rows.length > 500 || nftRows.length > 500) return json({ ok:false, error:'batch_too_large' }, 400);

  try {
    const normalizedKind = kind === 'richat' ? 'yellowstone' : kind;
    const normalized = normalizeAdapterBatch(normalizedKind, rows, wallet, source);
    let ingest = { accepted: 0, universeWritten: 0 };
    if (normalized.events.length) {
      ingest = await ingestIntelligenceBatch(env, {
        wallet,
        source,
        sourceKind: kind,
        events: normalized.events,
        verified: normalized.verified,
        archiveRef: normalized.archiveRefs[0] || '',
        windowKey: `adapter-${kind}`
      });
    }

    let routeHops = 0;
    for (const route of normalized.routes) routeHops += await persistTradeRoute(env, route);

    let candlesWritten = 0;
    const mint = s(payload.mint);
    const quoteMint = s(payload.quoteMint || payload.quote_mint);
    if (normalized.swaps.length && mint && quoteMint) {
      const bucketSeconds = Math.max(60, n(payload.bucketSeconds || payload.bucket_seconds || 60));
      candlesWritten = await persistCandles(env, mint, quoteMint, buildOhlc(normalized.swaps, bucketSeconds));
    }

    const nftIngest = nftRows.length ? await ingestNftObservations(env, wallet, nftRows, source) : { accepted: 0 };
    let taskCompletion = null;
    if (taskId) {
      try {
        taskCompletion = await finishExternalRetrievalTask(env, {
          taskId,
          state:'complete',
          wallet,
          sourceKind:kind,
          searchedFrom:payload.searchedFrom ?? payload.searched_from,
          searchedTo:payload.searchedTo ?? payload.searched_to,
          rangeVerified:payload.rangeVerified === true || Number(payload.range_verified) === 1,
          observedRows:payload.observedRows ?? payload.observed_rows ?? rows.length
        });
      } catch (error) {
        taskCompletion = { ok:false, taskId, error:s(error?.message || error) };
      }
    }
    return json({ ok:true, adapter:kind, source, accepted:ingest.accepted, nftAccepted:nftIngest.accepted, routeHops, candlesWritten, liveObservationsWritten:ingest.universeWritten || 0, verified:normalized.verified, taskCompletion });
  } catch (error) {
    return json({ ok:false, error:s(error?.message || error) }, 400);
  }
}

