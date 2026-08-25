/* A Bulls App — Bull Data Mesh v1
 * Provider-agnostic, public-address-only progressive indexing.
 * Uses standard Solana JSON-RPC now; paid Helius, Richat/Yellowstone,
 * Substreams, Old Faithful or other sources can be added as adapters later.
 * No signing, custody, transaction submission, or private-key handling.
 */

import { ingestDecodedObservations, intelligenceDb } from './intelligence-indexer.mjs';

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DEFAULT_PUBLIC_RPC = 'https://api.mainnet-beta.solana.com';
const MAX_PAGE = 50;
const MAX_TX_PER_PASS = 25;
const s = value => String(value == null ? '' : value).trim();
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const now = () => Math.floor(Date.now() / 1000);

export function meshEnabled(env = {}) {
  return String(env.BULL_MESH_ENABLED || '').toLowerCase() === 'true';
}

export function resolveRpcSource(env = {}) {
  const explicit = s(env.BULL_RPC_URL || env.SOLANA_RPC_URL);
  if (explicit) return { name: 'configured-rpc', kind: 'rpc', url: explicit };
  const heliusKey = s(env.HELIUS_API_KEY);
  if (heliusKey) return {
    name: 'helius-standard-rpc',
    kind: 'rpc',
    url: `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(heliusKey)}`
  };
  return { name: 'solana-public-rpc', kind: 'rpc', url: DEFAULT_PUBLIC_RPC };
}

