import { intelligenceDb } from './intelligence-indexer.mjs';
import { refreshZ500Universe } from './intelligence-z500-universe.mjs';
import { loadLiveZ500References, resolveZ500Reference } from './intelligence-z500-evidence-collector.mjs';
import { refreshConfiguredLaunchpadUniverses } from './intelligence-launchpad-universe-selectors.mjs';
import { reconcileZ500HeliusWatchlist } from './intelligence-helius-universe-watchlist.mjs';
import { runPatternLabWindows } from './intelligence-pattern-lab-durable.mjs';
import { analyzeDecisionModels } from './intelligence-decision-research.mjs';
import { analyzeUniverseAnomalies } from './intelligence-anomaly-research.mjs';

const s = value => String(value ?? '').trim();
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const bool = value => String(value || '').toLowerCase() === 'true';

async function acquireLease(db, key, now, ttl) {
  await db.prepare("INSERT OR IGNORE INTO intelligence_scheduler_leases(lease_key,lease_until,last_state,updated_at) VALUES(?,0,'idle',unixepoch())").bind(key).run();
  const result = await db.prepare("UPDATE intelligence_scheduler_leases SET lease_until=?,last_started_at=?,last_state='running',last_error=NULL,run_count=run_count+1,updated_at=unixepoch() WHERE lease_key=? AND lease_until<=?").bind(now + ttl, now, key, now).run();
  return n(result?.meta?.changes) > 0;
}

async function finishLease(db, key, now, state, error = '') {
  await db.prepare('UPDATE intelligence_scheduler_leases SET lease_until=?,last_completed_at=?,last_state=?,last_error=?,updated_at=unixepoch() WHERE lease_key=?').bind(now, now, state, error ? s(error).slice(0, 500) : null, key).run();
}

async function z500IdentityPass(env, now) {
  const enabled = bool(env.Z500_IDENTITY_ENABLED) || bool(env.Z500_UNIVERSE_ENABLED);
  if (!enabled) return { enabled: false };
  const db = intelligenceDb(env);
  if (!db) return { enabled: true, ok: false, error: 'database_unavailable' };

  const refreshSeconds = Math.max(60, Math.min(3600, Math.trunc(n(env.Z500_IDENTITY_REFRESH_SECONDS) || 300)));
  const batchSize = Math.max(1, Math.min(5, Math.trunc(n(env.Z500_IDENTITY_BATCH_SIZE) || 2)));
  const key = 'z500-identity:batch';
  if (!(await acquireLease(db, key, now, refreshSeconds))) return { enabled: true, ok: true, skipped: 'lease' };

  try {
    const live = await loadLiveZ500References(env);
    if (!live?.live && !bool(env.Z500_ALLOW_REFERENCE_FALLBACK)) throw new Error('z500_live_source_required');

    const registryRows = await db.prepare(`
      SELECT canonical_id,verification_state,last_verified_at,updated_at
      FROM intelligence_z500_token_registry
    `).all();
    const registry = new Map((registryRows?.results || []).map(row => [s(row.canonical_id), row]));

    const references = [...(live?.rows || [])].sort((left, right) => {
      const a = registry.get(s(left.canonicalId));
      const b = registry.get(s(right.canonicalId));
      const aVerified = s(a?.verification_state) === 'verified' ? 1 : 0;
      const bVerified = s(b?.verification_state) === 'verified' ? 1 : 0;
      if (aVerified !== bVerified) return aVerified - bVerified;
      const aAge = n(a?.last_verified_at) || n(a?.updated_at) || 0;
      const bAge = n(b?.last_verified_at) || n(b?.updated_at) || 0;
      if (aAge !== bAge) return aAge - bAge;
      return n(left.rank) - n(right.rank);
    }).slice(0, batchSize);

    const results = [];
    for (const reference of references) {
      try {
        const result = await resolveZ500Reference(env, reference);
        results.push({
          canonicalId: s(reference.canonicalId),
          rank: n(reference.rank),
          name: s(reference.name),
          ticker: s(reference.ticker),
          ok: result?.ok !== false,
          state: s(result?.decision?.state || result?.state),
          mint: s(result?.decision?.mint || result?.mint) || null,
          method: s(result?.decision?.method || result?.method) || null,
          error: s(result?.error) || null
        });
      } catch (error) {
        results.push({
          canonicalId: s(reference.canonicalId),
          rank: n(reference.rank),
          name: s(reference.name),
          ticker: s(reference.ticker),
          ok: false,
          state: 'error',
          mint: null,
          method: null,
          error: s(error?.message || error)
        });
      }
    }

    const verified = results.filter(row => row.state === 'verified').length;
    const failed = results.filter(row => row.ok === false || row.state === 'error').length;
    const state = failed === results.length && results.length ? 'error' : failed ? 'partial' : 'ok';
    await finishLease(db, key, now, state, failed ? `${failed}_identity_resolution_failures` : '');
    return {
      enabled: true,
      ok: state !== 'error',
      live: Boolean(live?.live),
      source: s(live?.source),
      batchSize,
      processed: results.length,
      verified,
      failed,
      results
    };
  } catch (error) {
    await finishLease(db, key, now, 'error', s(error?.message || error));
    return { enabled: true, ok: false, failClosed: true, error: s(error?.message || error) };
  }
}

