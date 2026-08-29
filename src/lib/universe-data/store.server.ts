import { env } from "cloudflare:workers";
import type { Coverage, GalaxyId, UniverseSnapshot } from "@/lib/field/types";
import {
  circuitBreakerLimit,
  monthKey,
  normalizeBudgetPolicy,
  usageCoverage,
} from "./budget";
import type {
  BudgetPolicy,
  ProviderUsage,
  QueryCacheRecord,
  SnapshotRecord,
} from "./contracts";

type D1Result<T = unknown> = {
  results?: T[];
  meta?: { changes?: number };
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<D1Result[]>;
};

type UniverseBindings = {
  UNIVERSE_DB?: D1DatabaseLike;
  HELIUS_MONTHLY_CREDITS?: string;
  HELIUS_BREAKER_RATIO?: string;
};

function db() {
  return (env as unknown as UniverseBindings).UNIVERSE_DB ?? null;
}

function parseJson<T>(value: unknown): T | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function configuredBudgetPolicy(provider: BudgetPolicy["provider"]): BudgetPolicy {
  const bindings = env as unknown as UniverseBindings;
  const monthlyLimit = Number(bindings.HELIUS_MONTHLY_CREDITS || 1_000_000);
  const circuitBreakerRatio = Number(bindings.HELIUS_BREAKER_RATIO || 0.75);
  return normalizeBudgetPolicy({ provider, monthlyLimit, circuitBreakerRatio });
}

export async function readLatestSnapshot(galaxyId: GalaxyId): Promise<SnapshotRecord | null> {
  const database = db();
  if (!database) return null;
  const row = await database
    .prepare(
      `SELECT snapshot_json, coverage, generated_at, source_version
       FROM universe_snapshots
       WHERE galaxy_id = ?
       ORDER BY generated_at DESC
       LIMIT 1`,
    )
    .bind(galaxyId)
    .first<{
      snapshot_json: string;
      coverage: Coverage;
      generated_at: number;
      source_version: string;
    }>();
  const snapshot = parseJson<UniverseSnapshot>(row?.snapshot_json);
  if (!row || !snapshot) return null;
  return {
    galaxyId,
    snapshot,
    coverage: row.coverage,
    generatedAt: row.generated_at,
    sourceVersion: row.source_version,
  };
}

export async function writeSnapshot(record: SnapshotRecord) {
  const database = db();
  if (!database) return false;
  await database
    .prepare(
      `INSERT INTO universe_snapshots
       (galaxy_id, window_start, window_end, generated_at, coverage, source_version, snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(galaxy_id, window_start, window_end)
       DO UPDATE SET generated_at = excluded.generated_at,
                     coverage = excluded.coverage,
                     source_version = excluded.source_version,
                     snapshot_json = excluded.snapshot_json`,
    )
    .bind(
      record.galaxyId,
      record.snapshot.windowStart,
      record.snapshot.windowEnd,
      record.generatedAt,
      record.coverage,
      record.sourceVersion,
      JSON.stringify(record.snapshot),
    )
    .run();
  return true;
}

export async function readQueryCache<T>(
  key: string,
  { allowExpired = false }: { allowExpired?: boolean } = {},
): Promise<QueryCacheRecord<T> | null> {
  const database = db();
  if (!database) return null;
  const row = await database
    .prepare(
      `SELECT payload_json, coverage, observed_at, expires_at
       FROM universe_query_cache WHERE cache_key = ? LIMIT 1`,
    )
    .bind(key)
    .first<{
      payload_json: string;
      coverage: Coverage;
      observed_at: number;
      expires_at: number;
    }>();
  const value = parseJson<T>(row?.payload_json);
  if (!row || value === null) return null;
  const stale = row.expires_at <= Date.now();
  if (stale && !allowExpired) return null;
  return {
    key,
    value,
    coverage: stale ? "stale" : row.coverage,
    observedAt: row.observed_at,
    expiresAt: row.expires_at,
    stale,
  };
}

