import type { Coverage } from "@/lib/field/types";

export type ProviderName = "intelligence-worker" | "helius" | "market-data";

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

export type UniverseDataStatus = {
  store: "d1" | "memory-fallback";
  coverage: Coverage;
  circuitBreaker: ProviderUsage | null;
  disclosure: string;
};