async function rpc(source, method, params = [], fetchImpl = fetch) {
  const started = Date.now();
  const response = await fetchImpl(source.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  if (!response.ok) throw new Error(`${source.name}:${method}:http_${response.status}`);
  const payload = await response.json();
  if (payload?.error) {
    const code = payload.error.code == null ? 'rpc' : payload.error.code;
    throw new Error(`${source.name}:${method}:${code}:${s(payload.error.message)}`);
  }
  return { result: payload?.result, latencyMs: Date.now() - started };
}

export async function listAddressSignatures(env, wallet, options = {}) {
  if (!WALLET_RE.test(s(wallet))) throw new Error('invalid_public_wallet');
  const source = options.source || resolveRpcSource(env);
  const limit = Math.max(1, Math.min(MAX_PAGE, Math.round(n(options.limit || 25))));
  const config = { limit, commitment: 'confirmed' };
  if (s(options.before)) config.before = s(options.before);
  if (s(options.until)) config.until = s(options.until);
  const { result, latencyMs } = await rpc(source, 'getSignaturesForAddress', [s(wallet), config], options.fetchImpl);
  return { source, latencyMs, rows: Array.isArray(result) ? result : [] };
}

function accountKeysOf(tx = {}) {
  const msg = tx?.transaction?.message || {};
  const keys = Array.isArray(msg.accountKeys) ? msg.accountKeys : [];
  return keys.map(k => typeof k === 'string' ? k : s(k?.pubkey));
}

function tokenDeltasForWallet(meta = {}, wallet = '') {
  const pre = Array.isArray(meta.preTokenBalances) ? meta.preTokenBalances : [];
  const post = Array.isArray(meta.postTokenBalances) ? meta.postTokenBalances : [];
  const map = new Map();
  for (const row of pre) {
    if (s(row.owner) !== wallet) continue;
    const key = `${n(row.accountIndex)}|${s(row.mint)}`;
    const amount = Number(row.uiTokenAmount?.uiAmountString ?? row.uiTokenAmount?.uiAmount ?? 0);
    map.set(key, { accountIndex: n(row.accountIndex), mint: s(row.mint), pre: Number.isFinite(amount) ? amount : 0, post: 0 });
  }
  for (const row of post) {
    if (s(row.owner) !== wallet) continue;
    const key = `${n(row.accountIndex)}|${s(row.mint)}`;
    const amount = Number(row.uiTokenAmount?.uiAmountString ?? row.uiTokenAmount?.uiAmount ?? 0);
    const current = map.get(key) || { accountIndex: n(row.accountIndex), mint: s(row.mint), pre: 0, post: 0 };
    current.post = Number.isFinite(amount) ? amount : 0;
    map.set(key, current);
  }
  return [...map.values()].map(row => ({ ...row, delta: row.post - row.pre })).filter(row => row.delta !== 0);
}

export function decodeRpcTransactionForWallet(signatureRow, tx, wallet, sourceName = 'rpc') {
  if (!tx) return [];
  const keys = accountKeysOf(tx);
  const walletIndex = keys.indexOf(wallet);
  const meta = tx.meta || {};
  const preBalances = Array.isArray(meta.preBalances) ? meta.preBalances : [];
  const postBalances = Array.isArray(meta.postBalances) ? meta.postBalances : [];
  const solDeltaLamports = walletIndex >= 0 ? n(postBalances[walletIndex]) - n(preBalances[walletIndex]) : 0;
  const tokenDeltas = tokenDeltasForWallet(meta, wallet);
  const slot = n(tx.slot || signatureRow?.slot);
  const blockTime = n(tx.blockTime || signatureRow?.blockTime);
  const signature = s(signatureRow?.signature || tx?.transaction?.signatures?.[0]);
  const fee = n(meta.fee);
  const failed = Boolean(meta.err || signatureRow?.err);
  const rows = [];

  if (tokenDeltas.length) {
    for (const token of tokenDeltas) {
      rows.push({
        signature,
        slot,
        blockTime,
        wallet,
        mint: token.mint,
        eventClass: tokenDeltas.some(t => t.delta > 0) && tokenDeltas.some(t => t.delta < 0) ? 'swap-like' : 'transfer',
        solDelta: solDeltaLamports / 1_000_000_000,
        tokenDelta: token.delta,
        feeLamports: fee,
        source: sourceName,
        confidence: failed ? 0 : 0.8,
        decoderVersion: 'bull-mesh-rpc-v1'
      });
    }
  } else {
    rows.push({
      signature,
      slot,
      blockTime,
      wallet,
      eventClass: 'transfer',
      solDelta: solDeltaLamports / 1_000_000_000,
      tokenDelta: 0,
      feeLamports: fee,
      source: sourceName,
      confidence: failed ? 0 : 0.7,
      decoderVersion: 'bull-mesh-rpc-v1'
    });
  }
  return rows;
}

async function fetchTransactions(env, signatureRows, options = {}) {
  const source = options.source || resolveRpcSource(env);
  const out = [];
  let totalLatencyMs = 0;
  const max = Math.min(MAX_TX_PER_PASS, signatureRows.length);
  for (const sigRow of signatureRows.slice(0, max)) {
    try {
      const { result, latencyMs } = await rpc(source, 'getTransaction', [sigRow.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
        encoding: 'jsonParsed'
      }], options.fetchImpl);
      totalLatencyMs += latencyMs;
      out.push({ signatureRow: sigRow, tx: result });
    } catch (error) {
      out.push({ signatureRow: sigRow, tx: null, error: s(error?.message) });
    }
  }
  return { source, totalLatencyMs, rows: out };
}

async function persistSourceHealth(db, source, state, latencyMs = null, error = '') {
  if (!db) return;
  await db.prepare(`
    INSERT INTO bull_source_health
      (source, source_kind, state, last_ok_at, last_error_at, latency_ms, details_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(source) DO UPDATE SET
      source_kind=excluded.source_kind,
      state=excluded.state,
      last_ok_at=CASE WHEN excluded.state='ok' THEN excluded.last_ok_at ELSE last_ok_at END,
      last_error_at=CASE WHEN excluded.state='error' THEN excluded.last_error_at ELSE last_error_at END,
      latency_ms=excluded.latency_ms,
      details_json=excluded.details_json,
      updated_at=unixepoch()
  `).bind(source.name, source.kind, state, state === 'ok' ? now() : null,
    state === 'error' ? now() : null, latencyMs, JSON.stringify(error ? { error } : {})).run();
}

async function persistProvenance(db, wallet, source, items) {
  if (!db) return;
  for (const item of items) {
    const sig = s(item.signatureRow?.signature);
    if (!sig) continue;
    await db.prepare(`
      INSERT INTO bull_event_provenance
        (signature, wallet, source, source_kind, observed_at, slot, commitment, verified)
      VALUES (?, ?, ?, ?, unixepoch(), ?, 'confirmed', ?)
      ON CONFLICT(signature, wallet, source) DO UPDATE SET
        observed_at=unixepoch(), slot=excluded.slot, commitment=excluded.commitment,
        verified=MAX(verified, excluded.verified)
    `).bind(sig, wallet, source.name, source.kind, n(item.signatureRow?.slot) || null, item.tx ? 1 : 0).run();
  }
}

