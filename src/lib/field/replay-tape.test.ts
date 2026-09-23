import assert from "node:assert/strict";
import test from "node:test";
import { anchorBolts, replayShareUrl, replaySubjectFrom, replayToolInput, tapeCandles, tapeEvents, toMs, WSOL_MINT } from "./replay-tape.ts";

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
