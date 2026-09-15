import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { autoSelectReceiptIds, CUT_RECEIPT_MAX, receiptEventId } from "./trickster-cut.ts";

describe("Cut receipt auto-select", () => {
  it("selects the first N receipts and never exceeds the max-12 cap", () => {
    const events = Array.from({ length: 20 }, (_, index) => ({ id: `sig-${index}`, signature: `sig-${index}` }));
    assert.equal(CUT_RECEIPT_MAX, 12);
    assert.deepEqual(autoSelectReceiptIds(events), events.slice(0, 12).map((event, index) => receiptEventId(event, index)));
    assert.deepEqual(autoSelectReceiptIds(events, 99).length, 12);
    assert.deepEqual(autoSelectReceiptIds(events.slice(0, 3)), ["sig-0", "sig-1", "sig-2"]);
    assert.deepEqual(autoSelectReceiptIds([]), []);
    assert.deepEqual(autoSelectReceiptIds(null), []);
  });

  it("falls back to event-index ids when signature/id are missing so checkboxes still match", () => {
    assert.equal(receiptEventId({}, 4), "event-4");
    assert.deepEqual(autoSelectReceiptIds([{}, { signature: "abc" }]), ["event-0", "abc"]);
  });
});
