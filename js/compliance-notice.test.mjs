import test from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_NOTICE,
  csvExportNotice,
  cutExportNotice,
  FEE_GROSS_UNLESS_EMBEDDED,
  FOMO_CLOSED_TRADE_RANKED_NOTICE,
  observatoryDisplayMethod,
  observatoryMethodLabel,
  OBSERVATORY_METHOD_ID,
  OBSERVATORY_RANKED_NOTICE,
  OBSERVATORY_STALE_METHOD_ID,
  pnlCardNotice,
  pnlRevealNotice,
  providerReportedNotice,
  staleRankingNotice,
} from "./compliance-notice.mjs";

test("pnl card notice uses the approved draft and does not invent a net-of-fees claim", () => {
  const text = pnlCardNotice({ method: "FIFO matched", fees: FEE_GROSS_UNLESS_EMBEDDED, windowLabel: "EXACT WINDOW" });
  assert.match(text, /^Realized PnL, FIFO matched, gross of fees unless embedded, EXACT WINDOW, priced at trade time\./);
  assert.match(text, /marked PARTIAL/);
  assert.match(text, /Not a skill score/);
  assert.match(text, /Past performance does not predict future results/);
  assert.match(text, /not investment, tax, or legal advice/);
  assert.doesNotMatch(text, /net of fees|alpha|smart money|HIDDEN/i);
});

test("provider notice omits an unknown capture date and keeps the all-time window", () => {
  const text = providerReportedNotice({ capturedAt: null, windowLabel: "all-time" });
  assert.match(text, /^Rank and PnL are reported by fomoapi\.io \(all-time\)\./);
  assert.doesNotMatch(text, /as of/);
  assert.match(providerReportedNotice({ capturedAt: 1_700_000_000, windowLabel: "all-time" }), /as of Nov 14, 2023 \(all-time\)/);
});

test("ranked lists do not invent a minimum-sample exclusion", () => {
  assert.match(FOMO_CLOSED_TRADE_RANKED_NOTICE, /A minimum-sample exclusion is not applied/);
  assert.match(FOMO_CLOSED_TRADE_RANKED_NOTICE, /LOSSES tab/);
  assert.match(FOMO_CLOSED_TRADE_RANKED_NOTICE, /Not a recommendation to follow, copy, or trade/);
  assert.doesNotMatch(FOMO_CLOSED_TRADE_RANKED_NOTICE, /MIN SAMPLE|top 10%/i);
  assert.match(OBSERVATORY_RANKED_NOTICE, /not shown here/);
  assert.doesNotMatch(OBSERVATORY_RANKED_NOTICE, /LOSSES tab/);
});

test("stale banner uses a date and does not hide rows after N days", () => {
  assert.equal(staleRankingNotice(1_700_000_000), "This ranking was last updated Nov 14, 2023 and may be out of date.");
  assert.equal(staleRankingNotice(null), null);
  assert.doesNotMatch(String(staleRankingNotice(1_700_000_000)), /HIDDEN|TO CONFIRM/);
});

test("observatory display method maps the stale average-cost id to FIFO v2 and keeps unknown methods", () => {
  assert.equal(observatoryDisplayMethod(undefined), OBSERVATORY_METHOD_ID);
  assert.equal(observatoryDisplayMethod(OBSERVATORY_STALE_METHOD_ID), OBSERVATORY_METHOD_ID);
  assert.equal(observatoryDisplayMethod(OBSERVATORY_METHOD_ID), OBSERVATORY_METHOD_ID);
  assert.equal(observatoryDisplayMethod("future-method"), "future-method");
  assert.equal(observatoryMethodLabel(OBSERVATORY_STALE_METHOD_ID), `FIFO matched · ${OBSERVATORY_METHOD_ID}`);
  assert.equal(observatoryMethodLabel("future-method"), "future-method");
});

test("cut and csv notices stay inside the draft", () => {
  const cut = cutExportNotice({ method: "FIFO matched", windowLabel: "7D", fees: FEE_GROSS_UNLESS_EMBEDDED, verifyUrl: "https://example.test/?cut=1" });
  assert.match(cut, /^Analytics only, not investment, tax or legal advice\. Past performance does not predict future results\. FIFO matched · 7D · gross of fees unless embedded\. Verify: https:\/\/example\.test\/\?cut=1$/);
  assert.match(pnlRevealNotice({ from: 1_700_000_000, to: 1_700_086_400 }), /entry-to-exit observed price change/);
  assert.match(csvExportNotice({ method: "FIFO matched" }), /Not tax, accounting, or legal advice/);
  assert.match(ANALYTICS_NOTICE, /Not investment, tax, or legal advice/);
});
