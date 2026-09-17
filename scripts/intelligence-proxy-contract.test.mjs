import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the public domain proxies intelligence and health requests", async () => {
  const [proxy, route, nestedRoute, health, origins] = await Promise.all([
    read("src/lib/intelligence-proxy.ts"),
    read("src/routes/api.intelligence.$.ts"),
    read("src/routes/api.intelligence.$a.$b.ts"),
    read("src/routes/api.health.ts"),
    read("src/lib/intelligence-origin.ts"),
  ]);
  assert.match(proxy, /app-origins/);
  assert.match(route, /\/api\/intelligence\/\$/);
  assert.match(nestedRoute, /\/api\/intelligence\/\$a\/\$b/);
  assert.match(health, /\/api\/health/);
  assert.match(origins, /app-origins/);
});

test("the field favors crisp rendering and ignores decorative wallpaper", async () => {
  const [field, budget] = await Promise.all([
    read("src/lib/field/particle-field.ts"),
    read("src/lib/field/hash.ts"),
  ]);
  assert.match(field, /antialias:\s*false/);
  assert.match(field, /stencil:\s*false/);
  assert.match(field, /webglcontextrestored/);
  assert.match(field, /fieldReady = "true"/);
  assert.match(field, /skyRole === "wallpaper"/);
  assert.match(budget, /dpr:\s*1\.75/);
});

test("live intelligence remains available when WebGL cannot initialize", async () => {
  const shell = await read("src/components/app-shell.tsx");
  assert.match(shell, /graphics unavailable; live intelligence fallback active/);
  assert.match(shell, /await resolvePublicIdentifier/);
  assert.match(shell, /data-field-fallback/);
  assert.doesNotMatch(shell, /FallbackParticleField/);
});
