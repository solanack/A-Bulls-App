#!/usr/bin/env node
// Fails the release when either golden Replay fixture stops reopening on the public origin.
// Usage: node scripts/check-golden-fixtures.mjs [origin] [--api-only|--browser-only]
import { chromium } from "playwright";
import { productionOrigins } from "./deployment-origins.mjs";
import { GOLDEN_FIXTURES, goldenBundleVerdict, goldenReplayPath, goldenReplayRequest } from "./golden-fixtures.mjs";

const args = process.argv.slice(2);
const apiOnly = args.includes("--api-only"), browserOnly = args.includes("--browser-only");
const origin = String(args.find(arg => !arg.startsWith("--")) || process.env.A_BULLS_ORIGIN || productionOrigins.public).replace(/\/$/, "");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchBundle(fixture) {
  let last = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(`${origin}/api/intelligence/replay-bundle`, { method: "POST", headers: { "content-type": "application/json", "cache-control": "no-cache" }, body: JSON.stringify(goldenReplayRequest(fixture)), signal: AbortSignal.timeout(45_000) });
      let body = null;
      try { body = await response.json(); } catch { body = { ok: false, error: "invalid_json_response" }; }
      last = goldenBundleVerdict(fixture, response.status, body);
      if (last.ok || response.status === 404) return last;
    } catch (error) {
      last = { id: fixture.id, ok: false, problems: [String(error?.message || error)] };
    }
    await sleep(5000 * (attempt + 1));
  }
  return last;
}

async function openReplay(browser, fixture, viewport) {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(String(error?.message || error)));
  const url = origin + goldenReplayPath(fixture);
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const http = response?.status() ?? 0;
  let status = "missing", bolts = 0, text = "";
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    ({ status, bolts, text } = await page.evaluate(() => {
      const studio = document.querySelector('section.rs[aria-label="Replay"]');
      return { status: studio?.getAttribute("data-status") ?? "missing", bolts: (globalThis.__ABULLS_BOLTS ?? []).length, text: document.body.innerText };
    }));
    if (status === "ready" && bolts > 0) break;
    if (status === "error" || status === "empty") break;
    await sleep(1500);
  }
  const problems = [];
  if (http === 404) problems.push("replay URL returned 404");
  else if (http !== 200) problems.push(`replay URL returned HTTP ${http}`);
  if (status !== "ready") problems.push(`Replay Studio ended in "${status}"`);
  if (bolts < 1) problems.push("no buy/sell bolts drawn");
  if (/Galaxy Zero/i.test(text)) problems.push("Galaxy Zero copy is visible");
  if (/\bDEMO\b/.test(text)) problems.push("DEMO brand state is visible");
  if (pageErrors.length) problems.push(`page errors: ${pageErrors.join(" | ")}`);
  await page.close();
  return { id: fixture.id, viewport: `${viewport.width}x${viewport.height}`, http, status, bolts, ok: problems.length === 0, problems };
}

const api = [];
if (!browserOnly) for (const fixture of GOLDEN_FIXTURES) api.push(await fetchBundle(fixture));
const browserRows = [];
if (!apiOnly) {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    for (const fixture of GOLDEN_FIXTURES) for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) browserRows.push(await openReplay(browser, fixture, viewport));
  } finally {
    await browser.close();
  }
}
const ok = [...api, ...browserRows].every(row => row?.ok);
console.log(JSON.stringify({ origin, ok, api, browser: browserRows }, null, 2));
if (!ok) {
  for (const row of [...api, ...browserRows]) if (!row?.ok) console.error(`::error::Golden fixture ${row?.id}${row?.viewport ? ` @ ${row.viewport}` : ""}: ${(row?.problems ?? ["unknown failure"]).join("; ")}`);
  process.exit(1);
}
