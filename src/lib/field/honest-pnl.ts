import { looksLikeMint } from "./ux-simplify.ts";

/** Matched closed rounds with retained acquisition basis. Never a provider figure or a counterfactual. */
export const PNL_REALIZED_LABEL = "Realized · A Bulls observed (FIFO)";
/** Provider-reported context. Never A Bulls App chain proof. */
export const PNL_FOMO_LABEL = "Fomo-reported";
/** What-If and unrealized mark-to-market. Never added into a realized total. */
export const PNL_HYPOTHETICAL_LABEL = "Hypothetical";
export const PNL_CAVEAT = "historical, not a promise, not advice";
export const PNL_MISSING = "—";

export type PnlSource = "realized" | "fomo" | "hypothetical";

export function pnlSourceLabel(source: PnlSource): string {
  if (source === "realized") return PNL_REALIZED_LABEL;
  if (source === "fomo") return PNL_FOMO_LABEL;
  return PNL_HYPOTHETICAL_LABEL;
}

/** Missing, blank, and non-finite values stay missing. A real zero is kept. */
export function finitePnl(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function roundsMatchedLine(matched: number, total: number): string {
  const x = Number.isFinite(matched) && matched > 0 ? Math.trunc(matched) : 0;
  const y = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0;
  return `${x} of ${y} rounds matched`;
}

export function formatSolPnl(value: number | null | undefined): { text: string; known: boolean } {
  if (value == null || !Number.isFinite(value)) return { text: PNL_MISSING, known: false };
  return { text: `${value >= 0 ? "+" : ""}${value.toFixed(4)} SOL`, known: true };
}

/** Compact provider or observed USD. Missing is an em dash, never 0 and never "N/A". */
export function formatCompactUsd(value: number | null | undefined): { text: string; known: boolean } {
  if (value == null || !Number.isFinite(value)) return { text: PNL_MISSING, known: false };
  const sign = value >= 0 ? "+" : "-";
  const amount = Math.abs(value);
  if (amount === 0) return { text: "+$0", known: true };
  if (amount >= 1_000_000_000) return { text: `${sign}$${(amount / 1_000_000_000).toFixed(amount >= 10_000_000_000 ? 0 : 1)}B`, known: true };
  if (amount >= 1_000_000) return { text: `${sign}$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`, known: true };
  if (amount >= 1_000) return { text: `${sign}$${(amount / 1_000).toFixed(amount >= 100_000 ? 0 : 1)}K`, known: true };
  return { text: `${sign}$${amount.toFixed(amount >= 100 ? 0 : 2)}`, known: true };
}

/**
 * Quote-unit counterfactual. An empty comparable set stays missing even when a reducer returned 0.
 * This figure is never a realized total.
 */
export function hypotheticalQuote(value: unknown, comparableCount: number): number | null {
  if (!Number.isFinite(comparableCount) || comparableCount <= 0) return null;
  return finitePnl(value);
}

/** Replay deep-link when wallet and mint are known; wallet-only falls back to the holdings Field. */
export function evidenceVerifyHref(input: { origin?: string; wallet?: string | null; mint?: string | null; chain?: string | null }): string | null {
  const wallet = String(input.wallet ?? "").trim();
  if (!looksLikeMint(wallet)) return null;
  const origin = String(input.origin ?? "").replace(/\/$/, "");
  const mint = String(input.mint ?? "").trim();
  const params = new URLSearchParams();
  params.set("wallet", wallet);
  if (looksLikeMint(mint)) {
    params.set("mode", "replay");
    params.set("mint", mint);
    const chain = String(input.chain ?? "").trim();
    if (chain) params.set("chain", chain);
  }
  return `${origin}/?${params.toString()}`;
}
