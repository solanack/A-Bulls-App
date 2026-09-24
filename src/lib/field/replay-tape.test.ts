import assert from "node:assert/strict";
import test from "node:test";
import { anchorBolts, cohortTicks, fullTape, groupBolts, hopSchedule, notionalScale, priceAxisLabel, replayShareUrl, replaySubjectFrom, replayToolInput, STRIKE_DOWN_MS, STRIKE_MS, STRIKE_UP_MS, strikePhase, tapeAxis, tapeCandles, tapeHeaderLine, tapeEvents, tapeScaleFor, toMs, WSOL_MINT, type TapeCandle, type TapeEvent } from "./replay-tape.ts";

const AB_WALLET = "G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy";
const AB_MINT = "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1";
const FOMO_WALLET = "0x1fce5a5d5b00c8a8cd80e8bdc608ebf8eb17cd7e";
const FOMO_MINT = "0xfe7e19cbce2f896c6c528bc355baf5a768291e18";

test("share URL round-trips the exact Replay: subject, window, room and cursor", () => {
  const subject = replaySubjectFrom(`?mode=replay&wallet=${AB_WALLET}&mint=${AB_MINT}&chain=solana&from=1790107200&to=1790170200&room=afterbell&t=0.4`, {});
  assert.ok(subject);
  assert.equal(subject.fromTs, 1790107200000);
  assert.equal(subject.toTs, 1790170200000);
  assert.equal(subject.room, "afterbell");
  assert.equal(subject.cursor, 0.4);
  const url = replayShareUrl("https://app.example", subject, 0.4);
  assert.deepEqual(replaySubjectFrom(new URL(url).search, {}), subject);
});

test("Replay reads the stored thread when the URL carries no subject, so the menu never opens a blank form", () => {
  const subject = replaySubjectFrom("", { wallet: FOMO_WALLET, mint: FOMO_MINT, chainKey: "robinhood", galaxyId: "fomo", fromTs: 1784685328000, toTs: 1788228875000, displayName: "LP1111", symbol: "SPACEHOOD" });
  assert.ok(subject);
  assert.equal(subject.chainKey, "robinhood");
  assert.equal(subject.displayName, "LP1111");
  assert.equal(replaySubjectFrom("", {}), null);
});

test("tool input keeps EVM subjects off the WSOL quote and passes the selected window", () => {
  const evm = replayToolInput({ wallet: FOMO_WALLET, mint: FOMO_MINT, chainKey: "robinhood", fromTs: 1784685328000, toTs: 1788228875000, room: "fomo", displayName: null, symbol: null, cursor: null });
  assert.equal("quoteMint" in evm, false);
  assert.equal(evm.from, 1784685328);
  assert.equal(evm.bucketSeconds, 3600);
  const sol = replayToolInput({ wallet: AB_WALLET, mint: AB_MINT, chainKey: "solana", fromTs: null, toTs: null, room: null, displayName: null, symbol: null, cursor: null });
  assert.equal(sol.quoteMint, WSOL_MINT);
});

test("bolts anchor to the candle holding each print; unknown sides never become bolts", () => {
  const candles = tapeCandles([{ timestamp: 1790107200000, open: 1, high: 2, low: 0.5, close: 1.5 }, { timestamp: 1790107260000, open: 1.5, high: 3, low: 1, close: 2 }]);
  const events = tapeEvents([{ id: "a", side: "buy", timestamp: 1790107230000, tokenDelta: -2, priceUsd: 0.0004 }, { id: "b", side: "sell", timestamp: 1790107270000 }, { id: "c", side: null, timestamp: 1790107240000 }]);
  assert.equal(events.length, 2);
  const bolts = anchorBolts(events, candles, 1790107200000, 1790107320000);
  assert.equal(bolts[0].candleTime, 1790107200);
  assert.equal(bolts[0].anchorPrice, 0.5);
  assert.equal(bolts[0].amount, 2);
  assert.equal(bolts[1].candleTime, 1790107260);
  assert.equal(bolts[1].anchorPrice, 3);
  const tape = anchorBolts(events, [], 1790107200000, 1790107320000);
  assert.equal(tape[0].anchorPrice, null);
  assert.equal(toMs(1790107200), 1790107200000);
});

