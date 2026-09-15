import { ADVANCED_MODES, ANALYSIS_MODES, MODE_HINT, TOOL_TITLE, type FieldMode } from "./types.ts";

const BASE58_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type TradePrefill = {
  wallet: string;
  mint: string;
  walletB?: string;
  hasEvidence?: boolean;
};

export function isPrimaryDemoMode(mode: FieldMode): boolean {
  return ANALYSIS_MODES.some((item) => item.id === mode);
}

export function isAdvancedAnalysisMode(mode: FieldMode): boolean {
  return ADVANCED_MODES.some((item) => item.id === mode);
}

/** Replay / Cut / What-If need a chosen wallet×mint trade. Evidence can use a focused receipt. Compare needs one trader. */
export function needsSelectedTrade(mode: FieldMode): boolean {
  return mode === "trickster" || mode === "replay" || mode === "evidence" || mode === "what-if" || mode === "compare";
}

export function selectedTradeReady(mode: FieldMode, ctx: TradePrefill): boolean {
  const wallet = ctx.wallet.trim();
  const mint = ctx.mint.trim();
  if (mode === "compare") return Boolean(wallet);
  if (mode === "evidence") return Boolean(ctx.hasEvidence || mint);
  if (mode === "trickster" || mode === "replay" || mode === "what-if") return Boolean(wallet && mint);
  return true;
}

/** A `?verify=` / `?tour=` Cut deep link may open Make a Cut without a selected trade. */
export function inboundCutShareOpen(mode: FieldMode, shareId: string): boolean {
  return mode === "trickster" && Boolean(shareId.trim());
}

export function looksLikeMint(value: string | null | undefined): boolean {
  return BASE58_MINT.test(String(value ?? "").trim());
}

/** Hero shows name/symbol only — never a full mint address. */
export function heroSubjectLabel(input: { name?: string | null; symbol?: string | null }): string {
  const name = String(input.name ?? "").trim();
  const symbol = String(input.symbol ?? "").trim();
  const safeName = name && !looksLikeMint(name) ? name : "";
  const safeSymbol = symbol && !looksLikeMint(symbol) ? symbol : "";
  if (safeName && safeSymbol && safeName !== safeSymbol) return `${safeName} · ${safeSymbol}`;
  return safeName || safeSymbol;
}

export function toolTitle(mode: FieldMode): string {
  return TOOL_TITLE[mode] ?? MODE_HINT[mode];
}

export function toolHint(mode: FieldMode): string {
  return MODE_HINT[mode];
}

export function primaryMenuIds(): FieldMode[] {
  return ANALYSIS_MODES.map((item) => item.id);
}
