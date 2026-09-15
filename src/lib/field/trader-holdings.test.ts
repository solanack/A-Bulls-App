import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cutSubjectFromHolding,
  focusedTraderWallet,
  formatIndexedPnl,
  holdingMintLabel,
  holdingsHighlightMint,
  holdingsOverlayRows,
  holdingsWalletFromContext,
  holdingTokenLabel,
  isWalletStar,
} from "./trader-holdings.ts";
import type { FieldSection, FocusedParticle } from "./types.ts";

const WALLET = "BWVR4KqS8eVkmKXCsb8cq76jJMN7FjWjCYxZtzGpYQnx";
const SMOKE_WALLET = "7BY7z7wJkP9DSLuTFKsfdBwkEwLqyr1syMQn8hAgNhiy";
const MINT = "97jCC4dL3ceKFqovn3gPKApKQ8hUYwJmCUV3m9d1pump";

function star(wallet?: string, extra: Record<string, unknown> = {}): FocusedParticle {
  return {
    id: "star:1",
    kind: "wallet",
    cosmicKind: "star",
    originGalaxyId: "pump-fun",
    category: "swap",
    observedAt: 1,
    verificationState: "observed",
    magnitudeBand: 1,
    metadata: wallet ? { wallet, ...extra } : { ...extra },
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

  it("reads holder STAR wallets inside a token-system (no section wallet)", () => {
    const tokenSystem: FieldSection = { kind: "token-system", label: "PONS", mint: MINT, count: 8 };
    const holder = star(SMOKE_WALLET, { parentMint: MINT, systemRole: "holder-star" });
    assert.equal(isWalletStar(holder), true);
    assert.equal(focusedTraderWallet(holder, tokenSystem), SMOKE_WALLET);
    assert.equal(focusedTraderWallet(star("", { solanaWallet: SMOKE_WALLET }), tokenSystem), SMOKE_WALLET);
    assert.equal(focusedTraderWallet(null, tokenSystem), "");
    assert.equal(
      focusedTraderWallet(
        { ...star(SMOKE_WALLET), cosmicKind: "planet", kind: "wallet" },
        tokenSystem,
      ),
      SMOKE_WALLET,
    );
  });
});

describe("holdings overlay entry", () => {
  it("uses inbound ?wallet= in explore and ignores it on VERIFY", () => {
    assert.equal(
      holdingsWalletFromContext({ focus: null, inboundWallet: SMOKE_WALLET }),
      SMOKE_WALLET,
    );
    assert.equal(
      holdingsWalletFromContext({ focus: null, inboundWallet: SMOKE_WALLET, verifyingCut: true }),
      "",
    );
    assert.equal(
      holdingsWalletFromContext({ focus: star(WALLET), inboundWallet: SMOKE_WALLET }),
      WALLET,
    );
  });

  it("highlights parent/token-system mint for a holder STAR, else inbound mint", () => {
    const tokenSystem: FieldSection = { kind: "token-system", label: "PONS", mint: MINT, count: 8 };
    assert.equal(
      holdingsHighlightMint({ focus: star(SMOKE_WALLET, { parentMint: MINT }), fieldSection: tokenSystem }),
      MINT,
    );
    assert.equal(
      holdingsHighlightMint({ focus: star(SMOKE_WALLET), fieldSection: tokenSystem }),
      MINT,
    );
    assert.equal(holdingsHighlightMint({ focus: null, inboundMint: MINT }), MINT);
    assert.equal(holdingsHighlightMint({ focus: null, inboundMint: "" }), "");
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