test("Cut manifest carries wallet, mint, window, signatures and candle source; no candles means no source claim", async () => {
  const { buildCutManifest } = await import("./replay-tape.ts");
  const subject = { wallet: AB_WALLET, mint: AB_MINT, chainKey: "solana", fromTs: 1790107200000, toTs: 1790170200000, room: "afterbell" as const, displayName: "G39w…5axy", symbol: "CRCLx", cursor: null };
  const bolts = anchorBolts(tapeEvents([{ id: "s1", signature: "sig1", side: "buy", timestamp: 1790110000000 }, { id: "p1", side: "sell", timestamp: 1790120000000, verification: "provider-reported" }]), [], 1790107200000, 1790170200000);
  const manifest = buildCutManifest({ subject, bolts, candleCount: 0, candleSource: "coingecko", start: 1790107200000, end: 1790170200000, replayUrl: "https://app.example/?mode=replay", format: "portrait", greyLine: null, generatedAt: "2026-09-25T00:00:00.000Z" });
  assert.equal(manifest.format.width, 1080);
  assert.equal(manifest.format.height, 1920);
  assert.deepEqual(manifest.signatures, ["sig1"]);
  assert.equal(manifest.candleSource, null);
  assert.equal(manifest.window.fromUnix, 1790107200);
  assert.equal(manifest.buyCount, 1);
  assert.match(manifest.disclosure, /No price path was invented/);
});

test("candle source shows a provider name on screen, never the API tier id", async () => {
  const { candleSourceLabel } = await import("./replay-tape.ts");
  assert.equal(candleSourceLabel("coingecko-demo-onchain:solana:3zozghHn3cCmbAVPF3Bm5AiyT7VorSdHwTt2qJjLfDo2"), "CoinGecko onchain OHLC");
  assert.equal(candleSourceLabel("coingecko-pro-onchain:solana:pool"), "CoinGecko onchain OHLC");
  assert.equal(candleSourceLabel("geckoterminal-public:solana:pool"), "GeckoTerminal OHLC");
  assert.equal(candleSourceLabel(null), "indexed OHLC");
  assert.doesNotMatch(candleSourceLabel("coingecko-demo-onchain:x"), /demo/i);
});

const H = 3_600_000;
const candleAt = (i: number, base = 1_790_000_000_000): TapeCandle => ({ time: (base + i * H) / 1000, timestamp: base + i * H, open: 1, high: 2, low: 0.5, close: 1.5 });
const eventAt = (id: string, timestamp: number, side: "buy" | "sell" = "buy", extra: Partial<TapeEvent> = {}): TapeEvent => ({ id, side, timestamp, signature: null, amount: null, priceUsd: null, verification: "observed", sources: [], kind: "trade", ...extra });

test("full tape spans every retained candle, first to last, not a cropped scene around the print", () => {
  const candles = Array.from({ length: 100 }, (_, i) => candleAt(i));
  const events = [eventAt("a", candles[40].timestamp + 60_000), eventAt("b", candles[50].timestamp + 60_000, "sell")];
  const view = fullTape(candles, events, { start: candles[30].timestamp, end: candles[60].timestamp });
  assert.equal(view.start, candles[0].timestamp);
  assert.equal(view.end, candles[99].timestamp + H);
});

test("tape axis packs candles into equal slots so a gap in the series leaves no empty tape", () => {
  const candles = [candleAt(0), candleAt(1), candleAt(50), candleAt(51)];
  const axis = tapeAxis(candles, candles[0].timestamp, candles[3].timestamp + H);
  assert.equal(axis.frac(candles[0].timestamp), 0);
  assert.equal(axis.frac(candles[2].timestamp), 0.5);
  assert.equal(axis.center(3), 0.875);
  assert.equal(axis.frac(candles[3].timestamp + H), 1);
  assert.equal(axis.timeAt(0.5), candles[2].timestamp);
});

test("full tape without candles keeps a margin around the prints", () => {
  const view = fullTape([], [eventAt("a", 10 * H), eventAt("b", 20 * H)], { start: 0, end: 100 * H });
  assert.ok(view.start < 10 * H && view.start >= 9 * H);
  assert.ok(view.end > 20 * H && view.end <= 21 * H);
});

