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

function candleIndexAt(candles: readonly TapeCandle[], timestampMs: number) {
  const t = Math.floor(timestampMs / 1000);
  let lo = 0, hi = candles.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (candles[mid].time <= t) lo = mid;
    else hi = mid - 1;
  }
  return candles[lo].time <= t ? lo : 0;
}

/** Typical spacing between candles, in milliseconds. */
export function candleBucketMs(candles: readonly TapeCandle[], fallbackMs = 60_000) {
  if (candles.length < 2) return fallbackMs;
  const gaps: number[] = [];
  for (let i = 1; i < candles.length; i++) gaps.push(candles[i].timestamp - candles[i - 1].timestamp);
  gaps.sort((a, b) => a - b);
  return Math.max(1000, gaps[gaps.length >> 1]);
}

/**
 * The tape's x-axis. With candles, every retained bar gets an equal slot across the full width, so gaps in
 * the series never leave empty tape; a print sits inside its bar's slot by time. Without candles, time is linear.
 */
export function tapeAxis(candles: readonly TapeCandle[], startMs: number, endMs: number) {
  const range = Math.max(1, endMs - startMs);
  if (!candles.length) {
    const frac = (ms: number) => Math.min(1, Math.max(0, (ms - startMs) / range));
    return { slots: 0, frac, center: (_index: number) => 0, timeAt: (value: number) => startMs + Math.min(1, Math.max(0, value)) * range };
  }
  const n = candles.length, bucket = candleBucketMs(candles);
  const frac = (ms: number) => {
    if (ms < candles[0].timestamp) return 0;
    const i = candleIndexAt(candles, ms), within = Math.min(1, Math.max(0, (ms - candles[i].timestamp) / bucket));
    return Math.min(1, (i + within) / n);
  };
  const timeAt = (value: number) => {
    const x = Math.min(1, Math.max(0, value)) * n, i = Math.min(n - 1, Math.floor(x));
    return candles[i].timestamp + (x - i) * bucket;
  };
  return { slots: n, frac, center: (index: number) => (index + 0.5) / n, timeAt };
}

/**
 * Bolts sit on the candle whose bucket holds the print. A provider price is used only when it falls
 * inside that candle's range; otherwise it may be quoted on another scale, so the bolt sits on the
 * candle's low (buy) or high (sell).
 */
export function anchorBolts(events: readonly TapeEvent[], candles: readonly TapeCandle[], startMs: number, endMs: number): TapeBolt[] {
  const axis = tapeAxis(candles, startMs, endMs);
  return events.map((event) => {
    const cursor = axis.frac(event.timestamp);
    if (!candles.length) return { ...event, candleTime: null, anchorPrice: null, cursor };
    const candle = candles[candleIndexAt(candles, event.timestamp)];
    const inRange = event.priceUsd != null && event.priceUsd >= candle.low && event.priceUsd <= candle.high;
    return { ...event, candleTime: candle.time, anchorPrice: inRange ? event.priceUsd : event.side === "buy" ? candle.low : candle.high, cursor };
  });
}

/** The whole retained series for the mint, first candle to last, widened only to keep every print on the tape. */
export function fullTape(candles: readonly TapeCandle[], events: readonly TapeEvent[], fallback: { start: number; end: number }) {
  const first = events[0]?.timestamp, last = events.at(-1)?.timestamp;
  if (!candles.length) {
    if (first == null || last == null) return fallback;
    const margin = Math.max(30 * 60_000, (last - first) * 0.1);
    return { start: Math.max(fallback.start, first - margin), end: Math.max(Math.min(fallback.end, last + margin), last + 1) };
  }
  const bucket = candleBucketMs(candles);
  const start = Math.min(candles[0].timestamp, first ?? Infinity);
  const end = Math.max(candles[candles.length - 1].timestamp + bucket, last != null ? last + 1 : 0);
  return { start, end: Math.max(end, start + 1) };
}

/** Another wallet in the same room with a retained buy on this mint after the hero's first print. Timing only. */
export type CohortTick = { id: string; wallet: string; callsign: string; time: number; priceUsd: number | null; source: string; sourceKind: string; txId: string | null; cursor: number; candleTime: number | null; anchorPrice: number | null };

