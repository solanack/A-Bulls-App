/** Canonical compliance copy for PnL surfaces. Draft text only — do not extend these claims. */

export const ANALYTICS_NOTICE =
  "Analytics only. Not investment, tax, or legal advice. Past performance does not predict future results.";

export const FEE_GROSS_UNLESS_EMBEDDED = "gross of fees unless embedded";

export const FIFO_MATCHED = "FIFO matched";

export const OBSERVATORY_METHOD_ID = "matched-in-window-fifo-realized-sol-v2";

export const OBSERVATORY_STALE_METHOD_ID = "matched-in-window-average-cost-realized-sol";

export const FOMO_WINDOW_LABEL = "All-time, provider-reported";

export const COMPARE_METHOD_ID = "matched-round-complete-basis-gross-sol-v1";

/**
 * Missing or the known stale average-cost id displays as the repository FIFO v2 method.
 * Any other method string is shown as sent.
 * @param {unknown} method
 */
export function observatoryDisplayMethod(method) {
  const value = String(method ?? "").trim();
  if (!value || value === OBSERVATORY_STALE_METHOD_ID) return OBSERVATORY_METHOD_ID;
  return value;
}

/**
 * @param {unknown} method
 */
export function observatoryMethodLabel(method) {
  const display = observatoryDisplayMethod(method);
  if (display === OBSERVATORY_METHOD_ID) return `${FIFO_MATCHED} · ${OBSERVATORY_METHOD_ID}`;
  return display;
}

/**
 * @param {unknown} value
 * @param {boolean} withTime
 */
function formatUtc(value, withTime) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n < 10_000_000_000 ? n * 1000 : n;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  return withTime
    ? date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** @param {unknown} value */
export function formatCaptureDate(value) {
  return formatUtc(value, false);
}

/**
 * @param {unknown} start
 * @param {unknown} end
 * @param {string} [prefix]
 */
export function windowRangeLabel(start, end, prefix = "") {
  const a = formatUtc(start, true);
  const b = formatUtc(end, true);
  const range = a && b ? `${a} → ${b}` : "window unavailable";
  return prefix ? `${prefix} · ${range}` : range;
}

/**
 * @param {{ method?: string, fees?: string, windowLabel?: string }} [input]
 */
export function pnlCardNotice(input = {}) {
  const method = String(input.method ?? FIFO_MATCHED).trim() || FIFO_MATCHED;
  const fees = String(input.fees ?? FEE_GROSS_UNLESS_EMBEDDED).trim() || FEE_GROSS_UNLESS_EMBEDDED;
  const windowLabel = String(input.windowLabel ?? "").trim() || "window unavailable";
  return `Realized PnL, ${method}, ${fees}, ${windowLabel}, priced at trade time. Wallets with incomplete history are marked PARTIAL. Not a skill score. Past performance does not predict future results. Analytics only, not investment, tax, or legal advice.`;
}

/**
 * @param {{ provider?: string, capturedAt?: unknown, windowLabel?: string }} [input]
 */
export function providerReportedNotice(input = {}) {
  const provider = String(input.provider ?? "fomoapi.io").trim() || "fomoapi.io";
  const date = formatCaptureDate(input.capturedAt);
  const asOf = date ? ` as of ${date}` : "";
  const windowLabel = String(input.windowLabel ?? "all-time").trim() || "all-time";
  return `Rank and PnL are reported by ${provider}${asOf} (${windowLabel}). A Bulls App has not verified them. Handles are provider-supplied and do not show who controls a wallet. Top lists show a selected group and are not typical results. Analytics only. Past performance does not predict future results.`;
}

/**
 * @param {{ selection: string, rowDescription: string, lossesTab?: string | null }} input
 */
export function rankedListNotice(input) {
  const selection = String(input.selection ?? "").trim();
  const rowDescription = String(input.rowDescription ?? "").trim();
  const lossesTab = input.lossesTab === undefined ? "LOSSES" : input.lossesTab;
  const losses = lossesTab
    ? ` Losing wallets are available on the ${String(lossesTab).trim() || "LOSSES"} tab.`
    : " Wallets below this cached ranking, including losses, are not shown here.";
  return `This list shows ${selection}, so it favors past winners and is not typical of all traders. ${rowDescription}${losses} Not a recommendation to follow, copy, or trade with any wallet.`;
}

/** @param {unknown} dateLabel */
export function staleRankingNotice(dateLabel) {
  const date = formatCaptureDate(dateLabel) ?? String(dateLabel ?? "").trim();
  if (!date || date === "null" || date === "undefined") return null;
  return `This ranking was last updated ${date} and may be out of date.`;
}

/**
 * @param {{ method?: string, windowLabel?: string, fees?: string, verifyUrl?: string }} [input]
 */
export function cutExportNotice(input = {}) {
  const method = String(input.method ?? FIFO_MATCHED).trim() || FIFO_MATCHED;
  const windowLabel = String(input.windowLabel ?? "").trim() || "window unavailable";
  const fees = String(input.fees ?? FEE_GROSS_UNLESS_EMBEDDED).trim() || FEE_GROSS_UNLESS_EMBEDDED;
  const verify = String(input.verifyUrl ?? "").trim();
  const base = `Analytics only, not investment, tax or legal advice. Past performance does not predict future results. ${method} · ${windowLabel} · ${fees}.`;
  return verify ? `${base} Verify: ${verify}` : base;
}

/**
 * @param {string} notice
 * @param {unknown} verifyUrl
 */
export function withVerifyUrl(notice, verifyUrl) {
  const text = String(notice ?? "").trim();
  const verify = String(verifyUrl ?? "").trim();
  if (!text) return "";
  if (!verify || text.includes(verify)) return text;
  return `${text} Verify: ${verify}`;
}

/**
 * @param {{ from?: unknown, to?: unknown, verifyUrl?: string }} [input]
 */
export function pnlRevealNotice(input = {}) {
  return cutExportNotice({
    method: "entry-to-exit observed price change",
    windowLabel: windowRangeLabel(input.from, input.to),
    fees: FEE_GROSS_UNLESS_EMBEDDED,
    verifyUrl: input.verifyUrl,
  });
}

/** @param {{ method?: string }} [input] */
export function csvExportNotice(input = {}) {
  const method = String(input.method ?? FIFO_MATCHED).trim() || FIFO_MATCHED;
  return `Analytics export for research. Not tax, accounting, or legal advice. Figures use ${method} and may differ from exchange, broker, or tax-authority records.`;
}

export const FOMO_CLOSED_TRADE_RANKED_NOTICE = rankedListNotice({
  selection: "cached closed trades from the current Fomo cohort, ordered by provider-reported realized PnL",
  rowDescription: "Each row is one provider-reported closed trade. A minimum-sample exclusion is not applied.",
});

export const OBSERVATORY_RANKED_NOTICE = rankedListNotice({
  selection: "wallets with at least one matched sell, ordered by realized SOL over 7D",
  rowDescription: "Each row shows its matched sell count. A minimum-sample exclusion is not applied.",
  lossesTab: null,
});
