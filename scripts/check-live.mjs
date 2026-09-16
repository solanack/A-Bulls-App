import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const LIVE_FIXTURE = Object.freeze({
  cutId: "ad2538ff000fcceb707d55d5",
  wallet: "9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU",
  mint: "5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump",
  quoteMint: "So11111111111111111111111111111111111111112",
});
const SOLANA_SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

const requiredInteger = (name, value) => {
  const parsed = Number(value);
  assert.ok(Number.isSafeInteger(parsed) && parsed > 0, `${name} must be a positive Unix timestamp`);
  return parsed;
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
  const solanaReceipts = (manifest.evidence || []).filter((receipt) =>
    SOLANA_SIGNATURE_RE.test(String(receipt?.signature || "").trim()),
  );
  const signatures = solanaReceipts.map((receipt) => String(receipt.signature).trim());
  assert.ok(signatures.length > 0, "Saved Cut has no retained Solana receipt signatures");
  const from = requiredInteger("manifest.coverage.from", manifest.coverage?.from);
  const to = requiredInteger("manifest.coverage.to", manifest.coverage?.to);
  assert.ok(to >= from, "LIVE_REPLAY_TO must not precede LIVE_REPLAY_FROM");
  for (const receipt of solanaReceipts) {
    const blockTime = requiredInteger(`receipt ${receipt.id || receipt.signature} blockTime`, receipt.blockTime);
    assert.ok(blockTime >= from && blockTime <= to, "Saved Cut receipt falls outside its coverage window");
  }
  return Object.freeze({ ...expected, from, to, signatures: Object.freeze([...new Set(signatures)]) });
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

export function validateCutPage(document, fixture) {
  assert.match(document, /VERIFY\s*(?:·|-)?\s*Frozen Cut/i, "Canonical /?cut= page did not render the frozen VERIFY viewer");
  assert.match(document, /This viewer renders the frozen manifest only/i, "VERIFY page does not preserve the frozen-manifest disclosure");
  assert.ok(!/share_not_found|Cut unavailable/i.test(document), "Canonical /?cut= page reports that the retained Cut is unavailable");
}

export async function runLiveChecks({
  origin = "https://abullsapp.com",
  expected,
  fixture = LIVE_FIXTURE,
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
  const frozenCut = await (await get(`/api/intelligence/trickster/share/${fixture.cutId}`)).json();
  const retainedFixture = fixtureFromFrozenCut(frozenCut, fixture);
  validateCutPage(await (await get(`/?cut=${fixture.cutId}`)).text(), retainedFixture);

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
  validateCandles(replay, retainedFixture);
  const holdingsPath = `/api/intelligence/research/holdings?wallet=${encodeURIComponent(retainedFixture.wallet)}&limit=10`;
  validateHoldings(await (await get(holdingsPath)).json(), retainedFixture);
  if (fixtureOnly) {
    console.log(JSON.stringify({ cutId: retainedFixture.cutId, wallet: retainedFixture.wallet, mint: retainedFixture.mint, quoteMint: retainedFixture.quoteMint, from: retainedFixture.from, to: retainedFixture.to, signatures: retainedFixture.signatures }));
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

  console.log("Live release, API, retained Replay receipts, OHLC, and active-subject holdings checks passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const expected = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  await runLiveChecks({ expected, fixtureOnly: process.argv.includes("--fixture-only") });
}
