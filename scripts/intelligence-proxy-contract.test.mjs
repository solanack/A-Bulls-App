import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the public domain proxies intelligence and health requests", async () => {
  const [proxy, route, health, origins] = await Promise.all([
    read("src/lib/intelligence-proxy.ts"),
    read("src/routes/api.intelligence.$.ts"),
    read("src/routes/api.health.ts"),
    read("src/lib/intelligence-origin.ts"),
  ]);
  assert.match(proxy, /black-bull-run-sol\.ckdsigns1\.workers\.dev/);
  assert.match(route, /\/api\/intelligence\/\$/);
  assert.match(health, /\/api\/health/);
  assert.ok(origins.indexOf('"https://abullsapp.com"') < origins.indexOf('"https://black-bull-run-sol.ckdsigns1.workers.dev"'));
});

test("the field favors crisp rendering and ignores decorative wallpaper", async () => {
  const [field, budget] = await Promise.all([
    read("src/lib/field/particle-field.ts"),
    read("src/lib/field/hash.ts"),
  ]);
  assert.match(field, /antialias:\s*true/);
  assert.match(field, /retrying compatibility mode/);
  assert.match(field, /skyRole === "wallpaper"/);
  assert.match(budget, /dpr:\s*2/);
});

test("live intelligence remains available when WebGL cannot initialize", async () => {
  const [shell, fallback] = await Promise.all([
    read("src/components/app-shell.tsx"),
    read("src/components/fallback-particle-field.tsx"),
  ]);
  assert.match(shell, /graphics unavailable; live intelligence fallback active/);
  assert.match(shell, /await resolvePublicIdentifier/);
  assert.match(shell, /data-field-fallback/);
  assert.match(shell, /FallbackParticleField/);
  assert.match(fallback, /Interactive compatibility particle field/);
  assert.match(fallback, /requestAnimationFrame/);
});
