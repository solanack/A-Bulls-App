import assert from "node:assert/strict";
import test from "node:test";
import { LIVE_FIXTURE, validateReplay } from "./check-live.mjs";

const fixture = Object.freeze({
  ...LIVE_FIXTURE,
  from: 1_780_000_000,
  to: 1_780_003_600,
  signatures: Object.freeze(["retained-entry", "retained-exit"]),
});

const response = (overrides = {}) => ({
  ok: true,
  bundle: {
    subject: { wallets: [fixture.wallet], mint: fixture.mint, quoteMint: fixture.quoteMint },
    window: { from: fixture.from, to: fixture.to },
    eventCount: 2,
    events: [{ signature: "retained-entry" }, { signature: "retained-exit" }],
    candles: [],
    ...overrides,
  },
});

test("known retained Replay accepts the exact subject, window, and receipts", () => {
  assert.equal(validateReplay(response(), fixture).eventCount, 2);
});

test("known retained Replay rejects an empty event list", () => {
  assert.throws(() => validateReplay(response({ eventCount: 0, events: [] }), fixture), /returned no events/);
});

test("known retained Replay rejects a mismatched subject", () => {
  assert.throws(
    () => validateReplay(response({ subject: { wallets: [fixture.wallet], mint: "different-mint", quoteMint: fixture.quoteMint } }), fixture),
    /different mint/,
  );
});

test("known retained Replay rejects missing expected receipts", () => {
  assert.throws(
    () => validateReplay(response({ eventCount: 1, events: [{ signature: "retained-entry" }] }), fixture),
    /retained-exit/,
  );
});
