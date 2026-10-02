import test from "node:test";
import assert from "node:assert/strict";
import { traderSigil, traderSigilPacked } from "./trader-sigil.ts";

test("trader sigils are deterministic, mirrored, and wallet-specific", () => {
  const a = traderSigil("G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy");
  const again = traderSigil("G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy");
  const b = traderSigil("6ug4s5uoG2dxycww9wBxo7kQq9NPzEf1ZSmGMT6M76Ni");
  assert.equal(a.packed, again.packed);
  assert.deepEqual(a.cells, again.cells);
  assert.notEqual(a.packed, b.packed);
  for (let y = 0; y < 5; y++) {
    assert.equal(a.cells[y * 5], a.cells[y * 5 + 4]);
    assert.equal(a.cells[y * 5 + 1], a.cells[y * 5 + 3]);
  }
  assert.ok(traderSigilPacked("abc") >= 0 && traderSigilPacked("abc") <= 0x7fff);
});
