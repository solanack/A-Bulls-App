import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { __intelligenceProxyContract, intelligenceProxyHandlers } from "./intelligence-proxy.ts";

const routesRoot = join(process.cwd(), "src/routes");

describe("intelligence proxy catch-all", () => {
  it("forwards GET/POST/PUT through the shared handlers", () => {
    assert.equal(typeof intelligenceProxyHandlers.GET, "function");
    assert.equal(typeof intelligenceProxyHandlers.POST, "function");
    assert.equal(typeof intelligenceProxyHandlers.PUT, "function");
    assert.deepEqual(__intelligenceProxyContract.catchAllSegments, [1, 2, 3, 4]);
  });

  it("registers splat and nested $ routes so trickster/validate and share/:id hit the proxy", () => {
    const files = [
      ["api.intelligence.ts", "/api/intelligence"],
      ["api.intelligence.$.ts", "/api/intelligence/$"],
      ["api.intelligence.$a.$b.ts", "/api/intelligence/$a/$b"],
      ["api.intelligence.$a.$b.$c.ts", "/api/intelligence/$a/$b/$c"],
      ["api.intelligence.$a.$b.$c.$d.ts", "/api/intelligence/$a/$b/$c/$d"],
    ] as const;
    for (const [file, path] of files) {
      const source = readFileSync(join(routesRoot, file), "utf8");
      assert.ok(source.includes(`createFileRoute("${path}")`), `${file} must declare ${path}`);
      assert.match(source, /intelligenceProxyHandlers/);
    }
    const tree = readFileSync(join(process.cwd(), "src/routeTree.gen.ts"), "utf8");
    assert.match(tree, /id: "\/\$"/);
    assert.match(tree, /fullPath: "\/api\/intelligence\/\$a\/\$b"/);
    assert.match(tree, /fullPath: "\/api\/intelligence\/\$a\/\$b\/\$c"/);
  });
});
