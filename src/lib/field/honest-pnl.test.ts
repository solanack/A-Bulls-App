import assert from "node:assert/strict";
import test from "node:test";
import {
  PNL_CAVEAT,
  PNL_FOMO_LABEL,
  PNL_HYPOTHETICAL_LABEL,
  PNL_MISSING,
  PNL_REALIZED_LABEL,
  evidenceVerifyHref,
  finitePnl,
  formatCompactUsd,
  formatHypothetical,
  formatSolPnl,
  hypotheticalDisplayUnit,
  hypotheticalQuote,
  pnlSourceLabel,
  roundsMatchedLine,
  simulationRoundCounts,
  skyFactText,
} from "./honest-pnl.ts";

test("missing PnL is an em dash and a known zero stays a known zero", () => {
  assert.equal(finitePnl(null), null);
  assert.equal(finitePnl(""), null);
  assert.equal(finitePnl("nope"), null);
  assert.equal(finitePnl(0), 0);
  assert.deepEqual(formatSolPnl(null), { text: PNL_MISSING, known: false });
  assert.deepEqual(formatSolPnl(undefined), { text: PNL_MISSING, known: false });
  assert.equal(formatSolPnl(0).text, "+0.0000 SOL");
  assert.equal(formatSolPnl(0).known, true);
  assert.equal(formatCompactUsd(null).text, PNL_MISSING);
  assert.equal(formatCompactUsd(0).text, "+$0");
  assert.doesNotMatch(formatSolPnl(null).text, /0/);
  assert.doesNotMatch(formatCompactUsd(undefined).text, /N\/A|0/);
});

test("the three PnL sources stay labeled and are never one total", () => {
  assert.equal(pnlSourceLabel("realized"), PNL_REALIZED_LABEL);
  assert.equal(pnlSourceLabel("fomo"), PNL_FOMO_LABEL);
  assert.equal(pnlSourceLabel("hypothetical"), PNL_HYPOTHETICAL_LABEL);
  assert.equal(PNL_CAVEAT, "historical, not a promise, not advice");
  assert.notEqual(PNL_REALIZED_LABEL, PNL_FOMO_LABEL);
  assert.notEqual(PNL_REALIZED_LABEL, PNL_HYPOTHETICAL_LABEL);
  assert.equal(roundsMatchedLine(2, 5), "2 of 5 rounds matched");
  assert.equal(roundsMatchedLine(0, 3), "0 of 3 rounds matched");
  assert.equal(roundsMatchedLine(0, 0), PNL_MISSING);
  assert.equal(roundsMatchedLine(4, 0), PNL_MISSING);
});

test("compact USD does not round into a four-digit thousands suffix or a fake zero cent", () => {
  assert.equal(formatCompactUsd(999_999).text, "+$1.0M");
  assert.equal(formatCompactUsd(-999_999).text, "-$1.0M");
  assert.equal(formatCompactUsd(994_000).text, "+$994K");
  assert.equal(formatCompactUsd(-0.004).text, "-$0.004");
  assert.notEqual(formatCompactUsd(-0.004).text, "-$0.00");
  assert.equal(formatCompactUsd(0.5).text, "+$0.50");
});

test("What-If keeps a unit and falls back when Worker coverage fields are absent", () => {
  assert.equal(formatHypothetical(0.1234, "sol"), "+0.1234 SOL");
  assert.equal(formatHypothetical(12.5, "usd"), "+$12.50");
  assert.equal(formatHypothetical(null, "sol"), PNL_MISSING);
  assert.equal(hypotheticalDisplayUnit({ pnlDisplayUnit: "usd" }), "usd");
  assert.equal(hypotheticalDisplayUnit({ pnlDisplayUnit: "sol", quoteMint: "usd" }), "sol");
  assert.equal(hypotheticalDisplayUnit({}), "sol");
  assert.equal(hypotheticalDisplayUnit({ quoteMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }), "usd");
  assert.deepEqual(simulationRoundCounts({ outcomeLength: 4 }), { total: 4, comparable: 4 });
  assert.deepEqual(simulationRoundCounts({ positionCount: 0, comparablePositions: 0, outcomeLength: 4 }), { total: 0, comparable: 0 });
  assert.deepEqual(simulationRoundCounts({ positionCount: 6, comparablePositions: 2, positionLength: 1, outcomeLength: 1 }), { total: 6, comparable: 2 });
});

test("sky facts keep the source label when a short budget would otherwise cut it", () => {
  const crowded = "#10 +$1.3K UNIP · Fomo-reported";
  assert.equal(skyFactText(crowded, 64), crowded);
  const shortened = skyFactText(crowded, 28);
  assert.match(shortened ?? "", /Fomo-reported$/);
  assert.doesNotMatch(shortened ?? "", /Fomo-repor$/);
  const advice = "Not financial advice · Realized +$1.2K · Holds TSLAx";
  assert.equal(skyFactText(advice, 64), advice);
  assert.match(skyFactText(advice, 64) ?? "", /^Not financial advice/);
});

test("an empty What-If set does not become a zero hypothetical", () => {
  assert.equal(hypotheticalQuote(0, 0), null);
  assert.equal(hypotheticalQuote(0, 2), 0);
  assert.equal(hypotheticalQuote(1.5, 1), 1.5);
  assert.equal(hypotheticalQuote(null, 4), null);
});

test("VERIFY links require a public wallet and prefer the Replay evidence window", () => {
  const wallet = "BWVR4KqS8eVkmKXCsb8cq76jJMN7FjWjCYxZtzGpYQnx";
  const mint = "97jCC4dL3ceKFqovn3gPKApKQ8hUYwJmCUV3m9d1pump";
  assert.equal(evidenceVerifyHref({ wallet: "short", mint }), null);
  assert.match(evidenceVerifyHref({ origin: "https://app.example", wallet, mint, chain: "solana" }) ?? "", /mode=replay/);
  assert.match(evidenceVerifyHref({ wallet }) ?? "", /\/\?wallet=/);
  assert.doesNotMatch(evidenceVerifyHref({ wallet }) ?? "", /mode=replay/);
});
