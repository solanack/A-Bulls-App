/* A Bulls App — Intelligence Mesh scheduler
 * Bounded background continuation for public-wallet history jobs.
 */

import { intelligenceDb } from './intelligence-indexer.mjs';
import { runSourceAwareHistoryPass } from './intelligence-history-orchestrator.mjs';

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const finite = v => v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const s = v => String(v == null ? '' : v).trim();
const now = () => Math.floor(Date.now() / 1000);
const has = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);

export function schedulerEnabled(env = {}) {
  return String(env.INTELLIGENCE_MESH_ENABLED || '').toLowerCase() === 'true';
}

export function marketBackfillQueueEnabled(env = {}) {
  return schedulerEnabled(env) && String(env.MARKET_BACKFILL_QUEUE_ENABLED || '').toLowerCase() === 'true';
}

export async function queueHistoryJob(env = {}, wallet = '', options = {}) {
  const db = intelligenceDb(env);
  if (!db) throw new Error('Intelligence database binding is unavailable.');
  const requestedFrom=finite(options.requestedFrom),requestedTo=finite(options.requestedTo);
  const existing = await db.prepare(`
    SELECT id,state,cursor_before,page_size,requested_from,requested_to FROM intelligence_index_jobs
    WHERE wallet=? AND job_type='wallet-backfill' AND state IN ('queued','running','waiting-external')
    ORDER BY updated_at DESC LIMIT 1
  `).bind(s(wallet)).first();
  if (existing?.id) {
    const widenedFrom=requestedFrom==null?finite(existing.requested_from):existing.requested_from==null?requestedFrom:Math.min(Number(existing.requested_from),requestedFrom);
    const widenedTo=requestedTo==null?finite(existing.requested_to):existing.requested_to==null?requestedTo:Math.max(Number(existing.requested_to),requestedTo);
    await db.prepare(`UPDATE intelligence_index_jobs SET requested_from=?,requested_to=?,updated_at=unixepoch() WHERE id=?`).bind(widenedFrom,widenedTo,existing.id).run();
    return { jobId: existing.id, state: existing.state, reused: true, requestedFrom:widenedFrom, requestedTo:widenedTo };
  }
  if(requestedFrom!=null&&requestedTo!=null){
    const completed=await db.prepare(`
      SELECT id,state,requested_from,requested_to FROM intelligence_index_jobs
      WHERE wallet=? AND job_type='wallet-backfill' AND state='complete'
        AND requested_from IS NOT NULL AND requested_to IS NOT NULL
        AND requested_from<=? AND requested_to>=?
      ORDER BY updated_at DESC LIMIT 1
    `).bind(s(wallet),requestedFrom,requestedTo).first();
    if(completed?.id)return{jobId:completed.id,state:'complete',reused:true,requestedFrom:finite(completed.requested_from),requestedTo:finite(completed.requested_to)};
  }
  const pageSize = Math.max(1, Math.min(50, Math.round(n(options.pageSize || 25))));
  const result = await db.prepare(`
    INSERT INTO intelligence_index_jobs(wallet,job_type,state,cursor_before,page_size,requested_from,requested_to,next_attempt_at,created_at,updated_at)
    VALUES(?,'wallet-backfill','queued',?,?,?,?,unixepoch(),unixepoch(),unixepoch())
  `).bind(s(wallet), s(options.before) || null, pageSize, requestedFrom, requestedTo).run();
  return { jobId: result?.meta?.last_row_id || null, state: 'queued', reused: false, requestedFrom, requestedTo };
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
    const job = await queueHistoryJob(env, wallet, { pageSize, requestedFrom:finite(plan.requestFrom??candidate?.requestFrom), requestedTo:finite(plan.requestTo) });
    jobs.push({ wallet, reason: s(candidate?.reason) || 'market-backfill-plan', ...job });
  }
  return { ok: true, enabled: true, queued: jobs.filter(job => !job.reused).length, reused: jobs.filter(job => job.reused).length, jobs };
}

