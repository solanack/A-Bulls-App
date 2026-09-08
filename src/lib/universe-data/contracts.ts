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

export type ThesisCitationKind = "tx" | "candle" | "holder_snapshot" | "replay_event";

export type ThesisCitation = {
  id?: string;
  kind: ThesisCitationKind;
  ref: string;
  observedTs: number;
  label: string;
};

export type ThesisEvidenceQuality = "observed" | "partial" | "unavailable";

export type ThesisResolution = {
  id: string;
  window: "24h";
  atPublishMarketCap: number | null;
  atResolveMarketCap: number | null;
  atPublishLiquidity: number | null;
  atResolveLiquidity: number | null;
  atPublishTopHolderPct: number | null;
  atResolveTopHolderPct: number | null;
  evidenceQuality: ThesisEvidenceQuality;
  resolvedAt: number | null;
};
