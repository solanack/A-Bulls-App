import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile Field boot installs a Mali-safe WebGL context profile", async () => {
  const source = await read("src/lib/field/mobile-webgl-bootstrap.ts");
  assert.match(source, /powerPreference:\s*"default"/);
  assert.match(source, /Android\|iPhone\|iPad\|iPod\|Mobile\|Silk\|Seeker/);
  assert.match(source, /HTMLCanvasElement/);
});

test("mobile renderer avoids duplicate framebuffer resizes and 120Hz double submits", async () => {
  const source = await read("src/lib/field/mobile-webgl-bootstrap.ts");
  assert.match(source, /WeakMap/);
  assert.match(source, /previous\.width === safeWidth/);
  assert.match(source, /MAX_RENDER_HZ = 60/);
});

test("mobile chrome disables backdrop blur over the native WebGL canvas without changing layout", async () => {
  const source = await read("src/lib/field/mobile-webgl-bootstrap.ts");
  assert.match(source, /pointer:\s*coarse/);
  assert.match(source, /backdrop-filter:\s*none\s*!important/);
});

test("the root route installs guards before the Field module is requested", async () => {
  const source = await read("src/routes/index.tsx");
  assert.match(source, /^import "@\/lib\/field\/mobile-webgl-bootstrap";/m);
});

test("a standalone Seeker diagnostic ships without depending on the app renderer", async () => {
  const source = await read("public/field-diag.html");
  assert.match(source, /webgl2/i);
  assert.match(source, /MAX_RENDERBUFFER_SIZE/);
  assert.match(source, /release\.json/);
});
