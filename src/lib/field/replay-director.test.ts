import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorBolts, buildCutManifest, observedUsdNotional, tapeCandles, tapeEvents, tapeUsdSummary, type ReplaySubject } from "./replay-tape.ts";
import { cutDuration, cutTiming, printLabel, printSource, replayCandleCoverage, replayCoverage } from "./replay-director.ts";

const T = 1_790_000_000_000;
const candle = (timestamp: number, bucketSeconds = 60) => ({ timestamp, bucketSeconds, open: 1, high: 2, low: 0.5, close: 1.5 });
const boltsFor = (rows: unknown[]) => anchorBolts(tapeEvents(rows), [], T, T + 600_000);

test("a FOMO remaining position balance never becomes a fill USD amount, even with a receipt", () => {
  const bolts = boltsFor([
    { id: "fomo-provider:position:entry", side: "buy", timestamp: T, amount: 2, priceUsd: 1, valueUsd: 2, signature: "provider-reference" },
    { kind: "fomo-position-exit", side: "sell", timestamp: T + 60_000, tokenDelta: 2, priceUsd: 3 },
    { id: "actual-fill", side: "buy", timestamp: T + 120_000, execution: { quoteMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", quoteAmount: 200, baseAmount: 50 }, verification: "observed" },
  ]);
  assert.equal(bolts[0].amount, null);
  assert.equal(observedUsdNotional(bolts[0]), null);
  assert.equal(observedUsdNotional(bolts[1]), null);
  assert.equal(observedUsdNotional(bolts[2]), 200);
  assert.equal(tapeUsdSummary(bolts).boughtUsd, 200);
  assert.equal(printLabel(bolts[0]), "Position opened");
  assert.equal(printLabel(bolts[1]), "Position closed");
  assert.equal(printSource(bolts[0]), "Provider-reported");
  assert.deepEqual(replayCoverage(bolts), { total: 3, receipts: 1, priced: 1, summaries: 2, provider: 2 });
});

test("a receipt or the word unverified never upgrades the source to a chain observation", () => {
  const bolts = boltsFor([
    { side: "buy", timestamp: T, signature: "ref" },
    { side: "sell", timestamp: T + 1, verification: "unverified" },
    { side: "sell", timestamp: T + 2, verification: "provider-reported" },
    { side: "buy", timestamp: T + 3, verification: "observed-fact" },
  ]);
  assert.deepEqual(bolts.map(printSource), ["Source unverified", "Source unverified", "Provider-reported", "Chain observation"]);
});

test("events outside retained candles or inside a missing interval use the event tape", () => {
  const candles = tapeCandles([candle(T), candle(T + 600_000)]);
  const covered = tapeEvents([{ side: "buy", timestamp: T + 30_000 }, { side: "sell", timestamp: T + 630_000 }]);
  assert.deepEqual(replayCandleCoverage(candles, covered), { covered: 2, total: 2, usable: true });
  for (const timestamp of [T - 1, T + 60_000, T + 300_000, T + 660_000]) {
    assert.equal(replayCandleCoverage(candles, tapeEvents([{ side: "buy", timestamp }])).usable, false);
  }
  assert.equal(replayCandleCoverage([], covered).usable, false);
});

test("Cut pacing stretches per-fill strikes and reserves the verify ending", () => {
  const bolts = boltsFor([{ side: "buy", timestamp: T + 60_000 }, { side: "sell", timestamp: T + 180_000 }]);
  const quick = cutTiming(bolts, 12), measured = cutTiming(bolts, 24), deep = cutTiming(bolts, 36);
  for (const bolt of bolts) {
    assert.equal(measured.arrivalAt.get(bolt.id), quick.arrivalAt.get(bolt.id)! * 2);
    assert.ok(Math.abs(deep.arrivalAt.get(bolt.id)! - quick.arrivalAt.get(bolt.id)! * 3) < 1e-9);
  }
  assert.equal(cutDuration(24), 29.2);
  assert.equal(cutDuration(Infinity), 17.2);
});

test("export manifest preserves lifecycle scope, individual USD, and chosen direction", () => {
  const bolts = boltsFor([{ id: "fomo-provider:x", side: "buy", timestamp: T, amount: 100, priceUsd: 2 }]);
  const subject: ReplaySubject = { wallet: "wallet", mint: "mint", chainKey: "solana", room: "fomo", displayName: null, symbol: null, fromTs: T, toTs: T + 600_000, cursor: null };
  const manifest = buildCutManifest({ subject, bolts, candleCount: 0, candleSource: null, start: T, end: T + 600_000, replayUrl: "https://app.example/?mode=replay", format: "portrait", greyLine: null, tapeSeconds: 36, soundtrack: "silent" });
  assert.equal(manifest.prints[0].eventScope, "position-summary");
  assert.equal(manifest.prints[0].notionalUsd, null);
  assert.equal(manifest.prints[0].verification, "provider-reported");
  assert.deepEqual(manifest.director, { tapeSeconds: 36, titleSeconds: 1.4, durationSeconds: 41.2, soundtrack: "silent" });
});