async function activeUniverses(env, limit = 5) {
  const db = intelligenceDb(env);
  if (!db) return [];
  const requested = Math.trunc(n(limit) || 5);
  const cap = Math.max(1, Math.min(8, requested));
  const result = await db.prepare("SELECT universe_id FROM intelligence_universes WHERE active=1 ORDER BY CASE universe_id WHEN 'z500-top10' THEN 0 WHEN 'solana' THEN 1 ELSE 2 END,universe_id LIMIT ?").bind(cap).all();
  return (result?.results || []).map(row => s(row.universe_id)).filter(Boolean);
}

async function patternPass(env, now) {
  if (String(env.UNIVERSE_PATTERN_LAB_ENABLED || '').toLowerCase() !== 'true') return { enabled: false };
  const db = intelligenceDb(env);
  if (!db) return { enabled: true, ok: false, error: 'database_unavailable' };
  const refreshSeconds = Math.max(900, Math.min(6 * 3600, Math.trunc(n(env.PATTERN_LAB_REFRESH_SECONDS) || 3600)));
  const key = 'pattern-lab:all';
  if (!(await acquireLease(db, key, now, refreshSeconds))) return { enabled: true, ok: true, skipped: 'lease' };
  try {
    const result = await runPatternLabWindows(env, {
      universeLimit: Math.max(1, Math.min(8, Math.trunc(n(env.PATTERN_LAB_UNIVERSE_LIMIT) || 5))),
      limit: Math.max(500, Math.min(20000, Math.trunc(n(env.PATTERN_LAB_EVENT_LIMIT) || 10000)))
    });
    await finishLease(db, key, now, 'ok');
    return { ok: true, ...result };
  } catch (error) {
    await finishLease(db, key, now, 'error', s(error?.message || error));
    return { enabled: true, ok: false, error: s(error?.message || error) };
  }
}

async function decisionPass(env, now) {
  if (String(env.UNIVERSE_DECISION_RESEARCH_ENABLED ?? env.UNIVERSE_PATTERN_LAB_ENABLED ?? '').toLowerCase() !== 'true') return { enabled: false };
  const db = intelligenceDb(env);
  if (!db) return { enabled: true, ok: false, error: 'database_unavailable' };
  const ttl = Math.max(1800, Math.min(12 * 3600, Math.trunc(n(env.DECISION_RESEARCH_REFRESH_SECONDS) || 3 * 3600)));
  const key = 'decision-research:all';
  if (!(await acquireLease(db, key, now, ttl))) return { enabled: true, ok: true, skipped: 'lease' };
  try {
    const universes = await activeUniverses(env, n(env.DECISION_RESEARCH_UNIVERSE_LIMIT) || 5);
    const results = [];
    for (const universeId of universes) {
      results.push(await analyzeDecisionModels(env, universeId, {
        windowSeconds: 7 * 86400,
        now,
        limit: Math.max(1000, Math.min(20000, Math.trunc(n(env.DECISION_RESEARCH_EVENT_LIMIT) || 12000))),
        walletLimit: Math.max(25, Math.min(500, Math.trunc(n(env.DECISION_RESEARCH_WALLET_LIMIT) || 200))),
        persist: true
      }));
    }
    await finishLease(db, key, now, 'ok');
    return { enabled: true, ok: true, universes: results.map(item => ({ universeId: item.universeId, eventsAnalyzed: item.eventsAnalyzed, walletsAnalyzed: item.walletsAnalyzed })) };
  } catch (error) {
    await finishLease(db, key, now, 'error', s(error?.message || error));
    return { enabled: true, ok: false, error: s(error?.message || error) };
  }
}

