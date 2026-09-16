import assert from "node:assert/strict";
import test from "node:test";
import { selectLiveEvidenceFixture, WSOL } from "./select-live-evidence-fixture.mjs";

const wallet = "9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU";
const mint = "5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump";
const signature = "1".repeat(88);

test("selects the first retained round with a replayable Solana receipt", () => {
  const fixture = selectLiveEvidenceFixture([{
    success: true,
    results: [
      { round_id: "bad", wallet, mint, from_ts: 1_780_000_000, to_ts: 1_780_000_100, signature: "placeholder" },
      { round_id: "good", wallet, mint, from_ts: 1_780_000_200, to_ts: 1_780_000_400, signature },
    ],
  }]);
  assert.deepEqual(fixture, { wallet, mint, quoteMint: WSOL, from: 1_780_000_200, to: 1_780_000_400, signatures: [signature] });
});

test("deduplicates receipts for one retained round", () => {
  const fixture = selectLiveEvidenceFixture({ results: [
    { round_id: "good", wallet, mint, from_ts: 1_780_000_200, to_ts: 1_780_000_400, signature },
    { round_id: "good", wallet, mint, from_ts: 1_780_000_200, to_ts: 1_780_000_400, signature },
  ] });
  assert.deepEqual(fixture.signatures, [signature]);
});

test("fails closed when production D1 has no replayable candidate", () => {
  assert.throws(() => selectLiveEvidenceFixture([{ success: true, results: [] }]), /no retained evidence candidates/);
  assert.throws(() => selectLiveEvidenceFixture([{ success: true, results: [
    { round_id: "bad", wallet, mint, from_ts: 1_780_000_000, to_ts: 1_780_000_100, signature: "placeholder" },
  ] }]), /no candidate with replayable Solana receipts/);
});
