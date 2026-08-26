/* A Bulls App — Intelligence Mesh scheduler
 * Bounded background continuation for public-wallet history jobs.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';
import { runSourceAwareHistoryPass } from './intelligence-history-orchestrator.mjs';

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const s = v => String(v == null ? '' : v).trim();
const now = () => Math.floor(Date.now() / 1000);

export function schedulerEnabled(env = {}) {
  return String(env.INTELLIGENCE_MESH_ENABLED || '').toLowerCase() === 'true';
}

export function marketBackfillQueueEnabled(env = {}) {
  return schedulerEnabled(env) && String(env.MARKET_BACKFILL_QUEUE_ENABLED || '').toLowerCase() === 'true';
}

export async function queueHistoryJob(env = {}, wallet = '', options = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Intelligence database binding is unavailable.');
  const existing = await db.prepare(`
    SELECT id,state,cursor_before,page_size FROM intelligence_index_jobs
    WHERE wallet=? AND job_type='wallet-backfill' AND state IN ('queued','running')
    ORDER BY updated_at DESC LIMIT 1
  `).bind(s(wallet)).first();
  if (existing?.id) return { jobId: existing.id, state: existing.state, reused: true };
  const pageSize = Math.max(1, Math.min(50, Math.round(n(options.pageSize || 25))));
  const result = await db.prepare(`
    INSERT INTO intelligence_index_jobs(wallet,job_type,state,cursor_before,page_size,next_attempt_at,created_at,updated_at)
    VALUES(?,'wallet-backfill','queued',?,?,unixepoch(),unixepoch(),unixepoch())
  `).bind(s(wallet), s(options.before) || null, pageSize).run();
  return { jobId: result?.meta?.last_row_id || null, state: 'queued', reused: false };
}

export async function queueMarketBackfillCandidates(env = {}, plan = {}, options = {}) {
  if (!marketBackfillQueueEnabled(env)) return { ok: true, enabled: false, queued: 0, jobs: [] };
  const candidates = Array.isArray(plan?.candidates) ? plan.candidates : [];
  const limit = Math.max(0, Math.min(10, Math.trunc(n(options.limit == null ? 2 : options.limit))));
  const pageSize = Math.max(1, Math.min(50, Math.round(n(options.pageSize || 25))));
  const jobs = [];
  for (const candidate of candidates.slice(0, limit)) {
    const wallet = s(candidate?.wallet);
    if (!wallet) continue;
    const job = await queueHistoryJob(env, wallet, { pageSize });
    jobs.push({ wallet, reason: s(candidate?.reason) || 'market-backfill-plan', ...job });
  }
  return { ok: true, enabled: true, queued: jobs.filter(job => !job.reused).length, reused: jobs.filter(job => job.reused).length, jobs };
}

async function claimJobs(db, limit = 2) {
  const rows = await db.prepare(`
    SELECT id,wallet,cursor_before,page_size FROM intelligence_index_jobs
    WHERE state='queued' AND (next_attempt_at IS NULL OR next_attempt_at<=?)
    ORDER BY updated_at ASC LIMIT ?
  `).bind(now(), Math.max(1, Math.min(5, n(limit) || 2))).all();
  return rows?.results || [];
}

async function patchJob(db, id, patch = {}) {
  await db.prepare(`
    UPDATE intelligence_index_jobs SET
      state=?,cursor_before=?,pages_completed=pages_completed+?,signatures_seen=signatures_seen+?,
      transactions_ingested=transactions_ingested+?,source=?,last_error=?,next_attempt_at=?,updated_at=unixepoch()
    WHERE id=?
  `).bind(
    s(patch.state || 'queued'), s(patch.cursorBefore) || null, n(patch.pages), n(patch.signatures),
    n(patch.transactions), s(patch.source) || null, s(patch.error) || null,
    patch.nextAttemptAt == null ? null : n(patch.nextAttemptAt), n(id)
  ).run();
}

export async function runIntelligenceMeshScheduler(env = {}, options = {}) {
  if (!schedulerEnabled(env)) return { ok: true, enabled: false, processed: 0 };
  const db = intelligenceDb(env);
  if (!db) return { ok: false, enabled: true, error: 'database_unavailable', processed: 0 };
  const jobs = await claimJobs(db, options.limit || 2);
  const results = [];

  for (const job of jobs) {
    await patchJob(db, job.id, { state: 'running' });
    try {
      const result = await runSourceAwareHistoryPass(env, job.wallet, {
        before: job.cursor_before || '',
        pageSize: job.page_size || 25
      });
      await patchJob(db, job.id, {
        state: result.complete ? 'complete' : 'queued',
        cursorBefore: result.nextCursor || '',
        pages: 1,
        signatures: result.signatures,
        transactions: result.transactionsFetched,
        source: result.source,
        nextAttemptAt: result.complete ? null : now() + 15
      });
      results.push({ jobId: job.id, wallet: job.wallet, ...result });
    } catch (error) {
      await patchJob(db, job.id, {
        state: 'queued',
        error: s(error?.message || error),
        nextAttemptAt: now() + 120
      });
      results.push({ jobId: job.id, wallet: job.wallet, ok: false, error: s(error?.message || error), attempts: Array.isArray(error?.attempts) ? error.attempts : [] });
    }
  }

  return { ok: true, enabled: true, processed: results.length, results };
}