async function upsertCoverage(db, wallet, source, signatureRows, accepted, complete) {
  if (!db) return;
  const newest = signatureRows[0] || null;
  const oldest = signatureRows[signatureRows.length - 1] || null;
  await db.prepare(`
    INSERT INTO bull_index_coverage
      (wallet, newest_signature, oldest_signature, newest_slot, oldest_slot,
       newest_block_time, oldest_block_time, indexed_events, indexed_transactions,
       complete_to_genesis, status, source_set_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(wallet) DO UPDATE SET
      newest_signature=COALESCE(bull_index_coverage.newest_signature, excluded.newest_signature),
      oldest_signature=COALESCE(excluded.oldest_signature, bull_index_coverage.oldest_signature),
      newest_slot=MAX(COALESCE(bull_index_coverage.newest_slot,0), COALESCE(excluded.newest_slot,0)),
      oldest_slot=CASE WHEN bull_index_coverage.oldest_slot IS NULL THEN excluded.oldest_slot
                      WHEN excluded.oldest_slot IS NULL THEN bull_index_coverage.oldest_slot
                      ELSE MIN(bull_index_coverage.oldest_slot, excluded.oldest_slot) END,
      newest_block_time=MAX(COALESCE(bull_index_coverage.newest_block_time,0), COALESCE(excluded.newest_block_time,0)),
      oldest_block_time=CASE WHEN bull_index_coverage.oldest_block_time IS NULL THEN excluded.oldest_block_time
                            WHEN excluded.oldest_block_time IS NULL THEN bull_index_coverage.oldest_block_time
                            ELSE MIN(bull_index_coverage.oldest_block_time, excluded.oldest_block_time) END,
      indexed_events=bull_index_coverage.indexed_events + excluded.indexed_events,
      indexed_transactions=bull_index_coverage.indexed_transactions + excluded.indexed_transactions,
      complete_to_genesis=MAX(bull_index_coverage.complete_to_genesis, excluded.complete_to_genesis),
      status=excluded.status,
      source_set_json=excluded.source_set_json,
      updated_at=unixepoch()
  `).bind(wallet, s(newest?.signature) || null, s(oldest?.signature) || null,
    n(newest?.slot) || null, n(oldest?.slot) || null, n(newest?.blockTime) || null,
    n(oldest?.blockTime) || null, accepted, signatureRows.length, complete ? 1 : 0,
    complete ? 'complete' : 'partial', JSON.stringify([source.name])).run();
}

async function updateJob(db, jobId, patch = {}) {
  if (!db || !jobId) return;
  await db.prepare(`
    UPDATE bull_index_jobs SET
      state=?, cursor_before=?, pages_completed=pages_completed+?,
      signatures_seen=signatures_seen+?, transactions_ingested=transactions_ingested+?,
      source=?, last_error=?, next_attempt_at=?, updated_at=unixepoch()
    WHERE id=?
  `).bind(
    s(patch.state || 'running'), s(patch.cursorBefore) || null, n(patch.pagesCompleted),
    n(patch.signaturesSeen), n(patch.transactionsIngested), s(patch.source) || null,
    s(patch.lastError) || null, patch.nextAttemptAt == null ? null : n(patch.nextAttemptAt), jobId
  ).run();
}

export async function queueWalletBackfill(env, wallet, options = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Bull Intelligence D1 binding is unavailable.');
  if (!WALLET_RE.test(s(wallet))) throw new Error('invalid_public_wallet');
  const source = options.source || resolveRpcSource(env);
  const result = await db.prepare(`
    INSERT INTO bull_index_jobs(wallet, state, cursor_before, page_size, source, updated_at)
    VALUES (?, 'queued', ?, ?, ?, unixepoch())
  `).bind(s(wallet), s(options.before) || null,
    Math.max(1, Math.min(MAX_PAGE, Math.round(n(options.pageSize || 25)))), source.name).run();
  return { jobId: result?.meta?.last_row_id || null, wallet: s(wallet), source: source.name, state: 'queued' };
}

