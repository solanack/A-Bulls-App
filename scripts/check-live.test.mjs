import assert from "node:assert/strict";
import test from "node:test";
import { LIVE_FIXTURE, fixtureFromFrozenCut, validateCutPage, validateReplay } from "./check-live.mjs";

const fixture = Object.freeze({
  ...LIVE_FIXTURE,
  from: 1_780_000_000,
  to: 1_780_003_600,
  signatures: Object.freeze(["1".repeat(88), "2".repeat(88)]),
});

const response = (overrides = {}) => ({
  ok: true,
  bundle: {
    subject: { wallets: [fixture.wallet], mint: fixture.mint, quoteMint: fixture.quoteMint },
    window: { from: fixture.from, to: fixture.to },
    eventCount: 2,
    events: [{ signature: fixture.signatures[0] }, { signature: fixture.signatures[1] }],
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
    () => validateReplay(response({ eventCount: 1, events: [{ signature: fixture.signatures[0] }] }), fixture),
    new RegExp(fixture.signatures[1]),
  );
});

test("saved Cut supplies exact retained timestamps and signatures", () => {
  const result = fixtureFromFrozenCut({
    ok: true,
    frozen: true,
    id: fixture.cutId,
    shareUrl: `/?cut=${fixture.cutId}`,
    verifyUrl: `/?cut=${fixture.cutId}`,
    manifest: {
      subject: { kind: "wallet-token", id: `${fixture.wallet}:${fixture.mint}` },
      coverage: { from: fixture.from, to: fixture.to },
      evidence: [
        { id: "entry", signature: fixture.signatures[0], blockTime: fixture.from },
        { id: "exit", signature: fixture.signatures[1], blockTime: fixture.to },
      ],
    },
  }, fixture);
  assert.deepEqual(result.signatures, fixture.signatures);
  assert.equal(result.from, fixture.from);
});

test("saved Cut accepts mixed evidence while keeping only replayable Solana receipts", () => {
  const result = fixtureFromFrozenCut({
    ok: true,
    frozen: true,
    id: fixture.cutId,
    shareUrl: `/?cut=${fixture.cutId}`,
    verifyUrl: `/?cut=${fixture.cutId}`,
    manifest: {
      subject: { kind: "wallet-token", id: `${fixture.wallet}:${fixture.mint}` },
      coverage: { from: fixture.from, to: fixture.to },
      evidence: [
        { id: "provider-context", signature: "placeholder", sourceReference: "provider:context" },
        { id: "entry", signature: fixture.signatures[0], blockTime: fixture.from },
      ],
    },
  }, fixture);
  assert.deepEqual(result.signatures, [fixture.signatures[0]]);
});

test("saved Cut rejects a mutable, mismatched, or out-of-window manifest", () => {
  assert.throws(() => fixtureFromFrozenCut({ ok: true, frozen: false }, fixture), /not frozen/);
  assert.throws(() => fixtureFromFrozenCut({ ok: true, frozen: true, id: "wrong" }, fixture), /different id/);
  assert.throws(() => fixtureFromFrozenCut({
    ok: true, frozen: true, id: fixture.cutId, shareUrl: `/?cut=${fixture.cutId}`, verifyUrl: `/?cut=${fixture.cutId}`,
    manifest: { subject: { kind: "wallet-token", id: `${fixture.wallet}:${fixture.mint}` }, coverage: { from: fixture.from, to: fixture.to }, evidence: [{ id: "late", signature: fixture.signatures[0], blockTime: fixture.to + 1 }] },
  }, fixture), /outside its coverage/);
  assert.throws(() => fixtureFromFrozenCut({
    ok: true, frozen: true, id: fixture.cutId, shareUrl: `/?cut=${fixture.cutId}`, verifyUrl: `/?cut=${fixture.cutId}`,
    manifest: { subject: { kind: "wallet-token", id: `${fixture.wallet}:${fixture.mint}` }, coverage: { from: fixture.from, to: fixture.to }, evidence: [{ id: "bad", signature: "placeholder", blockTime: fixture.from }] },
  }, fixture), /no retained Solana receipt/);
});

test("canonical /?cut= page must render frozen VERIFY disclosure", () => {
  assert.doesNotThrow(() => validateCutPage("VERIFY · Frozen Cut This viewer renders the frozen manifest only.", fixture));
  assert.throws(() => validateCutPage("Cut unavailable", fixture), /did not render/);
});
