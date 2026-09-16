import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const LIVE_FIXTURE = Object.freeze({
  cutId: "ad2538ff000fcceb707d55d5",
  wallet: "9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU",
  mint: "5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump",
  quoteMint: "So11111111111111111111111111111111111111112",
});
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOLANA_SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

const requiredInteger = (name, value) => {
  const parsed = Number(value);
  assert.ok(Number.isSafeInteger(parsed) && parsed > 0, `${name} must be a positive Unix timestamp`);
  return parsed;
};

const asObject = (value, message) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), message);
  return value;
};

export function fixtureFromFrozenCut(body, expected = LIVE_FIXTURE) {
  assert.equal(body?.ok, true, `Frozen Cut failed: ${body?.error || "not ok"}`);
  assert.equal(body?.frozen, true, "Saved Cut is not frozen");
  assert.equal(body?.id, expected.cutId, "Saved Cut returned a different id");
  assert.equal(body?.shareUrl, `/?cut=${expected.cutId}`, "Saved Cut has a non-canonical share URL");
  assert.equal(body?.verifyUrl, body.shareUrl, "Saved Cut VERIFY URL diverges from its share URL");
  const manifest = asObject(body.manifest, "Saved Cut response is missing its manifest");
  assert.equal(manifest.subject?.kind, "wallet-token", "Saved Cut has a different subject kind");
  assert.equal(manifest.subject?.id, `${expected.wallet}:${expected.mint}`, "Saved Cut has a different subject");
  assert.ok(Array.isArray(manifest.evidence), "Saved Cut manifest is missing its evidence list");
  return Object.freeze({ ...expected, manifest });
}

export function validateEvidenceFixture(value) {
  const fixture = asObject(value, "Retained evidence fixture is missing");
  const wallet = String(fixture.wallet || "").trim();
  const mint = String(fixture.mint || "").trim();
  const quoteMint = String(fixture.quoteMint || "").trim();
  const from = requiredInteger("evidence.from", fixture.from);
  const to = requiredInteger("evidence.to", fixture.to);
  assert.ok(SOLANA_ADDRESS_RE.test(wallet), "Retained evidence fixture has an invalid wallet");
  assert.ok(SOLANA_ADDRESS_RE.test(mint), "Retained evidence fixture has an invalid mint");
  assert.ok(SOLANA_ADDRESS_RE.test(quoteMint), "Retained evidence fixture has an invalid quote mint");
  assert.ok(to >= from, "Retained evidence fixture end precedes its start");
  assert.ok(to - from <= 60 * 60 * 24 * 365 * 5, "Retained evidence fixture window is too large");
  const signatures = [...new Set((Array.isArray(fixture.signatures) ? fixture.signatures : [])
    .map((signature) => String(signature || "").trim())
    .filter((signature) => SOLANA_SIGNATURE_RE.test(signature)))];
  assert.ok(signatures.length > 0, "Retained evidence fixture has no replayable Solana receipts");
  return Object.freeze({ wallet, mint, quoteMint, from, to, signatures: Object.freeze(signatures) });
}

export function loadEvidenceFixture(path = process.env.LIVE_EVIDENCE_FIXTURE_FILE || "retained-live-evidence.json") {
  assert.ok(fs.existsSync(path), `Retained evidence fixture file is missing: ${path}`);
  return validateEvidenceFixture(JSON.parse(fs.readFileSync(path, "utf8")));
}

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

export function validateCandles(bundle) {
  assert.ok(Array.isArray(bundle.candles) && bundle.candles.length > 0, "Known OHLC fixture returned no candles");
  for (const candle of bundle.candles) {
    assert.ok(Number.isFinite(candle?.timestamp), "Fixture candle is missing its timestamp");
    assert.ok(Number.isFinite(candle?.open) && Number.isFinite(candle?.high), "Fixture candle is missing OHLC values");
    assert.ok(Number.isFinite(candle?.low) && Number.isFinite(candle?.close), "Fixture candle is missing OHLC values");
  }
}

export function validateCutPage(document) {
  assert.match(document, /<title>A Bulls App<\/title>|class="field-shell"/i, "Canonical /?cut= page did not render the application shell");
  assert.match(document, /\/assets\/[^"?]+\.js/i, "Canonical /?cut= page is missing application JavaScript");
  assert.ok(!/share_not_found|Cut unavailable/i.test(document), "Canonical /?cut= page reports that the retained Cut is unavailable");
}

export async function runLiveChecks({
  origin = "https://abullsapp.com",
  expected,
  cutFixture = LIVE_FIXTURE,
  evidenceFixture = null,
  fixtureOnly = false,
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

  const frozenCut = await (await get(`/api/intelligence/trickster/share/${cutFixture.cutId}`)).json();
  fixtureFromFrozenCut(frozenCut, cutFixture);
  validateCutPage(await (await get(`/?cut=${cutFixture.cutId}`)).text());

  const retainedFixture = evidenceFixture ? validateEvidenceFixture(evidenceFixture) : loadEvidenceFixture();
  const replayResponse = await get("/api/intelligence/replay-bundle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet: retainedFixture.wallet,
      mint: retainedFixture.mint,
      quoteMint: retainedFixture.quoteMint,
      from: retainedFixture.from,
      to: retainedFixture.to,
      bucketSeconds: 60,
      limit: 500,
    }),
  });
  const replay = validateReplay(await replayResponse.json(), retainedFixture);
  validateCandles(replay);
  const holdingsPath = `/api/intelligence/research/holdings?wallet=${encodeURIComponent(retainedFixture.wallet)}&limit=10`;
  validateHoldings(await (await get(holdingsPath)).json(), retainedFixture);
  if (fixtureOnly) {
    console.log(JSON.stringify({ cutId: cutFixture.cutId, ...retainedFixture }));
    return retainedFixture;
  }

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

  console.log("Live release, frozen Cut route, retained Replay receipts, OHLC, and holdings checks passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const expected = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  await runLiveChecks({ expected, fixtureOnly: process.argv.includes("--fixture-only") });
}
