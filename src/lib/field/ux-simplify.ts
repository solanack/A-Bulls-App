import { ADVANCED_MODES, ANALYSIS_MODES, MODE_HINT, TOOL_TITLE, type FieldMode } from "./types.ts";

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

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

/** Replay / Cut / What-If need a chosen wallet×asset trade. Evidence can use a focused receipt. Compare needs one trader. */
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
  const text=String(value ?? "").trim();
  return BASE58_ADDRESS.test(text)||EVM_ADDRESS.test(text);
}

export type SubjectSearchPrefill = {
  wallet: string;
  mint: string;
  chain: string;
  mode: "explore" | "replay";
};

/**
 * Paste-proof holdings/Replay deep-link: `?wallet=` (alias `w`) plus optional `mint`/`m` and `chain`.
 * Wallet+mint including `mode=trickster` lands in Field explore with holdings first.
 * `mode=replay` still opens Replay. `/?cut=` VERIFY is handled separately and must win.
 */
export function subjectPrefillFromSearch(search: string): SubjectSearchPrefill | null {
  const raw = String(search ?? "");
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const wallet = String(params.get("wallet") || params.get("w") || "").trim();
  if (!looksLikeMint(wallet)) return null;
  const mintRaw = String(params.get("mint") || params.get("m") || "").trim();
  const mint = looksLikeMint(mintRaw) ? mintRaw : "";
  const inferred=EVM_ADDRESS.test(wallet)?"ethereum":"solana";
  const chain=String(params.get("chain")||params.get("network")||inferred).trim().toLowerCase()||inferred;
  const requested = String(params.get("mode") || "").trim().toLowerCase();
  return { wallet, mint, chain, mode: requested === "replay" ? "replay" : "explore" };
}

/** Workspace mode from the URL. Cut VERIFY is the only inbound jump straight to Trickster. */
export function inboundWorkspaceMode(search: string, shareId = ""): "trickster" | "replay" | "explore" {
  if (String(shareId || "").trim()) return "trickster";
  const prefill = subjectPrefillFromSearch(search);
  if (prefill?.mode === "replay") return "replay";
  return "explore";
}

/** Hero shows name/symbol only — never a full asset address. */
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
