import type { FieldParticle, UniverseSnapshot } from "./types";
import type { TraderObservatoryResponse } from "@/lib/universe-data/contracts";
import { canonicalUniverseId } from "./galaxies.ts";
import { formatDistributionLine } from "./distribution-readout.ts";

function clamp01(value: number) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function positionForRank(rank: number): [number, number, number] {
  if (rank === 1) return [0, 34, 0];
  const ring = rank <= 8 ? 24 : rank <= 24 ? 42 : 61, count = rank <= 8 ? 7 : rank <= 24 ? 16 : 26, start = rank <= 8 ? 2 : rank <= 24 ? 9 : 25;
  const angle = ((rank - start) / count) * Math.PI * 2 - Math.PI / 2, y = 10 + (rank <= 8 ? 17 : rank <= 24 ? 8 : 0) + Math.sin(angle * 2) * 5;
  return [Math.cos(angle) * ring, y, Math.sin(angle) * ring];
}

export function buildTraderObservatorySnapshot(data: TraderObservatoryResponse): UniverseSnapshot {
  const now = data.window?.to ?? Date.now();
  const particles: FieldParticle[] = data.items.slice(0, 50).map(item => ({
    id: canonicalUniverseId("star", item.wallet, "solana-core"),
    kind: "wallet",
    cosmicKind: "star",
    originGalaxyId: "solana-core",
    verificationState: "derived",
    observedAt: item.lastObservedAt,
    category: "swap",
    magnitudeBand: clamp01(1 - (item.rank - 1) / 58),
    position: positionForRank(item.rank),
    source: data.source ?? "a-bulls-indexed-solana",
    metadata: {
      name: `TRADER #${item.rank}`,
      factLine: formatDistributionLine({
        sampleSize: item.sampleSize ?? item.matchedSellCount,
        medianTradePnl: item.medianTradePnlSol,
        profitConcentrationTop1: item.profitConcentrationTop1,
        profitConcentrationTop3: item.profitConcentrationTop3,
        netOfFeesPnl: item.netOfFeesSol,
        completenessState: item.completeness?.state,
        unit: "sol",
      }),
      wallet: item.wallet,
      observatory: true,
      observatoryRank: item.rank,
      observatoryWindow: "7D",
      realizedSolMatched: item.realizedSol,
      netOfFeesSol: item.netOfFeesSol ?? null,
      feeTreatment: item.feeTreatment ?? null,
      matchedSellCount: item.matchedSellCount,
      sampleSize: item.sampleSize ?? item.matchedSellCount,
      medianTradePnlSol: item.medianTradePnlSol ?? null,
      profitConcentrationTop1: item.profitConcentrationTop1 ?? null,
      profitConcentrationTop3: item.profitConcentrationTop3 ?? null,
      winRate: item.winRate,
      tradeCount: item.tradeCount,
      tokenCount: item.tokenCount,
      buySolObserved: item.buySolObserved,
      sellSolObserved: item.sellSolObserved,
      lastObservedAt: item.lastObservedAt,
      completenessState: item.completeness?.state ?? null,
      rankingMethod: data.method ?? "matched-in-window-fifo-realized-sol-v2",
      rankingKey: data.ranking?.key ?? "matched-realized-sol",
      skyRole: "live",
      systemRole: "weekly-trader-star",
    },
  }));
  return {
    galaxyId: "solana-core",
    windowStart: data.window?.from ?? now - 7 * 86400_000,
    windowEnd: now,
    observedEventCount: particles.length,
    samplingPolicy: "weekly trader observatory · cached D1 matched in-window realized SOL · minimum 5 matched sells across 2 tokens · maximum 50",
    coverageStatement: data.disclosure,
    sources: [data.source ?? "a-bulls-indexed-solana"],
    particles,
  };
}
