import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cutSubjectFromHolding,
  focusedTraderWallet,
  formatIndexedPnl,
  holdingMintLabel,
  holdingsOverlayRows,
  holdingTokenLabel,
} from "./trader-holdings.ts";
import type { FieldSection, FocusedParticle } from "./types.ts";

const WALLET = "BWVR4KqS8eVkmKXCsb8cq76jJMN7FjWjCYxZtzGpYQnx";
const MINT = "97jCC4dL3ceKFqovn3gPKApKQ8hUYwJmCUV3m9d1pump";

function star(wallet?: string): FocusedParticle {
  return {
    id: "star:1",
    kind: "wallet",
    cosmicKind: "star",
    originGalaxyId: "pump-fun",
    category: "swap",
    observedAt: 1,
    verificationState: "observed",
    magnitudeBand: 1,
    metadata: wallet ? { wallet } : {},
  };
}

describe("focusedTraderWallet", () => {
  it("prefers a focused star wallet over Fomo trader-system fallback", () => {
    const section: FieldSection = { kind: "trader-system", label: "Fomo", handle: "x", wallet: WALLET, count: 3 };
    assert.equal(focusedTraderWallet(star(WALLET), section), WALLET);
    assert.equal(focusedTraderWallet(null, section), WALLET);
    assert.equal(focusedTraderWallet(star(""), { kind: "galaxy", label: "Field", count: 0 }), "");
    assert.equal(focusedTraderWallet(star("truncated"), section), WALLET);
  });
});

describe("indexed holdings labels", () => {
  it("never invents PnL and never uses a mint as the token name", () => {
    assert.deepEqual(formatIndexedPnl(null), { text: "PnL unavailable", known: false });
    assert.deepEqual(formatIndexedPnl(undefined), { text: "PnL unavailable", known: false });
    assert.equal(formatIndexedPnl(0).text, "+0.0000 SOL");
    assert.equal(formatIndexedPnl(-1.25).text, "-1.2500 SOL");
    assert.equal(holdingTokenLabel({ name: "Pons", symbol: "PONS" }), "Pons · PONS");
    assert.equal(holdingTokenLabel({ name: MINT, symbol: MINT }), "Token name unavailable");
  });

  it("renders API rows with null PnL instead of treating them as no holdings", () => {
    const rows = holdingsOverlayRows([
      {
        mint: MINT,
        name: null,
        symbol: null,
        matchedRealizedSol: null,
        observedInventory: 12,
        closedCount: 0,
        closedMatchedCount: 0,
        openCount: 1,
        lastObservedAt: 1,
        sourceKind: "observed",
        method: "bounded-fifo-observed-swaps-v1",
      },
      { mint: "not-a-mint", matchedRealizedSol: 4 },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.mint, MINT);
    assert.equal(rows[0]?.matchedRealizedSol, null);
    assert.equal(rows[0]?.openCount, 1);
    assert.deepEqual(formatIndexedPnl(rows[0]?.matchedRealizedSol), { text: "PnL unavailable", known: false });
    assert.equal(holdingMintLabel(MINT), "97jCC4…pump");
    assert.deepEqual(holdingsOverlayRows([]), []);
    assert.deepEqual(holdingsOverlayRows(null), []);
  });

  it("opens Cut only with a full wallet×mint pair", () => {
    assert.deepEqual(cutSubjectFromHolding(WALLET, { mint: MINT, name: "Pons", symbol: "PONS" }), {
      wallet: WALLET,
      mint: MINT,
      name: "Pons",
      symbol: "PONS",
    });
    assert.equal(cutSubjectFromHolding("short", { mint: MINT, name: null, symbol: null }), null);
  });
});
