import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("document cache headers", () => {
  it("root route declares no-store for Cloudflare Workers HTML", () => {
    const source = readFileSync(join(process.cwd(), "src/routes/__root.tsx"), "utf8");
    assert.match(source, /headers:\s*\(\)\s*=>/);
    assert.match(source, /Cache-Control["']:\s*["']no-store, no-cache, must-revalidate["']/);
    assert.match(source, /Pragma["']:\s*["']no-cache["']/);
  });
});
