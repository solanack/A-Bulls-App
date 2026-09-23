import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADVANCED_MODES, ANALYSIS_MODES, MODE_HINT, TOOL_TITLE } from "./types.ts";
import {
  heroSubjectLabel,
  inboundGalaxyFromSearch,
  inboundWorkspaceMode,
  looksLikeMint,
  needsSelectedTrade,
  primaryMenuIds,
  selectedTradeReady,
  subjectPrefillFromSearch,
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

  it("opens FrozenCutViewer for /?cut= without waiting on FieldOS or a prior trade", () => {
    assert.match(shell, /if\(inboundShareId\(\)\)setMode\("trickster"\)/);
    assert.match(shell, /setMode\(inboundShareId\(\)\?"trickster":event\.mode\)/);
    assert.match(shell, /setFieldUnavailable\(true\);if\(inboundShareId\(\)\)setMode\("trickster"\)/);
    assert.match(workspace, /verifyingCut/);
    assert.match(workspace, /trickster-read/);
    assert.match(workspace, /if\(mode==="trickster"&&verifyingCut\)/);
    assert.match(workspace, /FrozenCutViewer/);
    assert.match(workspace, /!tradeReady&&!verifyingCut/);
  });
});

const GALAXY_WALLET = "BWVR4KqS8eVkmKXCsb8cq76jJMN7FjWjCYxZtzGpYQnx";
const GALAXY_MINT = "97jCC4dL3ceKFqovn3gPKApKQ8hUYwJmCUV3m9d1pump";

describe("public galaxy deep-link", () => {
  it("accepts only current public Field galaxies", () => {
    assert.equal(inboundGalaxyFromSearch("?galaxy=afterbell"), "afterbell");
    assert.equal(inboundGalaxyFromSearch("?galaxy=FOMO"), "fomo");
    assert.equal(inboundGalaxyFromSearch("?galaxy=galaxy-zero"), "galaxy-zero");
    assert.equal(inboundGalaxyFromSearch("?galaxy=pons"), null);
    assert.equal(inboundGalaxyFromSearch("?galaxy=pump-fun"), null);
    assert.equal(inboundGalaxyFromSearch("?galaxy=solana-core"), null);
  });

  it("lets Cut and Replay intent win before a galaxy deep-link", () => {
    assert.equal(inboundWorkspaceMode(`?galaxy=afterbell&mode=replay&wallet=${GALAXY_WALLET}&mint=${GALAXY_MINT}`), "replay");
    assert.equal(inboundWorkspaceMode("?galaxy=afterbell&cut=ad2538ff000fcceb707d55d5", "ad2538ff000fcceb707d55d5"), "trickster");
    assert.match(shell, /inboundGalaxyFromSearch/);
    assert.match(shell, /const requestedGalaxy=inboundGalaxy\(\);if\(requestedGalaxy\)os\.setGalaxy\(requestedGalaxy\)/);
  });
});

