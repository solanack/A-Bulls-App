import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the production frontend owns the abullsapp.com route", async () => {
  const config = JSON.parse(await read("wrangler.jsonc"));
  assert.equal(config.name, "a-bulls-app-frontend");
  assert.ok(Array.isArray(config.routes), "frontend Worker must declare its production route");
  assert.ok(
    config.routes.some(
      (route) => route?.pattern === "abullsapp.com/*" && route?.zone_name === "abullsapp.com",
    ),
    "abullsapp.com must route to the frontend Worker",
  );
});

test("the live release check waits for Cloudflare propagation", async () => {
  const check = await read("scripts/check-live.mjs");
  assert.match(check, /waitForRelease/);
  assert.match(check, /setTimeout/);
  assert.match(check, /release\.commit/);
});