export async function backfillWalletPass(env, wallet, options = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Bull Intelligence D1 binding is unavailable.');
  if (!WALLET_RE.test(s(wallet))) throw new Error('invalid_public_wallet');
  const source = options.source || resolveRpcSource(env);
  const pageSize = Math.max(1, Math.min(MAX_PAGE, Math.round(n(options.pageSize || 25))));
  const before = s(options.before);
  const jobId = n(options.jobId) || null;

  try {
    if (jobId) await updateJob(db, jobId, { state: 'running', source: source.name });
    const signatures = await listAddressSignatures(env, wallet, { source, before, limit: pageSize, fetchImpl: options.fetchImpl });
    const txs = await fetchTransactions(env, signatures.rows, { source, fetchImpl: options.fetchImpl });
    const decoded = txs.rows.flatMap(item => decodeRpcTransactionForWallet(item.signatureRow, item.tx, s(wallet), source.name));
    const ingested = await ingestDecodedObservations(env, s(wallet), decoded, { windowKey: 'progressive-backfill' });
    const nextCursor = s(signatures.rows[signatures.rows.length - 1]?.signature);
    const complete = signatures.rows.length < pageSize || !nextCursor;
    await persistProvenance(db, s(wallet), source, txs.rows);
    await upsertCoverage(db, s(wallet), source, signatures.rows, ingested.accepted, complete);
    await persistSourceHealth(db, source, 'ok', Math.round((signatures.latencyMs + txs.totalLatencyMs) / Math.max(1, 1 + txs.rows.length)));
    if (jobId) await updateJob(db, jobId, {
      state: complete ? 'complete' : 'queued',
      cursorBefore: complete ? '' : nextCursor,
      pagesCompleted: 1,
      signaturesSeen: signatures.rows.length,
      transactionsIngested: txs.rows.filter(x => x.tx).length,
      source: source.name,
      nextAttemptAt: complete ? null : now() + 5
    });
    return {
      ok: true,
      wallet: s(wallet),
      source: source.name,
      signatures: signatures.rows.length,
      transactionsFetched: txs.rows.filter(x => x.tx).length,
      acceptedEvents: ingested.accepted,
      complete,
      nextCursor: complete ? null : nextCursor,
      coverage: complete ? 'complete' : 'partial'
    };
  } catch (error) {
    await persistSourceHealth(db, source, 'error', null, s(error?.message));
    if (jobId) await updateJob(db, jobId, { state: 'retry', lastError: s(error?.message), source: source.name, nextAttemptAt: now() + 60 });
    throw error;
  }
}

export async function getWalletCoverage(env, wallet) {
  const db = intelligenceDb(env);
  if (!db) return null;
  if (!WALLET_RE.test(s(wallet))) throw new Error('invalid_public_wallet');
  return db.prepare(`
    SELECT wallet, newest_signature, oldest_signature, newest_slot, oldest_slot,
           newest_block_time, oldest_block_time, indexed_events, indexed_transactions,
           complete_to_genesis, status, source_set_json, last_error, updated_at
    FROM bull_index_coverage WHERE wallet=?
  `).bind(s(wallet)).first();
}

export async function getMeshStatus(env) {
  const db = intelligenceDb(env);
  const source = resolveRpcSource(env);
  const sources = db ? await db.prepare(`
    SELECT source, source_kind, state, last_ok_at, last_error_at, latency_ms,
           gap_count, details_json, updated_at
    FROM bull_source_health ORDER BY updated_at DESC LIMIT 20
  `).all() : { results: [] };
  return {
    version: 1,
    enabled: meshEnabled(env),
    readOnly: true,
    publicAddressOnly: true,
    activeSource: { name: source.name, kind: source.kind },
    adapters: {
      standardRpc: 'ready',
      heliusPaidHistory: 'optional',
      richatYellowstone: 'adapter-ready',
      substreamsSvm: 'adapter-ready',
      oldFaithful: 'adapter-ready'
    },
    sources: Array.isArray(sources?.results) ? sources.results : []
  };
}