describe("paste-proof wallet+mint deep-link", () => {
  it("reads wallet (mint optional) and lands in explore holdings, not Trickster", () => {
    assert.deepEqual(
      subjectPrefillFromSearch(`?mode=trickster&wallet=${GALAXY_WALLET}&mint=${GALAXY_MINT}`),
      { wallet: GALAXY_WALLET, mint: GALAXY_MINT, mode: "explore" },
    );
    assert.deepEqual(
      subjectPrefillFromSearch(`?w=${GALAXY_WALLET}&m=${GALAXY_MINT}`),
      { wallet: GALAXY_WALLET, mint: GALAXY_MINT, mode: "explore" },
    );
    assert.deepEqual(subjectPrefillFromSearch(`?wallet=${GALAXY_WALLET}`), {
      wallet: GALAXY_WALLET,
      mint: "",
      mode: "explore",
    });
    assert.equal(subjectPrefillFromSearch(`?mode=replay&wallet=${GALAXY_WALLET}&mint=${GALAXY_MINT}`)?.mode, "replay");
    assert.equal(subjectPrefillFromSearch(`?wallet=${GALAXY_WALLET.slice(0, 20)}&mint=${GALAXY_MINT}`), null);
    assert.deepEqual(subjectPrefillFromSearch(`?wallet=${GALAXY_WALLET}&mint=`), {
      wallet: GALAXY_WALLET,
      mint: "",
      mode: "explore",
    });
    assert.equal(subjectPrefillFromSearch("?mode=trickster"), null);
    assert.equal(looksLikeMint(GALAXY_WALLET), true);
    assert.equal(looksLikeMint(GALAXY_WALLET.slice(0, 20)), false);
    assert.equal(inboundWorkspaceMode(`?mode=trickster&wallet=${GALAXY_WALLET}&mint=${GALAXY_MINT}`), "explore");
    assert.equal(inboundWorkspaceMode(`?mode=replay&wallet=${GALAXY_WALLET}&mint=${GALAXY_MINT}`), "replay");
    assert.equal(inboundWorkspaceMode(`?cut=ad2538ff000fcceb707d55d5&wallet=${GALAXY_WALLET}`, "ad2538ff000fcceb707d55d5"), "trickster");
  });

  it("keeps Replay SHARE STATE and Cut VERIFY, without forcing Trickster from wallet+mint", () => {
    assert.match(shell, /inboundPrefill\(\)/);
    assert.match(shell, /subjectPrefillFromSearch/);
    assert.match(shell, /inboundWorkspaceMode/);
    assert.match(shell, /else if\(inboundMode\(\)==="replay"\)setMode\("replay"\)/);
    assert.match(shell, /else if\(inboundPrefill\(\)\?\.mode==="replay"\)os\.setMode\("replay"\)/);
    assert.match(shell, /setMode\(inboundShareId\(\)\?"trickster":event\.mode\)/);
    assert.doesNotMatch(shell, /inboundPrefill\(\)\?\.mode\?\?event\.mode/);
    assert.match(shell, /workspaceMint=cutSubject\?\.mint\|\|searchPrefill\?\.mint\|\|focusedMint/);\n    assert.match(shell, /askMint=\{workspaceMint\}/);\n    assert.doesNotMatch(shell, /workspaceMint=.*askPrefill/);
    assert.match(shell, /askWallet=\{cutSubject\?\.wallet\|\|searchPrefill\?\.wallet\|\|contextWallet\}/);
    assert.match(workspace, /subjectPrefillFromSearch/);
    assert.match(workspace, /inboundPrefill\?\.wallet/);
    assert.match(workspace, /inboundPrefill\?\.mint/);
    assert.match(workspace, /looksLikeMint\(wallet\)&&looksLikeMint\(mint\)/);
    assert.match(workspace, /open:Boolean\(inboundPrefill\)/);
    assert.match(workspace, /if\(mode==="trickster"&&verifyingCut\)/);
  });

  it("does not let wallet+mint prefill steal /?cut= VERIFY hydrate", () => {
    assert.equal(subjectPrefillFromSearch(`?cut=ad2538ff000fcceb707d55d5&wallet=${GALAXY_WALLET}&mint=${GALAXY_MINT}`)?.wallet, GALAXY_WALLET);
    assert.equal(inboundWorkspaceMode(`?cut=ad2538ff000fcceb707d55d5`, "ad2538ff000fcceb707d55d5"), "trickster");
    assert.match(shell, /if\(inboundShareId\(\)\)setMode\("trickster"\)/);
    assert.match(shell, /if\(inboundShareId\(\)\)os\.setMode\("trickster"\)/);
    assert.match(workspace, /verifyingCut=mode==="trickster"&&Boolean\(inboundShareId\)/);
    assert.match(workspace, /FrozenCutViewer/);
  });
});

