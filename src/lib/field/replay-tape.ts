import type { ResearchThreadContext } from "../research-thread.ts";

export const WSOL_MINT = "So11111111111111111111111111111111111111112";
const EVM = /^0x[0-9a-fA-F]{40}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type ReplaySubject = {
  wallet: string;
  mint: string;
  chainKey: string;
  fromTs: number | null;
  toTs: number | null;
  room: "fomo" | "afterbell" | null;
  displayName: string | null;
  symbol: string | null;
  cursor: number | null;
};

export type TapeCandle = { time: number; timestamp: number; open: number; high: number; low: number; close: number };
export type TapeEvent = {
  id: string;
  side: "buy" | "sell";
  timestamp: number;
  signature: string | null;
  amount: number | null;
  priceUsd: number | null;
  verification: string;
  sources: string[];
  kind: string;
};
export type TapeBolt = TapeEvent & { candleTime: number | null; anchorPrice: number | null; cursor: number };

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === "object" && !Array.isArray(row)) : []);
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
const finite = (value: unknown) => {
  const n = Number(value);
  return value != null && value !== "" && Number.isFinite(n) ? n : null;
};

/** Seconds or milliseconds in, milliseconds out. */
export function toMs(value: unknown): number | null {
  const n = finite(value);
  if (n == null || n <= 0) return null;
  return n < 10_000_000_000 ? Math.round(n * 1000) : Math.round(n);
}

export function isPublicAddress(value: string) {
  return EVM.test(value) || BASE58.test(value);
}

/** URL parameters win over the stored thread so a shared link reopens exactly what was shared. */
export function replaySubjectFrom(search: string, thread: Partial<ResearchThreadContext>): ReplaySubject | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const urlWallet = str(params.get("wallet") ?? params.get("w"));
  const urlMint = str(params.get("mint") ?? params.get("m"));
  const fromUrl = Boolean(urlWallet && urlMint && isPublicAddress(urlWallet) && isPublicAddress(urlMint));
  const wallet = fromUrl ? (urlWallet as string) : str(thread.wallet);
  const mint = fromUrl ? (urlMint as string) : str(thread.mint);
  if (!wallet || !mint) return null;
  const sameThread = thread.wallet === wallet && thread.mint === mint;
  const chainKey = (fromUrl ? str(params.get("chain")) : null) ?? (sameThread ? str(thread.chainKey) : null) ?? (EVM.test(wallet) ? "ethereum" : "solana");
  const roomRaw = str(params.get("room")) ?? (sameThread ? str(thread.galaxyId) : null);
  const cursorRaw = finite(params.get("t"));
  return {
    wallet,
    mint,
    chainKey: chainKey.toLowerCase(),
    fromTs: (fromUrl ? toMs(params.get("from")) : null) ?? (sameThread ? toMs(thread.fromTs) : null),
    toTs: (fromUrl ? toMs(params.get("to")) : null) ?? (sameThread ? toMs(thread.toTs) : null),
    room: roomRaw === "fomo" || roomRaw === "afterbell" ? roomRaw : null,
    displayName: (fromUrl ? str(params.get("name")) : null) ?? (sameThread ? str(thread.displayName) : null),
    symbol: (fromUrl ? str(params.get("symbol")) : null) ?? (sameThread ? str(thread.symbol) : null),
    cursor: cursorRaw != null ? Math.min(1, Math.max(0, cursorRaw)) : null,
  };
}

export function replayShareUrl(origin: string, subject: ReplaySubject, cursor?: number | null) {
  const params = new URLSearchParams({ mode: "replay", wallet: subject.wallet, mint: subject.mint, chain: subject.chainKey });
  if (subject.fromTs) params.set("from", String(Math.floor(subject.fromTs / 1000)));
  if (subject.toTs) params.set("to", String(Math.ceil(subject.toTs / 1000)));
  if (subject.room) params.set("room", subject.room);
  if (subject.symbol) params.set("symbol", subject.symbol);
  if (subject.displayName) params.set("name", subject.displayName);
  if (cursor != null && cursor > 0 && cursor < 1) params.set("t", cursor.toFixed(3));
  return `${origin.replace(/\/$/, "")}/?${params.toString()}`;
}

export function replayToolInput(subject: ReplaySubject) {
  const evm = EVM.test(subject.wallet) && EVM.test(subject.mint);
  const bucketSeconds = subject.fromTs && subject.toTs && subject.toTs - subject.fromTs > 7 * 86_400_000 ? 3600 : 60;
  return {
    wallets: [subject.wallet],
    wallet: subject.wallet,
    mint: subject.mint,
    chainKey: subject.chainKey,
    bucketSeconds,
    ...(evm ? {} : { quoteMint: WSOL_MINT }),
    ...(subject.fromTs ? { from: Math.floor(subject.fromTs / 1000) } : {}),
    ...(subject.toTs ? { to: Math.ceil(subject.toTs / 1000) } : {}),
  };
}

export function tapeCandles(value: unknown): TapeCandle[] {
  const seen = new Set<number>();
  return rows(value)
    .map((row) => {
      const timestamp = toMs(row.timestamp) ?? 0;
      return { time: Math.floor(timestamp / 1000), timestamp, open: finite(row.open) ?? 0, high: finite(row.high) ?? 0, low: finite(row.low) ?? 0, close: finite(row.close) ?? 0 };
    })
    .filter((row) => row.timestamp > 0 && row.high > 0 && row.low > 0 && row.close > 0)
    .sort((a, b) => a.time - b.time)
    .filter((row) => (seen.has(row.time) ? false : (seen.add(row.time), true)));
}

