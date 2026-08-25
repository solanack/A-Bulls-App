/* A Bulls App — Bull Data Mesh adapter ingest bridge
 * Internal-only normalized event intake for Richat/Yellowstone, Substreams SVM,
 * Old Faithful repair workers, or other approved read-only indexers.
 */

import { ingestDecodedObservations, intelligenceDb, normalizeIndexedEvents } from './intelligence-indexer.mjs';

const SOURCE_KINDS = new Set(['yellowstone', 'substreams', 'old-faithful', 'rpc', 'repair', 'test']);
const s = value => String(value == null ? '' : value).trim();
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function bearer(request) {
  const header = s(request.headers.get('authorization'));
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function authorized(request, env = {}) {
  const expected = s(env.BULL_MESH_INGEST_TOKEN);
  if (!expected) return false;
  const supplied = bearer(request);
  return supplied.length === expected.length && supplied === expected;
}

async function jsonBody(request) {
  try { return await request.json(); } catch (_) { return {}; }
}

async function persistProvenance(db, wallet, source, sourceKind, rows, verified = false, archiveRef = '') {
  for (const row of rows) {
    if (!row.signature) continue;
    await db.prepare(`
      INSERT INTO bull_event_provenance
        (signature, wallet, source, source_kind, observed_at, slot, commitment,
         archive_ref, verified)
      VALUES (?, ?, ?, ?, unixepoch(), ?, ?, ?, ?)
      ON CONFLICT(signature, wallet, source) DO UPDATE SET
        observed_at=unixepoch(), slot=excluded.slot, commitment=excluded.commitment,
        archive_ref=COALESCE(excluded.archive_ref, archive_ref),
        verified=MAX(verified, excluded.verified)
    `).bind(
      row.signature,
      wallet,
      source,
      sourceKind,
      n(row.slot) || null,
      verified ? 'finalized' : 'confirmed',
      s(archiveRef) || null,
      verified ? 1 : 0
    ).run();
  }
}

export async function ingestMeshBatch(env = {}, payload = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Bull Intelligence D1 binding is unavailable.');
  const wallet = s(payload.wallet || payload.address);
  const source = s(payload.source);
  const sourceKind = s(payload.sourceKind || payload.source_kind).toLowerCase();
  const observations = Array.isArray(payload.events) ? payload.events : [];
  if (!wallet) throw new Error('wallet_required');
  if (!source) throw new Error('source_required');
  if (!SOURCE_KINDS.has(sourceKind)) throw new Error('unsupported_source_kind');
  if (observations.length > 250) throw new Error('batch_too_large');

  const decorated = observations.map(row => ({ ...row, source }));
  const normalized = normalizeIndexedEvents(decorated, wallet);
  const result = await ingestDecodedObservations(env, wallet, normalized, {
    windowKey: s(payload.windowKey || 'mesh-adapter'),
    bucketSeconds: n(payload.bucketSeconds || 3600)
  });
  await persistProvenance(
    db,
    wallet,
    source,
    sourceKind,
    normalized,
    Boolean(payload.verified),
    s(payload.archiveRef)
  );
  return {
    ok: true,
    wallet,
    source,
    sourceKind,
    accepted: result.accepted,
    verified: Boolean(payload.verified)
  };
}

export async function handleBullMeshIngestRequest(request, env = {}) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/internal/intelligence/ingest') return null;
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  if (!authorized(request, env)) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  try {
    const payload = await jsonBody(request);
    const result = await ingestMeshBatch(env, payload);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: s(error?.message || error) }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
}
