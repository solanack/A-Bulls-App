import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  duelBarRatio,
  extractDivergeSeries,
  extractDuelFields,
  extractSparklineValues,
  prefersReducedMotion,
  statusBadge,
} from "./colosseum-metrics-helpers.ts";

describe("statusBadge", () => {
  it("marks d1 as INDEXED and everything else as DEMO", () => {
    assert.equal(statusBadge("d1"), "INDEXED");
    assert.equal(statusBadge("memory-fallback"), "DEMO");
    assert.equal(statusBadge(undefined), "DEMO");
    assert.equal(statusBadge("other"), "DEMO");
  });
});

describe("extractDivergeSeries", () => {
  it("builds cumulative actual vs hold from retained outcomes only", () => {
    const series = extractDivergeSeries({
      wallet: "AbcdefghWallet1111111111111111111111111",
      quoteMint: "So11111111111111111111111111111111111111112",
      rule: { type: "fixed-hold-after-observed-acquisition", holdDays: 7 },
      outcomes: [
        { blockTime: 1_700_000_000, entryValueQuote: 10, counterfactualValueQuote: 12 },
        { blockTime: 1_700_086_400, entryValueQuote: 5, counterfactualValueQuote: 4 },
      ],
    });
    assert.equal(series.emptyReason, null);
    assert.equal(series.actual.length, 2);
    assert.equal(series.hold.length, 2);
    assert.equal(series.actual[0].v, 10);
    assert.equal(series.actual[1].v, 15);
    assert.equal(series.hold[0].v, 12);
    assert.equal(series.hold[1].v, 16);
    assert.match(series.timeLabel, /7d/);
  });

  it("returns honest empty when series cannot be formed", () => {
    const empty = extractDivergeSeries({ outcomes: [] });
    assert.ok(empty.emptyReason);
    assert.deepEqual(empty.actual, []);
    assert.deepEqual(empty.hold, []);

    const one = extractDivergeSeries({
      outcomes: [{ blockTime: 1_700_000_000, entryValueQuote: 1, counterfactualValueQuote: 2 }],
    });
    assert.ok(one.emptyReason);
    assert.deepEqual(one.actual, []);
  });

  it("skips rows missing actual or hold numbers (no invent)", () => {
    const series = extractDivergeSeries({
      outcomes: [
        { blockTime: 1, entryValueQuote: 1 },
        { blockTime: 2, counterfactualValueQuote: 2 },
        { blockTime: 3, entryValueQuote: 3, counterfactualValueQuote: 4 },
        { blockTime: 4, entryValueQuote: 5, counterfactualValueQuote: 6 },
      ],
    });
    assert.equal(series.actual.length, 2);
    assert.equal(series.actual[1].v, 8);
  });
});

describe("duelBarRatio + extractDuelFields", () => {
  it("does not zero-fill gaps", () => {
    assert.deepEqual(duelBarRatio(null, 10), { aPct: 0, bPct: 0, leading: "gap" });
    assert.deepEqual(duelBarRatio(4, null), { aPct: 0, bPct: 0, leading: "gap" });
  });

  it("scales bars from retained magnitudes only", () => {
    assert.deepEqual(duelBarRatio(10, 5), { aPct: 100, bPct: 50, leading: "a" });
    const ratio = duelBarRatio(3, 9);
    assert.equal(ratio.leading, "b");
    assert.equal(ratio.bPct, 100);
    assert.ok(Math.abs(ratio.aPct - 100 / 3) < 1e-9);
    assert.deepEqual(duelBarRatio(0, 0), { aPct: 0, bPct: 0, leading: "tie" });
  });

  it("extracts only present comparable fields", () => {
    const fields = extractDuelFields(
      { tx_count: 12, mint_count: 4, swap_events: 8 },
      { tx_count: 7, mint_count: 4 },
    );
    assert.equal(fields.length, 3);
    const swaps = fields.find((f) => f.key === "swap_events");
    assert.equal(swaps?.a, 8);
    assert.equal(swaps?.b, null);
    assert.equal(duelBarRatio(swaps!.a, swaps!.b).leading, "gap");
  });
});

describe("extractSparklineValues", () => {
  it("reads closes from candle-like rows and ignores junk", () => {
    assert.deepEqual(
      extractSparklineValues([{ close: 1 }, { close: "2.5" }, { open: 9 }, { close: null }, 3]),
      [1, 2.5, 3],
    );
    assert.deepEqual(extractSparklineValues([]), []);
  });
});

describe("prefersReducedMotion", () => {
  it("no-ops safely when matchMedia absent or reduced", () => {
    assert.equal(prefersReducedMotion({}), false);
    assert.equal(
      prefersReducedMotion({ matchMedia: () => ({ matches: true }) }),
      true,
    );
    assert.equal(
      prefersReducedMotion({ matchMedia: () => ({ matches: false }) }),
      false,
    );
  });
});
