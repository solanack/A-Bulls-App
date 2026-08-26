/* A Bulls App — Intelligence Mesh adapter ingest bridge
 * Internal-only normalized event intake for Yellowstone/Richat, Substreams SVM,
 * Old Faithful, standard RPC repair workers, and future approved read-only sources.
 */

import { ingestDecodedObservations, intelligenceDb, normalizeIndexedEvents } from './intelligence-indexer.mjs';
import { persistUniverseObservations } from './intelligence-universe-runtime.mjs';

const SOURCE_KINDS = new Set(['yellowstone', 'richat', 'substreams', 'old-faithful', 'rpc', 'repair', 'snapshot', 'test']);
const s = value => String(value == null ? '' : value).trim();
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function bearer(request) {
  const header = s(request.headers.get('authorization'));
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function authorized(request, env = {}) {
  const expected = s(env.INTELLIGENCE_MESH_INGEST_TOKEN);
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
      INSERT INTO intelligence_event_provenance
        (signature, wallet, source, source_kind, observed_at, slot, commitment,
         archive_ref, verified)
      VALUES (?, ?, ?, ?, unixepoch(), ?, ?, ?, ?)
      ON CONFLICT(signature, wallet, source) DO UPDATE SET
        observed_at=unixepoch(), slot=excluded.slot, commitment=excluded.commitment,
        archive_ref=COALESCE(excluded.archive_ref, archive_ref),
        verified=MAX(verified, excluded.verified)
    `).bind(
      row.signature, wallet, source, sourceKind, n(row.slot) || null,
      verified ? 'finalized' : 'confirmed', s(archiveRef) || null, verified ? 1 : 0
    ).run();
  }
}

export function universeObservationsForEvents(rows = [], { verified = false } = {}) {
  const observations = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const signature=s(row.signature), source=s(row.source), observedAt=n(row.blockTime);
    if (!signature || !source || !observedAt) continue;
    const entities=[
      {kind:'transaction',id:signature},
      {kind:'wallet',id:s(row.wallet)},
      {kind:'token',id:s(row.mint)},
      {kind:'program',id:s(row.programId)}
    ].filter(entity=>entity.id);
    const unique=[];const entityKeys=new Set();
    for(const entity of entities){const key=`${entity.kind}:${entity.id}`;if(!entityKeys.has(key)){entityKeys.add(key);unique.push(entity);}}
    const transaction=unique.find(entity=>entity.kind==='transaction');
    const relations=transaction?unique.filter(entity=>entity!==transaction).map((entity,index)=>Object.freeze({
      id:`relation:${signature}:${index}`,sourceId:transaction.id,targetId:entity.id,
      kind:entity.kind,evidenceId:signature,observedAt,
      verificationState:verified?'verified':'confirmed'
    })):[];
    const magnitude=Math.min(1,Math.log10(Math.abs(n(row.tokenDelta))+Math.abs(n(row.solDelta))+1)/6);
    for(const entity of unique)observations.push(Object.freeze({
      eventId:`${signature}:${entity.kind}:${entity.id}`,entityKind:entity.kind,entityId:entity.id,
      category:s(row.eventClass)||'unknown',observedAt,slot:n(row.slot)||null,
      commitment:verified?'verified':'confirmed',magnitudeBand:magnitude,source,
      evidence:Object.freeze({signature,relations})
    }));
  }
  return Object.freeze(observations);
}

async function persistSourceHealth(db, source, sourceKind, state, details = {}) {
  await db.prepare(`
    INSERT INTO intelligence_source_health
      (source, source_kind, state, last_ok_at, last_error_at, details_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(source) DO UPDATE SET
      source_kind=excluded.source_kind,
      state=excluded.state,
      last_ok_at=CASE WHEN excluded.state='ok' THEN excluded.last_ok_at ELSE last_ok_at END,
      last_error_at=CASE WHEN excluded.state='error' THEN excluded.last_error_at ELSE last_error_at END,
      details_json=excluded.details_json,
      updated_at=unixepoch()
  `).bind(source, sourceKind, state, state === 'ok' ? Math.floor(Date.now()/1000) : null,
    state === 'error' ? Math.floor(Date.now()/1000) : null, JSON.stringify(details)).run();
}

export async function ingestIntelligenceBatch(env = {}, payload = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Intelligence database binding is unavailable.');
  const wallet = s(payload.wallet || payload.address);
  const source = s(payload.source);
  const sourceKind = s(payload.sourceKind || payload.source_kind).toLowerCase();
  const observations = Array.isArray(payload.events) ? payload.events : [];
  if (!wallet) throw new Error('wallet_required');
  if (!source) throw new Error('source_required');
  if (!SOURCE_KINDS.has(sourceKind)) throw new Error('unsupported_source_kind');
  if (observations.length > 500) throw new Error('batch_too_large');

  try {
    const decorated = observations.map(row => ({ ...row, source }));
    const normalized = normalizeIndexedEvents(decorated, wallet);
    const result = await ingestDecodedObservations(env, wallet, normalized, {
      windowKey: s(payload.windowKey || 'intelligence-mesh'),
      bucketSeconds: n(payload.bucketSeconds || 3600)
    });
    await persistProvenance(db, wallet, source, sourceKind, normalized, Boolean(payload.verified), s(payload.archiveRef));
    let universeWritten=0;
    if(String(env.UNIVERSE_ENABLED||'').toLowerCase()==='true'){
      universeWritten=await persistUniverseObservations(env,universeObservationsForEvents(normalized,{verified:Boolean(payload.verified)}));
    }
    await persistSourceHealth(db, source, sourceKind, 'ok', { accepted: result.accepted, universeWritten });
    return { ok: true, wallet, source, sourceKind, accepted: result.accepted, universeWritten, verified: Boolean(payload.verified) };
  } catch (error) {
    await persistSourceHealth(db, source, sourceKind, 'error', { error: s(error?.message || error) });
    throw error;
  }
}

export async function handleIntelligenceMeshIngestRequest(request, env = {}) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/internal/intelligence/ingest') return null;
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }
  if (!authorized(request, env)) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  try {
    return new Response(JSON.stringify(await ingestIntelligenceBatch(env, await jsonBody(request))), {
      status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: s(error?.message || error) }), {
      status: 400, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
  }
}

