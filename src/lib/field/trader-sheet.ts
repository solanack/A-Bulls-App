import type { FieldRoom } from "./galaxies.ts";
import { evidenceVerifyHref, finitePnl, formatCompactUsd, formatSolPnl, PNL_CAVEAT, PNL_FOMO_LABEL, PNL_MISSING, PNL_REALIZED_LABEL, roundsMatchedLine } from "./honest-pnl.ts";
import type { FieldParticle, JsonValue } from "./types.ts";

export type TraderPrint = { side: string; at: number; mint: string; symbol: string | null; signature: string | null };

/** Shared STAR sheet contract. Both floors fill the same shape; missing facts stay null. */
export type TraderSheetDetail = {
  room: FieldRoom;
  wallet: string | null;
  handle: string | null;
  identity: string;
  identitySource: string;
  rank: number | null;
  rankBasis: string;
  factLine: string;
  printCount: number | null;
  planetCount: number;
  cometCount: number;
  latestPrint: TraderPrint | null;
  windowLabel: string | null;
  sourceLabel: string;
  /** One source only. A second unit is never added into this text. */
  pnlText: string | null;
  pnlSourceLabel: string | null;
  pnlCoverage: string | null;
  pnlVerifyHref: string | null;
  pnlCaveat: string;
  capturedAt: number | null;
};

type Row = Record<string, JsonValue>;
const rows = (value: JsonValue | undefined): Row[] => (Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row)) : []);
const str = (value: JsonValue | undefined) => (typeof value === "string" && value.trim() ? value.trim() : null);
const count = (value: JsonValue | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : null);

export function callsign(wallet: string) {
  return wallet.length >= 8 ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : wallet;
}

export function compactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(value));
}

export function printsLabel(value: number) {
  return `${compactCount(value)} ${value === 1 ? "print" : "prints"}`;
}

function marketSymbol(row: Row) {
  return str(row.symbol) ?? str(row.cashSymbol);
}

/** USD and SOL stay separate. The sky label shows one unit, or an em dash when that unit is missing. */
export function afterbellPnlText(metadata: Record<string, JsonValue> | undefined): string {
  const unit = metadata?.pnlDisplayUnit;
  if (unit === "usd") return formatCompactUsd(finitePnl(metadata?.realizedPnlUsd)).text;
  if (unit === "sol") return formatSolPnl(finitePnl(metadata?.realizedPnlSol)).text;
  const usd = finitePnl(metadata?.realizedPnlUsd);
  const sol = finitePnl(metadata?.realizedPnlSol);
  if (usd != null) return formatCompactUsd(usd).text;
  if (sol != null) return formatSolPnl(sol).text;
  return PNL_MISSING;
}

export function afterbellPnlCoverage(metadata: Record<string, JsonValue> | undefined): string | null {
  const matched = count(metadata?.pnlMatchedRounds);
  const total = count(metadata?.pnlRoundCount);
  if (matched == null || total == null) return null;
  return roundsMatchedLine(matched, total);
}

/** One fact per Afterbell STAR. The signed figure and the realized source travel with the disclaimer. */
export function afterbellFactLine(metadata: Record<string, JsonValue> | undefined) {
  const figure = afterbellPnlText(metadata);
  const lead = `Not financial advice · Realized ${figure}`;
  const held = rows(metadata?.holdings).find((row) => Number(row.observedNetAmount) > 0 && marketSymbol(row));
  if (held) return `${lead} · Holds ${marketSymbol(held)}`;
  const traded = rows(metadata?.mostTraded)[0];
  const unique = count(metadata?.uniqueAfterCloseTxCount) ?? count(metadata?.transactionCount) ?? 0;
  const tradedSymbol = traded ? marketSymbol(traded) : null;
  if (tradedSymbol) return `${lead} · ${tradedSymbol} · ${printsLabel(count(traded?.uniqueAfterCloseTxCount) ?? unique)}`;
  if (unique > 0) return `${lead} · ${printsLabel(unique)}`;
  return `${lead} · Coverage thin`;
}

/** One fact per FOMO STAR in the room view. Provider counts are labeled as Fomo-reported. */
export function fomoRoomFactLine(metadata: Record<string, JsonValue> | undefined) {
  const trades = count(metadata?.reportedTradeCount);
  return trades && trades > 0 ? `${compactCount(trades)} trades · Fomo-reported` : "Coverage thin";
}

export function fomoSystemFactLine(positions: readonly { symbol: string | null; tradeCount: number | null; sourceKind: string }[]) {
  const traded = positions.find((row) => row.symbol && (row.tradeCount ?? 0) > 0);
  if (traded?.symbol) return `${traded.symbol} · ${printsLabel(traded.tradeCount ?? 0)}`;
  const held = positions.find((row) => row.symbol);
  if (held?.symbol) return `Holds ${held.symbol}`;
  return "Coverage thin";
}

