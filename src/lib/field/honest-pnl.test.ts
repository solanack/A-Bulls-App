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
  formatSolPnl,
  hypotheticalQuote,
  pnlSourceLabel,
  roundsMatchedLine,
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