export async function writeQueryCache<T>(
  key: string,
  value: T,
  ttlMs: number,
  coverage: Coverage = "fresh",
) {
  const database = db();
  if (!database) return false;
  const observedAt = Date.now();
  await database
    .prepare(
      `INSERT INTO universe_query_cache
       (cache_key, payload_json, coverage, observed_at, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(cache_key)
       DO UPDATE SET payload_json = excluded.payload_json,
                     coverage = excluded.coverage,
                     observed_at = excluded.observed_at,
                     expires_at = excluded.expires_at`,
    )
    .bind(key, JSON.stringify(value), coverage, observedAt, observedAt + Math.max(1_000, ttlMs))
    .run();
  return true;
}

export async function reserveProviderUnits(
  policy: BudgetPolicy,
  requestedUnits: number,
  timestamp = Date.now(),
): Promise<ProviderUsage | null> {
  const database = db();
  if (!database) return null;
  const normalized = normalizeBudgetPolicy(policy);
  const units = Math.max(0, Math.trunc(requestedUnits));
  const key = monthKey(timestamp);
  const breaker = circuitBreakerLimit(normalized);
  await database
    .prepare(
      `INSERT INTO provider_usage
       (provider, month_key, requests, units_spent, monthly_limit, breaker_ratio, updated_at)
       VALUES (?, ?, 0, 0, ?, ?, ?)
       ON CONFLICT(provider, month_key) DO NOTHING`,
    )
    .bind(
      normalized.provider,
      key,
      normalized.monthlyLimit,
      normalized.circuitBreakerRatio,
      timestamp,
    )
    .run();
  const update = await database
    .prepare(
      `UPDATE provider_usage
       SET requests = requests + 1,
           units_spent = units_spent + ?,
           monthly_limit = ?,
           breaker_ratio = ?,
           updated_at = ?
       WHERE provider = ? AND month_key = ? AND units_spent + ? <= ?`,
    )
    .bind(
      units,
      normalized.monthlyLimit,
      normalized.circuitBreakerRatio,
      timestamp,
      normalized.provider,
      key,
      units,
      breaker,
    )
    .run();
  const row = await database
    .prepare(
      `SELECT requests, units_spent, monthly_limit, breaker_ratio, updated_at
       FROM provider_usage WHERE provider = ? AND month_key = ? LIMIT 1`,
    )
    .bind(normalized.provider, key)
    .first<{
      requests: number;
      units_spent: number;
      monthly_limit: number;
      breaker_ratio: number;
      updated_at: number;
    }>();
  if (!row) return null;
  const blocked = (update.meta?.changes ?? 0) === 0 || row.units_spent >= breaker;
  return {
    provider: normalized.provider,
    monthKey: key,
    requests: row.requests,
    unitsSpent: row.units_spent,
    monthlyLimit: row.monthly_limit,
    circuitBreakerRatio: row.breaker_ratio,
    coverage: blocked ? "stale" : usageCoverage(row.units_spent, normalized),
    blocked,
    updatedAt: row.updated_at,
  };
}

export async function readProviderUsage(
  policy: BudgetPolicy,
  timestamp = Date.now(),
): Promise<ProviderUsage | null> {
  const database = db();
  if (!database) return null;
  const normalized = normalizeBudgetPolicy(policy);
  const key = monthKey(timestamp);
  const row = await database
    .prepare(
      `SELECT requests, units_spent, monthly_limit, breaker_ratio, updated_at
       FROM provider_usage WHERE provider = ? AND month_key = ? LIMIT 1`,
    )
    .bind(normalized.provider, key)
    .first<{
      requests: number;
      units_spent: number;
      monthly_limit: number;
      breaker_ratio: number;
      updated_at: number;
    }>();
  if (!row) return null;
  const blocked = row.units_spent >= circuitBreakerLimit(normalized);
  return {
    provider: normalized.provider,
    monthKey: key,
    requests: row.requests,
    unitsSpent: row.units_spent,
    monthlyLimit: row.monthly_limit,
    circuitBreakerRatio: row.breaker_ratio,
    coverage: blocked ? "stale" : usageCoverage(row.units_spent, normalized),
    blocked,
    updatedAt: row.updated_at,
  };
}

export function hasUniverseStore() {
  return Boolean(db());
}
