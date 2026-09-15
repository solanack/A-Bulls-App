import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADVANCED_MODES, ANALYSIS_MODES, MODE_HINT, TOOL_TITLE } from "./types.ts";
import {
  heroSubjectLabel,
  looksLikeMint,
  needsSelectedTrade,
  primaryMenuIds,
  selectedTradeReady,
  toolHint,
  toolTitle,
} from "./ux-simplify.ts";
import { duelBarRatio, statusBadge } from "../../components/colosseum-metrics-helpers.ts";

const shell = readFileSync(new URL("../../components/app-shell.tsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../components/universe-workspace.tsx", import.meta.url), "utf8");
const director = readFileSync(new URL("../../components/trickster-director.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

describe("UX simplify pack — Cut-first demo menu", () => {
  it("keeps the slim primary menu ≤4 with Make a Cut first, not What-If/Compare", () => {
    assert.ok(ANALYSIS_MODES.length <= 4);
    assert.equal(ANALYSIS_MODES[0]?.id, "trickster");
    assert.equal(ANALYSIS_MODES[0]?.label, "Make a Cut");
    assert.deepEqual(primaryMenuIds(), ["trickster", "replay", "evidence", "explore"]);
    assert.ok(!ANALYSIS_MODES.some((item) => item.id === "what-if" || item.id === "compare"));
    assert.ok(ADVANCED_MODES.some((item) => item.id === "what-if"));
    assert.ok(ADVANCED_MODES.some((item) => item.id === "compare"));
    assert.match(shell, /MENU_PRIMARY=ANALYSIS_MODES/);
    assert.match(shell, /<summary>Advanced<\/summary>/);
    assert.match(shell, /label:"WATCHLIST"/);
    assert.match(shell, /const MENU_ITEMS/);
  });

  it("uses plain titles/hints on Cut, Replay, Evidence, What-If, and Compare", () => {
    assert.equal(toolTitle("trickster"), "Make a Cut");
    assert.equal(toolHint("trickster"), "Share the story with receipts");
    assert.equal(MODE_HINT.trickster, "Share the story with receipts");
    assert.equal(TOOL_TITLE.replay, "Watch this trade on the chart");
    assert.equal(MODE_HINT.replay, "Watch this trade on the chart");
    assert.equal(TOOL_TITLE.evidence, "Receipts for this trade");
    assert.equal(MODE_HINT.evidence, "Receipts for this trade");
    assert.equal(TOOL_TITLE["what-if"], "What if you held instead?");
    assert.equal(MODE_HINT["what-if"], "What if you held instead?");
    assert.equal(TOOL_TITLE.compare, "Compare two traders side by side");
    assert.equal(MODE_HINT.compare, "Compare two traders side by side");
    assert.match(director, /Make a Cut/);
    assert.match(director, /VERIFY · Frozen Cut/);
    assert.match(director, /Share the 9:16 receipt card/);
    assert.match(workspace, /Pick a trade first/);
    assert.match(workspace, /verifyingCut/);
    assert.match(workspace, /<summary>Details<\/summary>/);
    assert.match(workspace, /So11111111111111111111111111111111111111112/);
  });
});

describe("one-tap prefill vs Pick a trade first", () => {
  it("requires a wallet×mint trade for Replay, Cut, and What-If", () => {
    for (const mode of ["replay", "trickster", "what-if"] as const) {
      assert.equal(needsSelectedTrade(mode), true);
      assert.equal(selectedTradeReady(mode, { wallet: "", mint: "" }), false);
      assert.equal(selectedTradeReady(mode, { wallet: "Wallet111", mint: "" }), false);
      assert.equal(selectedTradeReady(mode, { wallet: "", mint: "Mint111" }), false);
      assert.equal(selectedTradeReady(mode, { wallet: "Wallet111", mint: "Mint111" }), true);
    }
  });

  it("lets Evidence use a focused receipt or a mint, and Compare use one trader", () => {
    assert.equal(selectedTradeReady("evidence", { wallet: "", mint: "", hasEvidence: true }), true);
    assert.equal(selectedTradeReady("evidence", { wallet: "", mint: "Mint111" }), true);
    assert.equal(selectedTradeReady("evidence", { wallet: "", mint: "", hasEvidence: false }), false);
    assert.equal(selectedTradeReady("compare", { wallet: "Wallet111", mint: "" }), true);
    assert.equal(selectedTradeReady("compare", { wallet: "", mint: "Mint111" }), false);
  });
});

describe("hero name/symbol never shows a full mint", () => {
  it("prefers name · symbol and rejects mint-shaped values", () => {
    assert.equal(heroSubjectLabel({ name: "Pons", symbol: "PONS" }), "Pons · PONS");
    assert.equal(heroSubjectLabel({ name: "PONS", symbol: "PONS" }), "PONS");
    assert.equal(heroSubjectLabel({ symbol: "BONK" }), "BONK");
    const mint = "So11111111111111111111111111111111111111112";
    assert.equal(looksLikeMint(mint), true);
    assert.equal(heroSubjectLabel({ name: mint, symbol: mint }), "");
    assert.equal(heroSubjectLabel({ name: mint, symbol: "WSOL" }), "WSOL");
    assert.ok(!heroSubjectLabel({ name: mint, symbol: "WSOL" }).includes(mint));
  });
});

describe("no regress — INDEXED vs DEMO, missing≠zero, What-If colors", () => {
  it("keeps honest store badges", () => {
    assert.equal(statusBadge("d1"), "INDEXED");
    assert.equal(statusBadge("memory-fallback"), "DEMO");
    assert.equal(statusBadge(undefined), "DEMO");
  });

  it("does not zero-fill Compare gaps", () => {
    assert.equal(duelBarRatio(null, 10).leading, "gap");
    assert.equal(duelBarRatio(4, null).leading, "gap");
  });

  it("keeps What-If actual orange and hold blue", () => {
    assert.match(styles, /\.colosseum-diverge__actual \{ stroke: #ff8a3d; \}/);
    assert.match(styles, /\.colosseum-diverge__hold \{ stroke: #4da6ff;/);
    assert.doesNotMatch(styles, /helius\.xyz/i);
    assert.doesNotMatch(workspace, /helius/i);
  });
});
