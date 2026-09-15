import type { FieldSection, FocusedParticle } from "./types.ts";
import { heroSubjectLabel, looksLikeMint } from "./ux-simplify.ts";

export type TraderHolding = {
  mint: string;
  name: string | null;
  symbol: string | null;
  matchedRealizedSol: number | null;
  observedInventory: number | null;
  closedCount: number;
  closedMatchedCount: number;
  openCount: number;
  lastObservedAt: number | null;
  sourceKind: "observed";
  method: string;
};

export type CutSubject = {
  wallet: string;
  mint: string;
  name: string | null;
  symbol: string | null;
};

function metaWallet(focus: FocusedParticle | null): string {
  if (!focus || focus.cosmicKind !== "star") return "";
  const wallet = typeof focus.metadata?.wallet === "string" ? focus.metadata.wallet.trim() : "";
  const solana = typeof focus.metadata?.solanaWallet === "string" ? focus.metadata.solanaWallet.trim() : "";
  return wallet || solana;
}

/** Source-agnostic trader STAR wallet: focused star, then trader-system section. */
export function focusedTraderWallet(focus: FocusedParticle | null, fieldSection?: FieldSection | null): string {
  const fromFocus = metaWallet(focus);
  if (looksLikeMint(fromFocus)) return fromFocus;
  const fromSection = fieldSection?.kind === "trader-system" ? String(fieldSection.wallet ?? "").trim() : "";
  return looksLikeMint(fromSection) ? fromSection : "";
}

export function holdingTokenLabel(holding: Pick<TraderHolding, "name" | "symbol">): string {
  return heroSubjectLabel({ name: holding.name, symbol: holding.symbol }) || "Token name unavailable";
}

export function formatIndexedPnl(value: number | null | undefined): { text: string; known: boolean } {
  if (value == null || !Number.isFinite(value)) return { text: "PnL unavailable", known: false };
  return { text: `${value >= 0 ? "+" : ""}${value.toFixed(4)} SOL`, known: true };
}

export function holdingMintLabel(mint: string): string {
  const value = mint.trim();
  return value.length > 16 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function finiteOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function countOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/**
 * Overlay rows from the holdings API. Null/missing PnL is still a row — never treat it as "no holdings".
 */
export function holdingsOverlayRows(items: unknown): TraderHolding[] {
  if (!Array.isArray(items)) return [];
  const rows: TraderHolding[] = [];
  for (const raw of items) {
    const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    if (!row) continue;
    const mint = String(row.mint ?? "").trim();
    if (!looksLikeMint(mint)) continue;
    rows.push({
      mint,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : null,
      symbol: typeof row.symbol === "string" && row.symbol.trim() ? row.symbol.trim() : null,
      matchedRealizedSol: finiteOrNull(row.matchedRealizedSol),
      observedInventory: finiteOrNull(row.observedInventory),
      closedCount: countOrZero(row.closedCount),
      closedMatchedCount: countOrZero(row.closedMatchedCount),
      openCount: countOrZero(row.openCount),
      lastObservedAt: finiteOrNull(row.lastObservedAt),
      sourceKind: "observed",
      method: String(row.method ?? "").trim() || "bounded-fifo-observed-swaps-v1",
    });
  }
  return rows;
}

export function cutSubjectFromHolding(wallet: string, holding: Pick<TraderHolding, "mint" | "name" | "symbol">): CutSubject | null {
  const nextWallet = wallet.trim();
  const mint = holding.mint.trim();
  if (!looksLikeMint(nextWallet) || !looksLikeMint(mint)) return null;
  return { wallet: nextWallet, mint, name: holding.name, symbol: holding.symbol };
}
