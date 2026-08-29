import type { Coverage, GalaxyId, UniverseSnapshot } from "@/lib/field/types";

export type ProviderName = "intelligence-worker" | "helius" | "market-data";

export type BudgetPolicy = {
  provider: ProviderName;
  monthlyLimit: number;
  circuitBreakerRatio: number;
};

export type ProviderUsage = {
  provider: ProviderName;
  monthKey: string;
  requests: number;
  unitsSpent: number;
  monthlyLimit: number;
  circuitBreakerRatio: number;
  coverage: Coverage;
  blocked: boolean;
  updatedAt: number;
};

export type SnapshotRecord = {
  galaxyId: GalaxyId;
  snapshot: UniverseSnapshot;
  coverage: Coverage;
  generatedAt: number;
  sourceVersion: string;
};

export type QueryCacheRecord<T> = {
  key: string;
  value: T;
  coverage: Coverage;
  observedAt: number;
  expiresAt: number;
  stale: boolean;
};

export type UniverseDataStatus = {
  store: "d1" | "memory-fallback";
  coverage: Coverage;
  circuitBreaker: ProviderUsage | null;
  disclosure: string;
};
