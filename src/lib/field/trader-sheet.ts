import type { FieldRoom } from "./galaxies.ts";
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

/** One fact per Afterbell STAR: holdings first, then the most-traded xStock by unique after-close prints. */
export function afterbellFactLine(metadata: Record<string, JsonValue> | undefined) {
  const held = rows(metadata?.holdings).find((row) => Number(row.observedNetAmount) > 0 && marketSymbol(row));
  if (held) return `Holds ${marketSymbol(held)}`;
  const traded = rows(metadata?.mostTraded)[0];
  const unique = count(metadata?.uniqueAfterCloseTxCount) ?? count(metadata?.transactionCount) ?? 0;
  const tradedSymbol = traded ? marketSymbol(traded) : null;
  if (tradedSymbol) return `${tradedSymbol} · ${printsLabel(count(traded?.uniqueAfterCloseTxCount) ?? unique)}`;
  if (unique > 0) return printsLabel(unique);
  return "Coverage thin";
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
  };
}

export function fomoTraderDetail(input: {
  wallet: string | null;
  handle: string;
  displayName: string | null;
  rank: number | null;
  positions: readonly { mint: string; symbol: string | null; tradeCount: number | null; sourceKind: string }[];
  latestTrades: readonly { side: string; observedAt: number; mint: string; signature: string | null }[];
}): TraderSheetDetail {
  const symbols = new Map(input.positions.filter((row) => row.symbol).map((row) => [row.mint.toLowerCase(), row.symbol as string] as const));
  const latest = [...input.latestTrades].sort((a, b) => b.observedAt - a.observedAt)[0];
  const observedPrints = input.positions.reduce((sum, row) => sum + Math.max(0, row.tradeCount ?? 0), 0);
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
    windowLabel: null,
    sourceLabel: "Fomo-reported",
  };
}
