import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GOLDEN_FIXTURES, goldenBundleVerdict, goldenReplayPath, goldenReplayRequest } from "./golden-fixtures.mjs";

test("golden fixtures cover both equal rooms", () => {
  assert.deepEqual(GOLDEN_FIXTURES.map(fixture => fixture.room), ["fomo", "afterbell"]);
});

test("EVM fixture never sends a Solana quote mint; Solana fixture quotes in SOL", () => {
  const [fomo, afterbell] = GOLDEN_FIXTURES.map(goldenReplayRequest);
  assert.equal(fomo.quoteMint, undefined);
  assert.equal(fomo.bucketSeconds, 3600);
  assert.equal(afterbell.quoteMint, "So11111111111111111111111111111111111111112");
  assert.equal(afterbell.bucketSeconds, 60);
});

test("replay path reopens the exact subject and window", () => {
  const url = new URL(goldenReplayPath(GOLDEN_FIXTURES[1]), "https://app.example");
  assert.equal(url.searchParams.get("mode"), "replay");
  assert.equal(url.searchParams.get("wallet"), GOLDEN_FIXTURES[1].wallet);
  assert.equal(url.searchParams.get("mint"), GOLDEN_FIXTURES[1].mint);
  assert.equal(url.searchParams.get("from"), String(GOLDEN_FIXTURES[1].from));
  assert.equal(url.searchParams.get("room"), "afterbell");
});

test("a 404 or an empty tape fails the release", () => {
  const fixture = GOLDEN_FIXTURES[0];
  assert.equal(goldenBundleVerdict(fixture, 404, {}).ok, false);
  assert.equal(goldenBundleVerdict(fixture, 200, { ok: true, bundle: { events: [{ side: "transfer" }], candles: [] } }).ok, false);
  assert.equal(goldenBundleVerdict(fixture, 200, { ok: true, bundle: { events: [{ side: "buy" }], candles: [] } }).ok, true);
});

test("deploy workflow runs the golden fixture gate against production", () => {
  const workflow = readFileSync(new URL("../.github/workflows/deploy-cloudflare.yml", import.meta.url), "utf8");
  assert.match(workflow, /node scripts\/check-golden-fixtures\.mjs https:\/\/www\.abullsapp\.com/);
});
