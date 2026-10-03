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
  const y = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0;
  if (y <= 0) return PNL_MISSING;
  const x = Number.isFinite(matched) && matched > 0 ? Math.min(y, Math.trunc(matched)) : 0;
  return `${x} of ${y} rounds matched`;
}

/** A count that was not sent stays unknown. A real zero is kept. */
export function finiteCount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

/**
 * What-If coverage when the Worker has not shipped `positionCount` yet.
 * Absent fields fall back to the arrays already on the response.
 */
export function simulationRoundCounts(input: {
  positionCount?: unknown;
  comparablePositions?: unknown;
  positionLength?: number;
  outcomeLength?: number;
}): { total: number; comparable: number } {
  const positions = finiteCount(input.positionLength) ?? 0;
  const outcomes = finiteCount(input.outcomeLength) ?? 0;
  return {
    total: finiteCount(input.positionCount) ?? (positions || outcomes),
    comparable: finiteCount(input.comparablePositions) ?? outcomes,
  };
}

const USD_QUOTE_MINTS = new Set([
  "epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v",
  "es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb",
]);

/**
 * What-If unit. An explicit Worker `pnlDisplayUnit` wins. Older Workers omit it;
 * the quote mint decides, and a missing quote stays SOL because that is the product default.
 */
export function hypotheticalDisplayUnit(input: { pnlDisplayUnit?: unknown; quoteMint?: unknown }): "usd" | "sol" {
  if (input.pnlDisplayUnit === "usd" || input.pnlDisplayUnit === "sol") return input.pnlDisplayUnit;
  const quote = String(input.quoteMint ?? "").trim().toLowerCase();
  if (quote === "usd" || quote === "usdc" || quote === "usdt" || USD_QUOTE_MINTS.has(quote)) return "usd";
  return "sol";
}

export function formatHypothetical(value: number | null, unit: "usd" | "sol"): string {
  if (value == null || !Number.isFinite(value)) return PNL_MISSING;
  return unit === "usd" ? formatCompactUsd(value).text : formatSolPnl(value).text;
}

/**
 * Sky facts stay readable when they exceed the sprite budget.
 * A trailing source or holding stays intact instead of being sliced mid-word.
 */
export function skyFactText(value: unknown, max = 64): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (text.length <= max) return text;
  const held = text.match(/ · Holds \S+$/);
  const tails = [" · All-time, provider-reported · Fomo-reported", " · Fomo-reported", " · Coverage thin"];
  const tail = tails.find((item) => text.endsWith(item)) ?? held?.[0] ?? "";
  if (tail && tail.length + 2 < max) {
    const room = max - tail.length - 1;
    return `${text.slice(0, room).trimEnd()}…${tail}`;
  }
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
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
  if (amount < 0.01) {
    const digits = Math.min(6, Math.max(2, Math.ceil(-Math.log10(amount)) + 1));
    const precise = amount.toFixed(digits).replace(/0+$/, "");
    if (Number(precise) === 0) return { text: `${sign}<$0.000001`, known: true };
    return { text: `${sign}$${precise}`, known: true };
  }
  const tiers = [
    { min: 1_000_000_000, div: 1_000_000_000, suffix: "B" },
    { min: 1_000_000, div: 1_000_000, suffix: "M" },
    { min: 1_000, div: 1_000, suffix: "K" },
  ];
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (amount < tier.min) continue;
    const digits = amount >= tier.min * 10 ? 0 : 1;
    const rounded = Number((amount / tier.div).toFixed(digits));
    if (rounded >= 1000 && i > 0) {
      const up = tiers[i - 1];
      const upDigits = amount >= up.min * 10 ? 0 : 1;
      return { text: `${sign}$${(amount / up.div).toFixed(upDigits)}${up.suffix}`, known: true };
    }
    return { text: `${sign}$${rounded.toFixed(digits)}${tier.suffix}`, known: true };
  }
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
