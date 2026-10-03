import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const studio = readFileSync(new URL("../../components/replay-studio.tsx", import.meta.url), "utf8");
const director = readFileSync(new URL("../../components/replay-director.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../../design-tokens.css", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const holdings = readFileSync(new URL("../../components/trader-holdings-cut.tsx", import.meta.url), "utf8");
const cutPanel = readFileSync(new URL("../../components/replay-cut-panel.tsx", import.meta.url), "utf8");

describe("Replay phone action row", () => {
  it("keeps WHAT-IF, VERSUS, SHARE, and CUT in a wrapping cluster", () => {
    assert.match(studio, /className="rs-transport"/);
    assert.match(studio, /className="rs-control-actions"/);
    assert.match(studio, />WHAT-IF</);
    assert.match(studio, />VERSUS</);
    assert.match(studio, /SHARE/);
    assert.match(studio, />CUT</);
    assert.doesNotMatch(studio, /rs-spacer/);
    assert.match(tokens, /\.rs-controls\{display:flex;align-items:center;flex-wrap:wrap/);
    assert.match(director, /@media\(max-width:560px\)/);
    assert.match(director, /\.rs\.rs \.rs-control-actions \{ flex: 1 1 100%;/);
    assert.match(director, /min-height: 44px/);
  });
});

describe("Void Glass 44px targets and 11px floor", () => {
  it("raises the controls QA measured under 44px", () => {
    assert.equal(tokens.match(/gz-search button\{height:44px/g)?.length, 2);
    assert.doesNotMatch(tokens, /gz-search button\{height:40px/);
    assert.match(tokens, /\.rs-act\{height:44px;min-height:44px/);
    assert.match(tokens, /\.fs-remove\{width:44px;height:44px/);
    assert.match(tokens, /\.fs-empty-row button\{min-height:44px/);
    assert.match(tokens, /\.fs-actions button\{flex:1 1 0;min-width:0;min-height:44px/);
    assert.match(tokens, /\.rs-pill\{height:44px;min-height:44px/);
    assert.match(tokens, /\.rs-speed\{min-width:44px;height:44px;min-height:44px/);
  });

  it("keeps trader holdings copy on the 11px floor and rows at 44px", () => {
    assert.match(holdings, /\.trader-holdings__empty\{[^}]*font:500 11px/);
    assert.match(holdings, /\.trader-holdings__disclosure\{[^}]*font:500 11px/);
    assert.match(holdings, /\.trader-holdings__row\{[^}]*min-height:44px/);
    assert.doesNotMatch(holdings, /font:(?:500|600|700) (?:8|10)px/);
    assert.match(tokens, /\.trader-holdings__empty/);
    assert.match(tokens, /\.trader-holdings__disclosure/);
  });

  it("does not duplicate Tailwind's sr-only utility in base", () => {
    assert.doesNotMatch(styles, /\.sr-only\s*\{/);
    assert.match(cutPanel, /className="sr-only"/);
  });
});