/** Only observed or provider-labelled buys and sells become bolts. Transfers and unknown sides stay off the tape. */
export function tapeEvents(value: unknown): TapeEvent[] {
  return rows(value)
    .flatMap((row) => {
      const side = String(row.side ?? "").toLowerCase();
      const timestamp = toMs(row.timestamp);
      if ((side !== "buy" && side !== "sell") || !timestamp) return [];
      const delta = finite(row.tokenDelta);
      const sources = Array.isArray(row.sources) ? row.sources.map(String).filter(Boolean) : [];
      return [{
        id: str(row.id) ?? str(row.signature) ?? `${side}:${timestamp}`,
        side: side as "buy" | "sell",
        timestamp,
        signature: str(row.signature),
        amount: delta != null ? Math.abs(delta) : null,
        priceUsd: finite(row.priceUsd),
        verification: str(row.verification) ?? str(row.sourceKind) ?? "observed",
        sources,
        kind: str(row.kind) ?? "trade",
      }];
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Bolts sit on the candle whose bucket holds the print. Provider prices can be quoted on a different
 * scale than the candle series, so the anchor is the candle itself (low for buys, high for sells).
 */
export function anchorBolts(events: readonly TapeEvent[], candles: readonly TapeCandle[], startMs: number, endMs: number): TapeBolt[] {
  const range = Math.max(1, endMs - startMs);
  return events.map((event) => {
    const cursor = Math.min(1, Math.max(0, (event.timestamp - startMs) / range));
    if (!candles.length) return { ...event, candleTime: null, anchorPrice: null, cursor };
    const t = Math.floor(event.timestamp / 1000);
    let lo = 0, hi = candles.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (candles[mid].time <= t) lo = mid;
      else hi = mid - 1;
    }
    const candle = candles[lo].time <= t ? candles[lo] : candles[0];
    return { ...event, candleTime: candle.time, anchorPrice: event.side === "buy" ? candle.low : candle.high, cursor };
  });
}

export function tapeWindow(bundleWindow: unknown, candles: readonly TapeCandle[], events: readonly TapeEvent[], subject: ReplaySubject) {
  const w = bundleWindow && typeof bundleWindow === "object" ? (bundleWindow as Row) : {};
  const times = [...candles.map((row) => row.timestamp), ...events.map((row) => row.timestamp)];
  const start = toMs(w.startTime) ?? subject.fromTs ?? (times.length ? Math.min(...times) : 0);
  const end = toMs(w.endTime) ?? subject.toTs ?? (times.length ? Math.max(...times) : 0);
  return { start, end: Math.max(end, start + 1) };
}

export function candleSource(value: unknown): string | null {
  for (const row of rows(value)) {
    const sources = Array.isArray(row.sources) ? row.sources.map(String) : [];
    if (sources[0]) return sources[0];
  }
  return null;
}

export function explorerUrl(chainKey: string, signature: string | null) {
  if (!signature) return null;
  if (chainKey === "solana") return `https://solscan.io/tx/${signature}`;
  if (chainKey === "robinhood") return `https://robinhoodchain.blockscout.com/tx/${signature}`;
  if (chainKey === "base") return `https://basescan.org/tx/${signature}`;
  if (chainKey === "ethereum") return `https://etherscan.io/tx/${signature}`;
  return null;
}

export type CutFormat = "portrait" | "landscape";
export const CUT_SIZE: Record<CutFormat, { width: number; height: number }> = { portrait: { width: 1080, height: 1920 }, landscape: { width: 1920, height: 1080 } };

/** The Cut manifest names exactly what the video shows so anyone can re-check it against the chain. */
export function buildCutManifest(input: { subject: ReplaySubject; bolts: readonly TapeBolt[]; candleCount: number; candleSource: string | null; start: number; end: number; replayUrl: string; format: CutFormat; greyLine: string | null; generatedAt?: string }) {
  const size = CUT_SIZE[input.format];
  return {
    kind: "a-bulls-replay-cut",
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    wallet: input.subject.wallet,
    mint: input.subject.mint,
    chain: input.subject.chainKey,
    room: input.subject.room,
    title: [input.subject.displayName, input.subject.symbol].filter(Boolean).join(" · ") || null,
    window: { from: new Date(input.start).toISOString(), to: new Date(input.end).toISOString(), fromUnix: Math.floor(input.start / 1000), toUnix: Math.ceil(input.end / 1000) },
    format: { orientation: input.format, width: size.width, height: size.height },
    candleSource: input.candleCount ? input.candleSource : null,
    candleCount: input.candleCount,
    candles: input.candleCount ? "indexed OHLC" : "unavailable · event tape only",
    prints: input.bolts.map((bolt) => ({ side: bolt.side, at: new Date(bolt.timestamp).toISOString(), signature: bolt.signature, verification: bolt.verification })),
    signatures: input.bolts.flatMap((bolt) => (bolt.signature ? [bolt.signature] : [])),
    buyCount: input.bolts.filter((bolt) => bolt.side === "buy").length,
    sellCount: input.bolts.filter((bolt) => bolt.side === "sell").length,
    greyLine: input.greyLine,
    replayUrl: input.replayUrl,
    disclosure: "Research only. Every bolt is a retained buy or sell print. No price path was invented. A Bulls App is not a broker and executes no trades.",
  };
}