export function cohortTicks(items: unknown, candles: readonly TapeCandle[], startMs: number, endMs: number): CohortTick[] {
  const axis = tapeAxis(candles, startMs, endMs);
  return rows(items).flatMap((row) => {
    const time = toMs(row.time), wallet = str(row.wallet);
    if (!time || !wallet || time < startMs || time > endMs) return [];
    const candle = candles.length ? candles[candleIndexAt(candles, time)] : null;
    return [{ id: `cohort:${str(row.id) ?? `${wallet}:${time}`}`, wallet, callsign: str(row.callsign) ?? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`, time, priceUsd: finite(row.priceUsd), source: str(row.source) ?? "retained", sourceKind: str(row.sourceKind) ?? "provider-reported", txId: str(row.txId), cursor: axis.frac(time), candleTime: candle?.time ?? null, anchorPrice: candle?.low ?? null }];
  }).sort((a, b) => a.time - b.time);
}

export type BoltGroup = { key: string; side: "buy" | "sell"; bolts: TapeBolt[]; lead: TapeBolt; count: number; cursor: number; notional: number | null };

function observedUsdNotional(print: Pick<TapeEvent, "amount" | "priceUsd">): number | null {
  const amount = print.amount, price = print.priceUsd;
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0 && typeof price === "number" && Number.isFinite(price) && price > 0
    ? amount * price
    : null;
}

/** Compact observed notional for bolt labels. Invalid/unknown values deliberately render nothing. */
export function formatUsdNotional(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 100) return "$" + Math.round(value).toLocaleString("en-US");
  if (value < 10_000) return "$" + Math.round(value).toLocaleString("en-US");
  if (value < 1_000_000) return "$" + (value / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return "$" + (value / 1_000_000).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") + "M";
}

export type TapeUsdSummary = {
  boughtUsd: number | null;
  soldUsd: number | null;
  avgBuyUsd: number | null;
  avgSellUsd: number | null;
  buyUsdCount: number;
  buyTotal: number;
  sellUsdCount: number;
  sellTotal: number;
};

/** Observed USD only: amount × priceUsd. Missing amount or price never contributes a dollar. */
export function tapeUsdSummary(bolts: readonly TapeBolt[]): TapeUsdSummary {
  const side = (which: "buy" | "sell") => {
    const prints = bolts.filter((bolt) => bolt.side === which);
    let notional = 0, amount = 0, count = 0;
    for (const bolt of prints) {
      const value = observedUsdNotional(bolt);
      if (value == null) continue;
      notional += value;
      amount += bolt.amount as number;
      count++;
    }
    return {
      usd: count ? notional : null,
      avg: count && amount > 0 ? notional / amount : null,
      count,
      total: prints.length,
    };
  };
  const buy = side("buy"), sell = side("sell");
  return {
    boughtUsd: buy.usd,
    soldUsd: sell.usd,
    avgBuyUsd: buy.avg,
    avgSellUsd: sell.avg,
    buyUsdCount: buy.count,
    buyTotal: buy.total,
    sellUsdCount: sell.count,
    sellTotal: sell.total,
  };
}

/** Several prints on one bar and side become one bolt with a count. Notional is amount × price when both are known. */
export function groupBolts(bolts: readonly TapeBolt[]): BoltGroup[] {
  const groups = new Map<string, BoltGroup>();
  for (const bolt of bolts) {
    const key = `${bolt.candleTime ?? `t${bolt.timestamp}`}:${bolt.side}`;
    const value = observedUsdNotional(bolt);
    const group = groups.get(key);
    if (group) {
      group.bolts.push(bolt);
      group.count++;
      group.cursor = Math.max(group.cursor, bolt.cursor);
      if (value != null) group.notional = (group.notional ?? 0) + value;
    } else groups.set(key, { key, side: bolt.side, bolts: [bolt], lead: bolt, count: 1, cursor: bolt.cursor, notional: value });
  }
  return [...groups.values()].sort((a, b) => a.cursor - b.cursor);
}

/** 1.0 for the smallest known notional up to 1.3 for the largest; 1.0 when notional is unknown. */
export function notionalScale(group: BoltGroup, groups: readonly BoltGroup[]) {
  if (group.notional == null || group.notional <= 0) return 1;
  const values = groups.flatMap((row) => (row.notional != null && row.notional > 0 ? [Math.log10(row.notional)] : []));
  const lo = Math.min(...values), hi = Math.max(...values);
  return hi > lo ? 1 + 0.3 * ((Math.log10(group.notional) - lo) / (hi - lo)) : 1;
}

/** Right-axis price with 3 significant figures. Tiny prices use a subscript zero count: 0.0₄132. */
export function priceAxisLabel(value: number) {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value), sign = value < 0 ? "-" : "";
  if (abs === 0) return "0";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toPrecision(3)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toPrecision(3)}M`;
  if (abs >= 1e4) return `${sign}${(abs / 1e3).toPrecision(3)}K`;
  if (abs >= 0.001) return `${sign}${Number(abs.toPrecision(3))}`;
  const zeros = Math.ceil(-Math.log10(abs)) - 1;
  const digits = Math.min(999, Math.round(abs * 10 ** (zeros + 3))).toString().padStart(3, "0");
  const sub = String(zeros).split("").map((d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]).join("");
  return `${sign}0.0${sub}${digits}`;
}

/**
 * Playback hops bolt to bolt: travel, then dwell on each stop. `cursorAt(progress)` maps 0..1 of the
 * playback clock to a tape cursor, and `arrivals` gives the progress at which each stop is reached.
 */
export function hopSchedule(boltCursors: readonly number[]) {
  const stops = [...new Set(boltCursors.map((value) => Math.min(1, Math.max(0, value))))].sort((a, b) => a - b);
  if (!stops.length || stops[stops.length - 1] < 1) stops.push(1);
  const segments = stops.length, travel = 0.35;
  const arrivals = stops.map((_, i) => (i + travel) / segments);
  const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  function cursorAt(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    if (p >= 1) return 1;
    const i = Math.min(segments - 1, Math.floor(p * segments)), local = p * segments - i;
    const from = i === 0 ? 0 : stops[i - 1], to = stops[i];
    return local >= travel ? to : from + (to - from) * ease(local / travel);
  }
  /** Where playback resumes for a cursor: on a stop it keeps dwelling; between stops it travels from the previous one. */
  function progressAt(cursor: number) {
    const i = stops.findIndex((stop) => stop >= cursor - 1e-9);
    if (i < 0) return 1;
    return Math.abs(stops[i] - cursor) < 1e-6 ? arrivals[i] : i / segments;
  }
  return { stops, arrivals, cursorAt, progressAt };
}

/** Hero lightning: the bolt strikes down onto the candle, climbs back up, and leaves a scar. */
export const STRIKE_DOWN_MS = 150;
export const STRIKE_UP_MS = 90;
export const STRIKE_MS = STRIKE_DOWN_MS + STRIKE_UP_MS;

export type StrikePhase = { phase: "down"; progress: number } | { phase: "up"; progress: number } | { phase: "scar" };
export function strikePhase(ageMs: number | null): StrikePhase {
  if (ageMs == null || ageMs < 0 || ageMs >= STRIKE_MS) return { phase: "scar" };
  if (ageMs < STRIKE_DOWN_MS) return { phase: "down", progress: ageMs / STRIKE_DOWN_MS };
  return { phase: "up", progress: (ageMs - STRIKE_DOWN_MS) / STRIKE_UP_MS };
}

/** Header counts over the whole tape: hero buys and sells, and how many cohort buys came after. */
export function tapeHeaderLine(input: { token: string; trader: string; bolts: readonly TapeBolt[]; cohortCount: number | null }) {
  const buys = input.bolts.filter((bolt) => bolt.side === "buy").length, sells = input.bolts.length - buys;
  const reported = input.bolts.filter((bolt) => bolt.verification === "provider-reported").length;
  const evidence = !input.bolts.length ? null : reported === input.bolts.length ? "Fomo-reported" : reported ? "Observed + Fomo-reported" : "Observed on-chain";
  const parts = [input.token, `${input.trader} ${buys} ${buys === 1 ? "buy" : "buys"}`, `${sells} ${sells === 1 ? "sell" : "sells"}`];
  if (input.cohortCount != null) parts.push(`${input.cohortCount} cohort ${input.cohortCount === 1 ? "buy" : "buys"} after this print`);
  if (evidence) parts.push(evidence);
  return parts.join(" · ");
}

/** Price axis: FOMO memecoins read on a log scale; Afterbell xStocks stay linear. */
export function tapeScaleFor(room: "fomo" | "afterbell" | null): "log" | "linear" {
  return room === "afterbell" ? "linear" : "log";
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

/** Screen and video name for a candle source. The Cut manifest keeps the exact source id. */
export function candleSourceLabel(source: string | null): string {
  const provider = (source ?? "").split(":")[0].toLowerCase();
  if (provider.startsWith("coingecko")) return "CoinGecko onchain OHLC";
  if (provider.startsWith("geckoterminal")) return "GeckoTerminal OHLC";
  if (provider.startsWith("birdeye")) return "Birdeye OHLC";
  return "indexed OHLC";
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
export function buildCutManifest(input: { subject: ReplaySubject; bolts: readonly TapeBolt[]; cohortCount?: number; candleCount: number; candleSource: string | null; start: number; end: number; replayUrl: string; format: CutFormat; greyLine: string | null; generatedAt?: string }) {
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
    cohortBuysAfterFirstPrint: input.cohortCount ?? 0,
    greyLine: input.greyLine,
    replayUrl: input.replayUrl,
    disclosure: "Research only. Every bolt is a retained buy or sell print. No price path was invented. A Bulls App is not a broker and executes no trades.",
  };
}
