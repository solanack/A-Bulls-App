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

export function looksLikeMint(value: string | null | undefined): boolean {
  return BASE58_MINT.test(String(value ?? "").trim());
}

export type SubjectSearchPrefill = {
  wallet: string;
  mint: string;
  mode: "trickster" | "replay";
};

/** Paste-proof Cut/Replay deep-link: `?wallet=&mint=` (aliases `w`/`m`) plus optional `mode=trickster|replay`. */
export function subjectPrefillFromSearch(search: string): SubjectSearchPrefill | null {
  const raw = String(search ?? "");
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const wallet = String(params.get("wallet") || params.get("w") || "").trim();
  const mint = String(params.get("mint") || params.get("m") || "").trim();
  if (!looksLikeMint(wallet) || !looksLikeMint(mint)) return null;
  const requested = String(params.get("mode") || "").trim().toLowerCase();
  return { wallet, mint, mode: requested === "replay" ? "replay" : "trickster" };
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
