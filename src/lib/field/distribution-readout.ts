import type { DataCompletenessState, TradeDistribution } from "@/lib/universe-data/contracts";
import { formatCompactUsd, formatSolPnl, PNL_MISSING } from "./honest-pnl.ts";

export function completenessLabel(state: DataCompletenessState | string | null | undefined): string {
  if (state === "complete") return "COMPLETE";
  if (state === "partial") return "PARTIAL";
  if (state === "insufficient") return "INSUFFICIENT";
  return "UNKNOWN";
}

export function formatShare(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return PNL_MISSING;
  return `${Math.round(value * 100)}%`;
}

function figure(value: number | null | undefined, unit: "usd" | "sol"): string {
  return unit === "usd" ? formatCompactUsd(value).text : formatSolPnl(value).text;
}

/** Visible line beside a ranked wallet or closed-trade row. Missing fees stay an em dash. */
export function formatDistributionLine(input: {
  sampleSize?: number | null;
  medianTradePnl?: number | null;
  profitConcentrationTop1?: number | null;
  profitConcentrationTop3?: number | null;
  netOfFeesPnl?: number | null;
  completenessState?: DataCompletenessState | string | null;
  unit: "usd" | "sol";
}): string {
  const sample = input.sampleSize == null || !Number.isFinite(input.sampleSize) ? PNL_MISSING : String(Math.trunc(input.sampleSize));
  return `sample ${sample} · median ${figure(input.medianTradePnl, input.unit)} · top 1–3 ${formatShare(input.profitConcentrationTop1)}/${formatShare(input.profitConcentrationTop3)} · net ${figure(input.netOfFeesPnl, input.unit)} · ${completenessLabel(input.completenessState)}`;
}

export function formatDistribution(distribution: TradeDistribution | null | undefined, state?: DataCompletenessState | string | null): string | null {
  if (!distribution) return null;
  return formatDistributionLine({
    sampleSize: distribution.sampleSize,
    medianTradePnl: distribution.medianTradePnl,
    profitConcentrationTop1: distribution.profitConcentrationTop1,
    profitConcentrationTop3: distribution.profitConcentrationTop3,
    netOfFeesPnl: distribution.netOfFeesPnl,
    completenessState: state,
    unit: distribution.unit === "sol" ? "sol" : "usd",
  });
}
