/** Make a Cut receipt selection. Share stays disabled until at least one receipt is chosen. */

export const CUT_RECEIPT_MAX = 12;

export function receiptEventId(event: { id?: unknown; signature?: unknown } | null | undefined, index: number): string {
  const id = event?.id == null ? "" : String(event.id).trim();
  const signature = event?.signature == null ? "" : String(event.signature).trim();
  return id || signature || `event-${index}`;
}

/** Auto-select the first N loaded receipts (capped at 12) so Make a Cut / Share is enabled without checkbox hunting. */
export function autoSelectReceiptIds(
  events: readonly { id?: unknown; signature?: unknown }[] | null | undefined,
  max = CUT_RECEIPT_MAX,
): string[] {
  const list = Array.isArray(events) ? events : [];
  const cap = Math.max(0, Math.min(CUT_RECEIPT_MAX, Math.trunc(Number(max) || CUT_RECEIPT_MAX)));
  return list.slice(0, cap).map((event, index) => receiptEventId(event, index));
}
