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

export type TokenSystemHolder = {
  rank: number;
  wallet: string;
  chainKey: string;
  netTokenObserved: number;
  observedSharePct: number | null;
  tradeCount: number;
  buySolObserved: number | null;
  sellSolObserved: number | null;
  buyValueUsd: number | null;
  sellValueUsd: number | null;
  lastObservedAt: number;
  source: string;
  sourceKind: string;
};

export type TokenSystemTrade = {
  signature: string | null;
  wallet: string;
  chainKey: string;
  side: "buy" | "sell";
  solAmount: number | null;
  tokenAmount: number;
  priceSol: number | null;
  priceUsd: number | null;
  valueUsd: number | null;
  observedAt: number;
  source: string;
  sourceKind: string;
};

export type TokenSystemResponse = {
  ok: boolean;
  coverage: "fresh" | "empty" | "degraded";
  mint: string;
  chainKey?: string;
  holders: readonly TokenSystemHolder[];
  trades: readonly TokenSystemTrade[];
  observedAt?: number | null;
  method?: string;
  disclosure: string;
  error?: string;
};

export type TraderObservatoryItem = {
  rank: number;
  wallet: string;
  realizedSol: number;
  matchedSellCount: number;
  winRate: number | null;
  tradeCount: number;
  tokenCount: number;
  buySolObserved: number;
  sellSolObserved: number;
  lastObservedAt: number;
};

export type TraderObservatorySample = {
  inputSource: "pump_trades" | "bull_wallet_events";
  rowsRead: number;
  rowLimit: number;
  mayBeTruncated: boolean;
};

export type TraderObservatoryResponse = {
  ok: boolean;
  coverage: "fresh" | "partial" | "stale" | "empty" | "degraded";
  window?: { from: number; to: number; label: "7D" };
  method?: string;
  items: readonly TraderObservatoryItem[];
  source?: string;
  sample?: TraderObservatorySample | null;
  fomoReference?: {
    provider: "fomo.family";
    timeframe: "7D";
    status: "reference-only";
    ingested: false;
  };
  disclosure: string;
  cache?: string;
  error?: string;
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