export function afterbellLatestPrint(metadata: Record<string, JsonValue> | undefined): TraderPrint | null {
  const symbols = new Map<string, string>();
  for (const row of [...rows(metadata?.tradedAssets), ...rows(metadata?.mostTraded), ...rows(metadata?.holdings)]) {
    const mint = str(row.mint), symbol = marketSymbol(row);
    if (mint && symbol && !symbols.has(mint)) symbols.set(mint, symbol);
  }
  const latest = rows(metadata?.latestTrades)
    .filter((row) => str(row.mint) && Number.isFinite(Number(row.blockTime)))
    .sort((a, b) => Number(b.blockTime) - Number(a.blockTime))[0];
  if (!latest) return null;
  const mint = str(latest.mint) as string;
  return { side: str(latest.side) ?? "print", at: Number(latest.blockTime) * 1000, mint, symbol: symbols.get(mint) ?? null, signature: str(latest.txId) };
}

export function afterbellTraderDetail(star: FieldParticle, planetCount: number, cometCount: number): TraderSheetDetail {
  const metadata = star.metadata;
  const wallet = str(metadata?.wallet);
  const identity = str(metadata?.displayName) ?? str(metadata?.name) ?? (wallet ? callsign(wallet) : "Public wallet");
  const unique = count(metadata?.uniqueAfterCloseTxCount) ?? count(metadata?.transactionCount);
  return {
    room: "afterbell",
    wallet,
    handle: null,
    identity,
    identitySource: str(metadata?.displayNameSource) ?? "wallet-callsign",
    rank: count(metadata?.afterbellRank),
    rankBasis: "Rank is unique prints, not performance.",
    factLine: afterbellFactLine(metadata),
    printCount: unique,
    planetCount,
    cometCount,
    latestPrint: afterbellLatestPrint(metadata),
    windowLabel: str(metadata?.windowLabel),
    sourceLabel: "Afterbell-observed",
    pnlText: afterbellPnlText(metadata),
    pnlSourceLabel: PNL_REALIZED_LABEL,
    pnlCoverage: afterbellPnlCoverage(metadata),
    pnlVerifyHref: evidenceVerifyHref({
      wallet,
      mint: str(rows(metadata?.holdings)[0]?.mint) ?? str(rows(metadata?.mostTraded)[0]?.mint) ?? str(rows(metadata?.mints)[0]),
      chain: "solana",
    }),
    pnlCaveat: PNL_CAVEAT,
    capturedAt: null,
  };
}

export function fomoTraderDetail(input: {
  wallet: string | null;
  solanaWallet?: string | null;
  evmWallet?: string | null;
  handle: string;
  displayName: string | null;
  rank: number | null;
  reportedPnlUsd?: number | null;
  positions: readonly { mint: string; symbol: string | null; tradeCount: number | null; sourceKind: string; chain?: string | null }[];
  latestTrades: readonly { side: string; observedAt: number; mint: string; signature: string | null }[];
  capturedAt?: number | null;
}): TraderSheetDetail {
  const symbols = new Map(input.positions.filter((row) => row.symbol).map((row) => [row.mint.toLowerCase(), row.symbol as string] as const));
  const latest = [...input.latestTrades].sort((a, b) => b.observedAt - a.observedAt)[0];
  const observedPrints = input.positions.reduce((sum, row) => sum + Math.max(0, row.tradeCount ?? 0), 0);
  const position = input.positions[0];
  const chain = String(position?.chain ?? "").trim() || null;
  const evmChain = Boolean(chain && chain !== "solana");
  const verifyWallet = evmChain ? input.evmWallet || input.wallet : chain === "solana" ? input.solanaWallet || input.wallet : input.wallet;
  return {
    room: "fomo",
    wallet: input.wallet,
    handle: input.handle,
    identity: input.displayName?.trim() || input.handle || (input.wallet ? callsign(input.wallet) : "Fomo trader"),
    identitySource: input.displayName?.trim() ? "fomo-handle" : "wallet-callsign",
    rank: input.rank,
    rankBasis: "Rank and figures are Fomo-reported.",
    factLine: fomoSystemFactLine(input.positions),
    printCount: observedPrints > 0 ? observedPrints : null,
    planetCount: Math.min(10, input.positions.length),
    cometCount: Math.min(3, input.latestTrades.length),
    latestPrint: latest ? { side: latest.side, at: latest.observedAt, mint: latest.mint, symbol: symbols.get(latest.mint.toLowerCase()) ?? null, signature: latest.signature } : null,
    windowLabel: "All-time, provider-reported",
    sourceLabel: PNL_FOMO_LABEL,
    pnlText: formatCompactUsd(finitePnl(input.reportedPnlUsd)).text,
    pnlSourceLabel: PNL_FOMO_LABEL,
    pnlCoverage: null,
    pnlVerifyHref: evidenceVerifyHref({ wallet: verifyWallet, mint: position?.mint ?? null, chain }),
    pnlCaveat: PNL_CAVEAT,
    capturedAt: typeof input.capturedAt === "number" && Number.isFinite(input.capturedAt) ? input.capturedAt : null,
  };
}
