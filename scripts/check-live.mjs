import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const LIVE_FIXTURE = Object.freeze({
  wallet: "7BY7z7wJkP9DSLuTFKsfdBwkEwLqyr1syMQn8hAgNhiy",
  mint: "97jCC4dL3ceKFqovn3gPKApKQ8hUYwJmCUV3m9d1pump",
  quoteMint: "So11111111111111111111111111111111111111112",
});

const requiredInteger = (name, value) => {
  const parsed = Number(value);
  assert.ok(Number.isSafeInteger(parsed) && parsed > 0, `${name} must be a positive Unix timestamp`);
  return parsed;
};

export function fixtureFromEnv(env = process.env) {
  const signatures = String(env.LIVE_REPLAY_EXPECTED_SIGNATURES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  assert.ok(signatures.length > 0, "LIVE_REPLAY_EXPECTED_SIGNATURES must pin retained receipt signatures");
  const from = requiredInteger("LIVE_REPLAY_FROM", env.LIVE_REPLAY_FROM);
  const to = requiredInteger("LIVE_REPLAY_TO", env.LIVE_REPLAY_TO);
  assert.ok(to >= from, "LIVE_REPLAY_TO must not precede LIVE_REPLAY_FROM");
  return Object.freeze({ ...LIVE_FIXTURE, from, to, signatures: Object.freeze(signatures) });
}

const asObject = (value, message) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), message);
  return value;
};

export function validateReplay(body, fixture) {
  assert.equal(body?.ok, true, `Replay failed: ${body?.error || "not ok"}`);
  const bundle = asObject(body.bundle, "Replay response is missing its bundle");
  const subject = asObject(bundle.subject, "Replay response is missing its subject");
  assert.deepEqual(subject.wallets, [fixture.wallet], "Replay returned a different wallet");
  assert.equal(subject.mint, fixture.mint, "Replay returned a different mint");
  assert.equal(subject.quoteMint, fixture.quoteMint, "Replay returned a different quote mint");
  assert.equal(bundle.window?.from, fixture.from, "Replay returned a different start time");
  assert.equal(bundle.window?.to, fixture.to, "Replay returned a different end time");
  assert.ok(Array.isArray(bundle.events) && bundle.events.length > 0, "Known retained Replay returned no events");
  assert.equal(bundle.eventCount, bundle.events.length, "Replay eventCount does not match returned events");
  const receipts = new Set(bundle.events.map((event) => event?.signature).filter(Boolean));
  for (const signature of fixture.signatures) {
    assert.ok(receipts.has(signature), `Replay is missing expected receipt ${signature}`);
  }
  return bundle;
}

export function validateHoldings(body, fixture) {
  assert.equal(body?.ok, true, `Holdings failed: ${body?.error || "not ok"}`);
  assert.equal(body.wallet, fixture.wallet, "Holdings returned a different wallet");
  assert.ok(Array.isArray(body.items) && body.items.length > 0, "Known active wallet returned no holdings");
  assert.ok(
    body.items.some((item) => item?.mint === fixture.mint),
    "Known active wallet holdings do not include the retained fixture token",
  );
}

export function validateCandles(bundle, fixture) {
  assert.ok(Array.isArray(bundle.candles) && bundle.candles.length > 0, "Known OHLC fixture returned no candles");
  for (const candle of bundle.candles) {
    assert.ok(Number.isFinite(candle?.timestamp), "Fixture candle is missing its timestamp");
    assert.ok(Number.isFinite(candle?.open) && Number.isFinite(candle?.high), "Fixture candle is missing OHLC values");
    assert.ok(Number.isFinite(candle?.low) && Number.isFinite(candle?.close), "Fixture candle is missing OHLC values");
  }
}

export async function runLiveChecks({
  origin = "https://abullsapp.com",
  expected,
  fixture,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const get = async (path, init = {}) => {
    const response = await fetchImpl(`${origin}${path}`, {
      ...init,
      headers: { "cache-control": "no-cache", ...(init.headers || {}) },
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
    return response;
  };
  let release = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    release = await (await get(`/release.json?commit=${expected}&attempt=${attempt}`)).json();
    if (release?.commit === expected) break;
    if (attempt < 11) await sleep(5000);
  }
  assert.equal(release?.commit, expected, "The public domain is serving a different frontend release");

  const document = await (await get("/")).text();
  assert.match(document, /Galaxy Zero|A Bulls/i, "Application HTML is missing");
  const assets = [...new Set([...document.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)(?:\?[^" ]*)?"/g)].map((match) => match[1]))];
  assert.ok(assets.length, "Application JavaScript references are missing");
  for (const path of assets) {
    const asset = await get(path);
    assert.match(asset.headers.get("content-type") || "", /javascript/, "JavaScript has incorrect MIME type");
  }

  for (const path of [
    "/api/health",
    "/api/intelligence/field/resolve?query=So11111111111111111111111111111111111111112",
    "/api/intelligence/field/resolve?query=0x39dbed3a2bd333467115de45665cc57f813c4571",
    "/api/intelligence/field/snapshot?galaxy=solana-core&window=300",
    "/api/intelligence/field/v0/tokens?limit=10",
    "/api/intelligence/pons/galaxy",
    "/api/intelligence/fomo/galaxy",
  ]) {
    const response = await get(path);
    assert.match(response.headers.get("content-type") || "", /application\/json/);
    const body = await response.json();
    assert.equal(body.ok, true, `${path}: ${body.error || "not ok"}`);
    if (path.includes("/resolve")) {
      assert.equal(body.state, "resolved");
      assert.ok(Number.isFinite(body.market?.priceUsd), "Live token price is unavailable");
    }
  }

  const replayResponse = await get("/api/intelligence/replay-bundle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet: fixture.wallet,
      mint: fixture.mint,
      quoteMint: fixture.quoteMint,
      from: fixture.from,
      to: fixture.to,
      bucketSeconds: 60,
      limit: 500,
    }),
  });
  const replay = validateReplay(await replayResponse.json(), fixture);
  validateCandles(replay, fixture);

  const holdingsPath = `/api/intelligence/research/holdings?wallet=${encodeURIComponent(fixture.wallet)}&limit=10`;
  validateHoldings(await (await get(holdingsPath)).json(), fixture);
  console.log("Live release, API, retained Replay receipts, OHLC, and active-subject holdings checks passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const expected = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  await runLiveChecks({ expected, fixture: fixtureFromEnv() });
}