test("cohort ticks sit on their candle slot and stay inside the tape", () => {
  const candles = Array.from({ length: 4 }, (_, i) => candleAt(i));
  const ticks = cohortTicks([{ id: "x", wallet: "0xabc0000000000000000000000000000000000def", callsign: "@bee", time: candles[2].timestamp + 1, source: "fomoapi.io/trades" }, { id: "late", wallet: "0xabc", time: candles[3].timestamp + 9 * H }], candles, candles[0].timestamp, candles[3].timestamp + H);
  assert.equal(ticks.length, 1);
  assert.equal(ticks[0].id, "cohort:x");
  assert.equal(ticks[0].candleTime, candles[2].time);
  assert.ok(Math.abs(ticks[0].cursor - 0.5) < 0.01);
});

test("header counts the hero and cohort without claiming a follow", () => {
  const bolts = anchorBolts([eventAt("a", H, "buy", { verification: "provider-reported" })], [], 0, 2 * H);
  const line = tapeHeaderLine({ token: "MarsCoin", trader: "Unipcs", bolts, cohortCount: 7 });
  assert.equal(line, "MarsCoin · Unipcs 1 buy · 0 sells · 7 cohort buys after this print · Fomo-reported");
  assert.doesNotMatch(line, /follow|cop(y|ied)/i);
});

test("bolts anchor on the print candle and several prints on one bar become one counted bolt", () => {
  const candles = Array.from({ length: 5 }, (_, i) => candleAt(i));
  const events = [eventAt("a", candles[2].timestamp + 1, "buy", { amount: 10, priceUsd: 1 }), eventAt("b", candles[2].timestamp + 2, "buy", { amount: 100, priceUsd: 1.2 }), eventAt("c", candles[3].timestamp + 1, "sell")];
  const bolts = anchorBolts(events, candles, candles[0].timestamp, candles[4].timestamp + H);
  assert.equal(bolts[0].candleTime, candles[2].time);
  assert.equal(bolts[1].anchorPrice, 1.2);
  const groups = groupBolts(bolts);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].notional, 130);
  assert.equal(groups[0].cursor, bolts[1].cursor);
  assert.equal(notionalScale(groups[0], groups), 1);
});

test("price axis reads 3 significant figures", () => {
  assert.equal(priceAxisLabel(0.0000132), "0.0₄132");
  assert.equal(priceAxisLabel(0.0132), "0.0132");
  assert.equal(priceAxisLabel(212.456), "212");
  assert.equal(priceAxisLabel(15_432), "15.4K");
  assert.equal(priceAxisLabel(2_340_000), "2.34M");
});

test("playhead hops bolt to bolt and dwells on each stop", () => {
  const schedule = hopSchedule([0.2, 0.5, 0.5]);
  assert.deepEqual(schedule.stops, [0.2, 0.5, 1]);
  assert.equal(schedule.cursorAt(0), 0);
  assert.equal(schedule.cursorAt(schedule.arrivals[0]), 0.2);
  assert.equal(schedule.cursorAt(0.3), 0.2);
  assert.equal(schedule.cursorAt(1), 1);
  assert.equal(schedule.progressAt(0.5), schedule.arrivals[1]);
  for (let p = 0; p < 1; p += 0.01) assert.ok(schedule.cursorAt(p) <= schedule.cursorAt(p + 0.01) + 1e-9);
});

test("hero lightning strikes down, returns up, then leaves a scar; only FOMO uses a log scale", () => {
  assert.ok(STRIKE_DOWN_MS >= 120 && STRIKE_DOWN_MS <= 180);
  assert.ok(STRIKE_UP_MS >= 80 && STRIKE_UP_MS <= 100);
  assert.equal(STRIKE_MS, STRIKE_DOWN_MS + STRIKE_UP_MS);
  assert.deepEqual(strikePhase(0), { phase: "down", progress: 0 });
  assert.equal(strikePhase(STRIKE_DOWN_MS + STRIKE_UP_MS / 2).phase, "up");
  assert.deepEqual(strikePhase(STRIKE_MS), { phase: "scar" });
  assert.deepEqual(strikePhase(null), { phase: "scar" });
  assert.equal(tapeScaleFor("fomo"), "log");
  assert.equal(tapeScaleFor("afterbell"), "linear");
});
