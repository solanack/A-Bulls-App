import type { FieldSection, FocusedParticle } from "./types.ts";
import { heroSubjectLabel, looksLikeMint } from "./ux-simplify.ts";
import { particleMint } from "./volume-sky.ts";

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

export function isWalletStar(focus: FocusedParticle | null | undefined): focus is FocusedParticle {
  if (!focus) return false;
  if (focus.cosmicKind === "star") return true;
  return focus.kind === "wallet" || focus.kind === "holder-exit";
}

function metaWallet(focus: FocusedParticle | null): string {
  if (!isWalletStar(focus)) return "";
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

/**
 * Holdings overlay wallet: focused STAR first, then inbound `?wallet=` when not on VERIFY.
 * Token-system holder sky has no section wallet — a focused holder STAR must supply it.
 */
export function holdingsWalletFromContext(input: {
  focus: FocusedParticle | null;
  fieldSection?: FieldSection | null;
  inboundWallet?: string | null;
  verifyingCut?: boolean;
}): string {
  const focused = focusedTraderWallet(input.focus, input.fieldSection);
  if (focused) return focused;
  if (input.verifyingCut) return "";
  const inbound = String(input.inboundWallet ?? "").trim();
  return looksLikeMint(inbound) ? inbound : "";
}

/** Highlight the inbound or parent-planet mint on a holdings row. Never invent a mint. */
export function holdingsHighlightMint(input: {
  focus: FocusedParticle | null;
  fieldSection?: FieldSection | null;
  inboundMint?: string | null;
}): string {
  const parent = typeof input.focus?.metadata?.parentMint === "string" ? input.focus.metadata.parentMint.trim() : "";
  if (isWalletStar(input.focus) && looksLikeMint(parent)) return parent;
  if (isWalletStar(input.focus) && input.fieldSection?.kind === "token-system" && looksLikeMint(input.fieldSection.mint)) {
    return input.fieldSection.mint;
  }
  const inbound = String(input.inboundMint ?? "").trim();
  if (looksLikeMint(inbound)) return inbound;
  const focusedMint = particleMint(input.focus);
  return focusedMint && looksLikeMint(focusedMint) && !isWalletStar(input.focus) ? focusedMint : "";
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