async function anomalyPass(env, now) {
  if (String(env.UNIVERSE_ANOMALY_RESEARCH_ENABLED ?? env.UNIVERSE_PATTERN_LAB_ENABLED ?? '').toLowerCase() !== 'true') return { enabled: false };
  const db = intelligenceDb(env);
  if (!db) return { enabled: true, ok: false, error: 'database_unavailable' };
  const ttl = Math.max(3600, Math.min(24 * 3600, Math.trunc(n(env.ANOMALY_RESEARCH_REFRESH_SECONDS) || 6 * 3600)));
  const key = 'anomaly-research:all';
  if (!(await acquireLease(db, key, now, ttl))) return { enabled: true, ok: true, skipped: 'lease' };
  try {
    const universes = await activeUniverses(env, n(env.ANOMALY_RESEARCH_UNIVERSE_LIMIT) || 5);
    const results = [];
    for (const universeId of universes) {
      results.push(await analyzeUniverseAnomalies(env, universeId, {
        windowSeconds: 7 * 86400,
        now,
        limit: Math.max(1000, Math.min(20000, Math.trunc(n(env.ANOMALY_RESEARCH_EVENT_LIMIT) || 12000))),
        persist: true
      }));
    }
    await finishLease(db, key, now, 'ok');
    return { enabled: true, ok: true, universes: results.map(item => ({ universeId: item.universeId, eventsAnalyzed: item.eventsAnalyzed, findings: item.findingCount, clusters: item.clusterCount })) };
  } catch (error) {
    await finishLease(db, key, now, 'error', s(error?.message || error));
    return { enabled: true, ok: false, error: s(error?.message || error) };
  }
}

export async function runUniverseScheduledMaintenance(env = {}, options = {}) {
  const now = Math.max(0, Math.trunc(n(options.now) || Date.now() / 1000));
  if (String(env.ECOSYSTEM_UNIVERSES_ENABLED || '').toLowerCase() !== 'true') return { enabled: false };
  const identity = await z500IdentityPass(env, now);
  const selector = await refreshZ500Universe(env, { now });
  const launchpads = await refreshConfiguredLaunchpadUniverses(env, { now });
  const watchlist = await reconcileZ500HeliusWatchlist(env, { now });
  const patternLab = await patternPass(env, now);
  const decisionResearch = await decisionPass(env, now);
  const anomalyResearch = await anomalyPass(env, now);
  return { enabled: true, now, identity, selector, launchpads, watchlist, patternLab, decisionResearch, anomalyResearch };
}

export async function universeSchedulerHealth(env = {}) {
  const db = intelligenceDb(env);
  if (!db) return { ok: false, error: 'database_unavailable' };
  const leases = await db.prepare("SELECT lease_key,lease_until,last_started_at,last_completed_at,last_state,last_error,run_count,updated_at FROM intelligence_scheduler_leases WHERE lease_key LIKE 'z500-identity:%' OR lease_key LIKE 'selector:%' OR lease_key LIKE 'pattern-lab:%' OR lease_key LIKE 'decision-research:%' OR lease_key LIKE 'anomaly-research:%' ORDER BY lease_key").all();
  const source = await db.prepare("SELECT universe_id,source,selector_version,observed_at,candidate_count,accepted_count,state FROM intelligence_universe_source_snapshots WHERE universe_id='z500-top10' ORDER BY observed_at DESC LIMIT 1").first();
  const webhook = await db.prepare("SELECT provider,universe_id,state,account_count,last_attempt_at,last_success_at,updated_at FROM intelligence_webhook_reconcile_state WHERE universe_id='z500-top10' ORDER BY updated_at DESC LIMIT 1").first();
  let identityStates = [];
  try {
    const states = await db.prepare("SELECT verification_state,COUNT(*) count FROM intelligence_z500_token_registry GROUP BY verification_state ORDER BY verification_state").all();
    identityStates = states?.results || [];
  } catch {}
  return { ok: true, leases: leases?.results || [], z500Source: source || null, z500Webhook: webhook || null, z500IdentityStates: identityStates };
}

export const __universeSchedulerContract = Object.freeze({
  z500LeaseSeconds: 900,
  z500IdentityBeforeSelector: true,
  z500IdentityBatchDefault: 2,
  z500IdentityRefreshDefaultSeconds: 300,
  patternDefaultSeconds: 3600,
  decisionDefaultSeconds: 10800,
  anomalyDefaultSeconds: 21600,
  watchlistReconcilesAfterSelector: true
});


