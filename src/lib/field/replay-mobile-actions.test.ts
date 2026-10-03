import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { chromium } from "playwright";

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
    assert.match(holdings, /\.trader-holdings__row button\{[^}]*min-height:44px/);
    assert.match(holdings, /missing PnL stays —/);
    assert.match(holdings, />VERIFY</);
    assert.doesNotMatch(holdings, /font:(?:500|600|700) (?:8|10)px/);
    assert.match(tokens, /\.trader-holdings__empty/);
    assert.match(tokens, /\.trader-holdings__disclosure/);
  });

  it("does not duplicate Tailwind's sr-only utility in base", () => {
    assert.doesNotMatch(styles, /\.sr-only\s*\{/);
    assert.match(cutPanel, /className="sr-only"/);
  });
});

describe("Replay footer measured layout", () => {
  it("keeps every action inside 360, 390, and 430 and at least 44px tall", async (t) => {
    const browser = await launchReplayBrowser();
    if (!browser) {
      t.skip("Neither system Chrome nor Playwright Chromium is installed");
      return;
    }
    const css = `${tokens}\n${director}\n*{box-sizing:border-box}html,body{margin:0}`;
    const html = `<!doctype html><html><head><style>${css}</style></head><body>
      <section class="rs" aria-label="Replay">
        <footer class="rs-third">
          <div class="rs-controls">
            <div class="rs-transport">
              <button type="button" class="rs-icon" aria-label="Previous print"></button>
              <button type="button" class="rs-play" aria-label="Play"></button>
              <button type="button" class="rs-icon" aria-label="Next print"></button>
              <button type="button" class="rs-speed" aria-label="Playback speed">1×</button>
            </div>
            <div class="rs-control-actions">
              <button type="button" class="rs-pill">WHAT-IF</button>
              <button type="button" class="rs-pill rs-pill--versus">VERSUS</button>
              <button type="button" class="rs-pill"><svg width="13" height="13" aria-hidden="true"></svg> SHARE</button>
              <button type="button" class="rs-pill rs-pill--cut">CUT</button>
            </div>
          </div>
        </footer>
      </section>
    </body></html>`;
    try {
      const page = await browser.newPage();
      for (const width of [360, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        await page.setContent(html, { waitUntil: "load" });
        const boxes = await page.locator(".rs-control-actions .rs-pill").evaluateAll((nodes) => nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { text: node.textContent?.replace(/\s+/g, " ").trim() ?? "", x: rect.x, right: rect.right, bottom: rect.bottom, height: rect.height };
        }));
        assert.deepEqual(boxes.map((box) => box.text), ["WHAT-IF", "VERSUS", "SHARE", "CUT"], `${width}px labels`);
        for (const box of boxes) {
          assert.ok(box.height >= 44, `${width}px ${box.text} height ${box.height}`);
          assert.ok(box.x >= -0.5, `${width}px ${box.text} starts at ${box.x}`);
          assert.ok(box.right <= width + 0.5, `${width}px ${box.text} ends at ${box.right}`);
          assert.ok(box.bottom <= 844.5, `${width}px ${box.text} bottom ${box.bottom}`);
        }
      }
    } finally {
      await browser.close();
    }
  });
});

async function launchReplayBrowser() {
  const args = ["--no-sandbox", "--disable-dev-shm-usage"];
  try {
    return await chromium.launch({ channel: "chrome", args });
  } catch (error) {
    if (!/channel|executable|not found|ENOENT/i.test(String(error))) throw error;
  }
  if (!existsSync(chromium.executablePath())) return null;
  return chromium.launch({ args });
}