describe("one-tap prefill vs Pick a trade first", () => {
  it("empty Replay/Cut gate still mounts visible wallet and mint inputs", () => {
    const pickStart = workspace.indexOf("if(!tradeReady&&!verifyingCut");
    assert.ok(pickStart >= 0);
    const pickBlock = workspace.slice(pickStart, workspace.indexOf("if(mode===\"replay\")"));
    assert.match(pickBlock, /Pick a trade first, or enter a public wallet and token mint/);
    assert.match(pickBlock, /DetailsFold/);
    assert.match(pickBlock, /<DetailsFold \{\.\.\.foldProps\} open\/>/);
    assert.match(pickBlock, /mode==="compare"\?<label>Second trader/);
    assert.doesNotMatch(pickBlock, /FrozenCutViewer/);
    assert.match(workspace, /needsSelectedTrade\(mode\)/);
    assert.match(workspace, /label>Public wallet/);
    assert.match(workspace, /placeholder="Wallet address"/);
    assert.match(workspace, /label>Token mint/);
    assert.match(workspace, /placeholder="Token mint"/);
    assert.match(workspace, /open\?<div className="universe-details">/);
    assert.match(workspace, /if\(mode==="trickster"&&verifyingCut\)/);
    assert.match(workspace, /FrozenCutViewer/);
  });

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

describe("trader-select holdings → Make a Cut climax", () => {
  const overlay = readFileSync(new URL("../../components/trader-holdings-cut.tsx", import.meta.url), "utf8");
  const holdings = readFileSync(new URL("../universe-data/research-index-client.ts", import.meta.url), "utf8");
  it("shows indexed holdings + Make a Cut? on a focused trader star", () => {
    assert.match(shell, /TraderHoldingsCutPanel/);
    assert.match(shell, /holdingsWalletFromContext/);
    assert.match(shell, /holdingsHighlightMint/);
    assert.match(shell, /showHoldings/);
    assert.match(shell, /selectMode\("trickster"\)/);
    assert.match(shell, /inboundWallet:searchPrefill\?\.wallet/);
    assert.match(shell, /verifyingCut:Boolean\(inboundShareId\(\)\)/);
    assert.match(shell, /mode==="explore"/);
    assert.match(overlay, /Make a Cut\?/);
    assert.match(overlay, /Choose a held token/);
    assert.match(overlay, /getTraderHoldings/);
    assert.match(overlay, /holdingsOverlayRows/);
    assert.match(overlay, /formatIndexedPnl/);
    assert.match(overlay, /holdingMintLabel/);
    assert.match(overlay, /No PnL was invented/);
    assert.match(overlay, /Empty coverage stays empty/);
    assert.match(overlay, /missing PnL stays unavailable/);
    assert.doesNotMatch(overlay, /reportedPnlUsd/);
    assert.doesNotMatch(overlay, /helius/i);
    assert.match(holdings, /research\/holdings/);
    assert.match(director, /autoSelectReceiptIds/);
    assert.match(director, /CUT_RECEIPT_MAX/);
    assert.match(director, /chosenIds/);
    const field = readFileSync(new URL("./particle-field.ts", import.meta.url), "utf8");
    const tokenSystem = readFileSync(new URL("./token-system.ts", import.meta.url), "utf8");
    assert.match(field, /systemRole === "holder-star"/);
    assert.match(field, /particleHasWallet/);
    assert.match(tokenSystem, /systemRole:"holder-star",interactive:true/);
  });

  it("opens the existing Replay chart + Trickster share path, not a second video system", () => {
    assert.match(workspace, /ReplayWorkspace bundle=\{replayBundle\} waitingMint=\{mint\} autoPlay/);
    assert.match(workspace, /TricksterDirector bundle=\{replayBundle\}/);
    assert.match(workspace, /FrozenCutViewer/);
    assert.match(director, /Share the 9:16 receipt card/);
    assert.match(director, /setVisible/);
    assert.doesNotMatch(workspace, /mediabunny/i);
    assert.doesNotMatch(director, /WebCodecs/);
  });
});


describe("Afterbell identity-first trader details", () => {
  it("keeps rank separate from identity and requires an explicit mint for deep tools", () => {
    assert.match(shell, /AfterbellTraderDetailSheet/);
    assert.match(shell, /UNIQUE AFTER-CLOSE TX/);
    assert.match(shell, /Identity source:/);
    assert.match(shell, /Select an xStock PLANET or retained trade COMET/);
    assert.match(shell, /No mint is guessed/);
    assert.match(shell, /A Bulls App is not a broker/);
    assert.doesNotMatch(shell, /AFTERBELL \#\$\{afterbellRank/);
  });
});
