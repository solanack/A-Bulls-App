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
  it("marks d1 as INDEXED and everything else as LOCAL, never DEMO", () => {
    assert.equal(statusBadge("d1"), "INDEXED");
    assert.equal(statusBadge("memory-fallback"), "LOCAL");
    assert.equal(statusBadge(undefined), "LOCAL");
    assert.equal(statusBadge("other"), "LOCAL");
  });
});

describe("extractDivergeSeries", () => {
  it("builds cumulative actual vs hold from retained outcomes only", () => {
    const series = extractDivergeSeries({
      wallet: "AbcdefghWallet1111111111111111111111111",
      quoteMint: "So11111111111111111111111111111111111111112",
      rule: { type: "fixed-hold-after-observed-acquisition", holdDays: 7 },
      outcomes: [
        { targetBlockTime: 1_700_000_000, actualValueQuote: 10, counterfactualValueQuote: 12 },
        { targetBlockTime: 1_700_086_400, actualValueQuote: 5, counterfactualValueQuote: 4 },
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

  it("does not relabel acquisition spending as actual performance", () => {
    const series = extractDivergeSeries({
      outcomes: [
        { blockTime: 1_700_000_000, entryValueQuote: 10, counterfactualValueQuote: 12 },
        { blockTime: 1_700_086_400, entryValueQuote: 5, counterfactualValueQuote: 4 },
      ],
    });
    assert.deepEqual(series.actual, []);
    assert.deepEqual(series.hold, []);
    assert.match(series.emptyReason ?? "", /Acquisition spending is not plotted/i);
  });

  it("returns honest empty when series cannot be formed", () => {
    const empty = extractDivergeSeries({ outcomes: [] });
    assert.ok(empty.emptyReason);
    assert.deepEqual(empty.actual, []);
    assert.deepEqual(empty.hold, []);

    const one = extractDivergeSeries({
      outcomes: [{ targetBlockTime: 1_700_000_000, actualValueQuote: 1, counterfactualValueQuote: 2 }],
    });
    assert.ok(one.emptyReason);
    assert.deepEqual(one.actual, []);
  });

  it("skips rows missing actual or hold numbers (no invent)", () => {
    const series = extractDivergeSeries({
      outcomes: [
        { targetBlockTime: 1, actualValueQuote: 1 },
        { targetBlockTime: 2, counterfactualValueQuote: 2 },
        { targetBlockTime: 3, actualValueQuote: 3, counterfactualValueQuote: 4 },
        { targetBlockTime: 4, actualValueQuote: 5, counterfactualValueQuote: 6 },
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

  it("scales bars while leading follows the higher signed value", () => {
    assert.deepEqual(duelBarRatio(10, 5), { aPct: 100, bPct: 50, leading: "a" });
    const ratio = duelBarRatio(3, 9);
    assert.equal(ratio.leading, "b");
    assert.equal(ratio.bPct, 100);
    assert.ok(Math.abs(ratio.aPct - 100 / 3) < 1e-9);
    assert.deepEqual(duelBarRatio(0, 0), { aPct: 0, bPct: 0, leading: "tie" });
    assert.equal(duelBarRatio(-10, 5).leading, "b");
  });

  it("extracts only present comparable fields", () => {
    const fields = extractDuelFields(
      { realized_sol: 12, win_rate_pct: 60, profit_factor: null, median_roi_pct: 18 },
      { realized_sol: 7, win_rate_pct: 40, profit_factor: 2.1 },
    );
    assert.equal(fields.length, 4);
    const factor = fields.find((f) => f.key === "profit_factor");
    assert.equal(factor?.label, "OBSERVED GAIN RATIO");
    assert.equal(fields.find((f) => f.key === "median_roi_pct")?.label, "MEDIAN MATCHED CHANGE");
    assert.equal(fields.find((f) => f.key === "win_rate_pct")?.label, "POSITIVE MATCHED SHARE");
    assert.equal(factor?.a, null);
    assert.equal(factor?.b, 2.1);
    assert.equal(duelBarRatio(factor!.a, factor!.b).leading, "gap");
    const roi = fields.find((f) => f.key === "median_roi_pct");
    assert.equal(roi?.a, 18);
    assert.equal(roi?.b, null);
    assert.equal(duelBarRatio(roi!.a, roi!.b).leading, "gap");
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