async function claimJobs(db, limit = 2) {
  const rows = await db.prepare(`
    SELECT id,wallet,cursor_before,page_size,requested_from,requested_to FROM intelligence_index_jobs
    WHERE state='queued' AND (next_attempt_at IS NULL OR next_attempt_at<=?)
    ORDER BY updated_at ASC LIMIT ?
  `).bind(now(), Math.max(1, Math.min(5, n(limit) || 2))).all();
  const claimed=[];
  for(const row of rows?.results||[]){
    const result=await db.prepare(`UPDATE intelligence_index_jobs SET state='running',updated_at=unixepoch() WHERE id=? AND state='queued'`).bind(row.id).run();
    if(Number(result?.meta?.changes)>0)claimed.push(row);
  }
  return claimed;
}

async function patchJob(db, id, patch = {}) {
  const cursorValue = has(patch,'cursorBefore') ? (s(patch.cursorBefore) || null) : null;
  const sourceValue = has(patch,'source') ? (s(patch.source) || null) : null;
  const errorValue = has(patch,'error') ? (s(patch.error) || null) : null;
  const nextValue = has(patch,'nextAttemptAt') ? (patch.nextAttemptAt == null ? null : n(patch.nextAttemptAt)) : null;
  await db.prepare(`
    UPDATE intelligence_index_jobs SET
      state=?,
      cursor_before=CASE WHEN ?=1 THEN ? ELSE cursor_before END,
      pages_completed=pages_completed+?,signatures_seen=signatures_seen+?,transactions_ingested=transactions_ingested+?,
      source=CASE WHEN ?=1 THEN ? ELSE source END,
      last_error=CASE WHEN ?=1 THEN ? ELSE last_error END,
      next_attempt_at=CASE WHEN ?=1 THEN ? ELSE next_attempt_at END,
      updated_at=unixepoch()
    WHERE id=?
  `).bind(
    s(patch.state || 'queued'),
    has(patch,'cursorBefore')?1:0,cursorValue,
    n(patch.pages),n(patch.signatures),n(patch.transactions),
    has(patch,'source')?1:0,sourceValue,
    has(patch,'error')?1:0,errorValue,
    has(patch,'nextAttemptAt')?1:0,nextValue,
    n(id)
  ).run();
}

export async function runIntelligenceMeshScheduler(env = {}, options = {}) {
  if (!schedulerEnabled(env)) return { ok: true, enabled: false, processed: 0 };
  const db = intelligenceDb(env);
  if (!db) return { ok: false, enabled: true, error: 'database_unavailable', processed: 0 };
  const jobs = await claimJobs(db, options.limit || 2);
  const results = [];

  for (const job of jobs) {
    await patchJob(db, job.id, { state: 'running', error:null });
    try {
      const result = await runSourceAwareHistoryPass(env, job.wallet, {
        indexJobId: job.id,
        before: job.cursor_before || '',
        pageSize: job.page_size || 25,
        from: finite(job.requested_from),
        to: finite(job.requested_to)
      });
      if(result.deferred){
        await patchJob(db, job.id, { state:'waiting-external', source:result.source, nextAttemptAt:null });
        results.push({ jobId:job.id,wallet:job.wallet,requestedFrom:finite(job.requested_from),requestedTo:finite(job.requested_to),...result });
        continue;
      }
      await patchJob(db, job.id, {
        state: result.complete ? 'complete' : 'queued',
        cursorBefore: result.nextCursor || '',
        pages: 1,
        signatures: result.signatures,
        transactions: result.transactionsFetched,
        source: result.source,
        error:null,
        nextAttemptAt: result.complete ? null : now() + 15
      });
      results.push({ jobId: job.id, wallet: job.wallet, requestedFrom:finite(job.requested_from), requestedTo:finite(job.requested_to), ...result });
    } catch (error) {
      await patchJob(db, job.id, {
        state: 'queued',
        error: s(error?.message || error),
        nextAttemptAt: now() + 120
      });
      results.push({ jobId: job.id, wallet: job.wallet, requestedFrom:finite(job.requested_from), requestedTo:finite(job.requested_to), ok: false, error: s(error?.message || error), attempts: Array.isArray(error?.attempts) ? error.attempts : [] });
    }
  }

  return { ok: true, enabled: true, processed: results.length, results };
}
