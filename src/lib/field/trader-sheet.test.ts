import assert from "node:assert/strict";
import test from "node:test";
import { afterbellFactLine, afterbellPnlCoverage, afterbellPnlText, fomoRoomFactLine, fomoTraderDetail } from "./trader-sheet.ts";
import type { JsonValue } from "./types.ts";

const meta = (value: Record<string, JsonValue>) => value;

test("Afterbell star facts lead with the disclaimer and a signed realized figure", () => {
  assert.equal(
    afterbellFactLine(meta({ holdings: [{ symbol: "TSLAx", observedNetAmount: 2 }], realizedPnlUsd: 12.5, pnlDisplayUnit: "usd" })),
    "Not financial advice · Realized +$12.50 · Holds TSLAx",
  );
  assert.match(
    afterbellFactLine(meta({ mostTraded: [{ symbol: "NVDAx", uniqueAfterCloseTxCount: 4 }], uniqueAfterCloseTxCount: 4, realizedPnlSol: -1.25, pnlDisplayUnit: "sol" })),
    /^Not financial advice · Realized -1\.2500 SOL · NVDAx · 4 prints$/,
  );
  assert.equal(afterbellFactLine(meta({ uniqueAfterCloseTxCount: 3 })), "Not financial advice · Realized — · 3 prints");
  assert.equal(afterbellFactLine(meta({})), "Not financial advice · Realized — · Coverage thin");
});

test("Afterbell falls back when the Worker has not sent pnlDisplayUnit or round coverage", () => {
  const legacy = meta({ realizedPnlUsd: 1250.5, realizedPnlSol: 2, holdings: [{ symbol: "TSLAx", observedNetAmount: 1 }] });
  assert.equal(afterbellPnlText(legacy), "+$1.3K");
  assert.equal(afterbellPnlCoverage(legacy), null);
  assert.equal(afterbellFactLine(legacy), "Not financial advice · Realized +$1.3K · Holds TSLAx");
  assert.equal(afterbellPnlText(meta({ realizedPnlSol: 0.25 })), "+0.2500 SOL");
  assert.equal(afterbellPnlText(meta({})), "—");
});

test("Fomo VERIFY includes the position chain and the matching EVM wallet", () => {
  const evm = "0x1fce5a5d5b00c8a8cd80e8bdc608ebf8eb17cd7e";
  const sol = "G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy";
  const mint = "0xfe7e19cbce2f896c6c528bc355baf5a768291e18";
  const detail = fomoTraderDetail({
    wallet: sol,
    solanaWallet: sol,
    evmWallet: evm,
    handle: "lp",
    displayName: "LP",
    rank: 12,
    reportedPnlUsd: 10,
    positions: [{ mint, symbol: "SPACEHOOD", tradeCount: 2, sourceKind: "fomo-reported", chain: "robinhood" }],
    latestTrades: [],
  });
  assert.match(detail.pnlVerifyHref ?? "", /chain=robinhood/);
  assert.match(detail.pnlVerifyHref ?? "", new RegExp(`wallet=${evm}`));
  assert.match(detail.pnlVerifyHref ?? "", /mode=replay/);
  assert.doesNotMatch(detail.factLine, /Realized|\$/);
  assert.equal(detail.pnlText, "+$10.00");
  assert.equal(detail.metricsLine, null);
});

test("Fomo sheet shows sample, median, concentration, net of fees, and completeness", () => {
  const detail = fomoTraderDetail({
    wallet: null,
    handle: "ada",
    displayName: "Ada",
    rank: 4,
    reportedPnlUsd: 100,
    distribution: {
      sampleSize: 6,
      tokenCount: 2,
      medianTradePnl: 12.5,
      grossPnl: 40,
      netOfFeesPnl: null,
      observedFees: null,
      feeTreatment: "provider-reported-fees-not-in-feed",
      profitConcentrationTop1: 0.5,
      profitConcentrationTop3: 0.8,
      unit: "usd",
    },
    completeness: { state: "partial", costBasisMatched: false, sampleSufficient: true, fresh: true, reasons: ["provider-reported-basis-not-verified"] },
    positions: [],
    latestTrades: [],
  });
  assert.equal(detail.metricsLine, "sample 6 · median +$12.50 · top 1–3 50%/80% · net — · PARTIAL");
  assert.equal(detail.completenessState, "partial");
  assert.equal(fomoRoomFactLine({ closedTradeSampleSize: 1, completenessState: "insufficient" }), "sample 1 · INSUFFICIENT · Fomo-reported");
});
