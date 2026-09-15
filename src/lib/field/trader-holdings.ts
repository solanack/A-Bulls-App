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

export function cutSubjectFromHolding(wallet: string, holding: Pick<TraderHolding, "mint" | "name" | "symbol">): CutSubject | null {
  const nextWallet = wallet.trim();
  const mint = holding.mint.trim();
  if (!looksLikeMint(nextWallet) || !looksLikeMint(mint)) return null;
  return { wallet: nextWallet, mint, name: holding.name, symbol: holding.symbol };
}
