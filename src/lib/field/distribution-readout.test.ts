import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { formatDistributionLine } from "./distribution-readout.ts";
import { buildTraderObservatorySnapshot } from "./trader-observatory.ts";

test("distribution line keeps a missing net-of-fees figure unknown", () => {
  assert.equal(
    formatDistributionLine({ sampleSize: 5, medianTradePnl: 0.25, profitConcentrationTop1: 0.42, profitConcentrationTop3: 0.9, netOfFeesPnl: null, completenessState: "complete", unit: "sol" }),
    "sample 5 · median +0.2500 SOL · top 1–3 42%/90% · net — · COMPLETE",
  );
});

test("observatory stars carry the sample line and do not fall back to average cost", () => {
  const snapshot = buildTraderObservatorySnapshot({
    ok: true,
    coverage: "partial",
    method: "matched-in-window-fifo-realized-sol-v2",
    disclosure: "Observed research ranking.",
    ranking: { key: "matched-realized-sol", winRateUsedForRank: false, minimumMatchedSells: 5, minimumDistinctTokens: 2, excludedBelowSample: 3 },
    items: [{
      rank: 1,
      wallet: "11111111111111111111111111111111",
      realizedSol: 1.5,
      netOfFeesSol: null,
      matchedSellCount: 5,
      sampleSize: 5,
      medianTradePnlSol: 0.2,
      profitConcentrationTop1: 0.5,
      profitConcentrationTop3: 1,
      winRate: 0.6,
      tradeCount: 8,
      tokenCount: 2,
      buySolObserved: 4,
      sellSolObserved: 5.5,
      lastObservedAt: 1_700_000_000_000,
      completeness: { state: "complete", costBasisMatched: true, sampleSufficient: true, fresh: true, reasons: [] },
    }],
  });
  assert.match(String(snapshot.particles[0]?.metadata?.factLine), /sample 5/);
  assert.equal(snapshot.particles[0]?.metadata?.rankingMethod, "matched-in-window-fifo-realized-sol-v2");
  const shell = readFileSync(new URL("../../components/app-shell.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("../../components/weekly-observatory-panel.tsx", import.meta.url), "utf8");
  const closed = readFileSync(new URL("../../components/fomo-closed-trades.tsx", import.meta.url), "utf8");
  assert.match(shell, /WeeklyObservatoryPanel/);
  assert.match(panel, /Win rate is not the sort/);
  assert.match(panel, /formatDistributionLine/);
  assert.match(closed, /fomo-result__metrics/);
});
