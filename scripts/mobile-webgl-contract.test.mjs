import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile Field boot is non-invasive and keeps the native renderer in charge", async () => {
  const source = await read("src/lib/field/mobile-webgl-bootstrap.ts");
  assert.match(source, /Android\|iPhone\|iPad\|iPod\|Mobile\|Silk\|Seeker/);
  assert.match(source, /native-mobile/);
  assert.doesNotMatch(source, /HTMLCanvasElement\.prototype/);
  assert.doesNotMatch(source, /WebGLRenderer\.prototype/);
  assert.doesNotMatch(source, /from ["']three["']/);
});

test("mobile chrome disables backdrop blur over the native WebGL canvas without changing layout", async () => {
  const source = await read("src/lib/field/mobile-webgl-bootstrap.ts");
  assert.match(source, /pointer:\s*coarse/);
  assert.match(source, /backdrop-filter:\s*none\s*!important/);
});

test("the root route installs the lightweight mobile profile before the Field module is requested", async () => {
  const source = await read("src/routes/index.tsx");
  assert.match(source, /^import "@\/lib\/field\/mobile-webgl-bootstrap";/m);
});

test("production relies on explicit JavaScript MIME headers, not duplicate module execution", async () => {
  const [root, headers] = await Promise.all([
    read("src/routes/__root.tsx"),
    read("public/_headers"),
  ]);
  assert.doesNotMatch(root, /MODULE_BOOT_INLINE|module-boot-inline/);
  assert.match(headers, /\/assets\/\*\.js[\s\S]*Content-Type:\s*text\/javascript/);
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
});

test("a standalone Seeker diagnostic ships without depending on the app renderer", async () => {
  const source = await read("public/field-diag.html");
  assert.match(source, /webgl2/i);
  assert.match(source, /MAX_RENDERBUFFER_SIZE/);
  assert.match(source, /release\.json/);
});
