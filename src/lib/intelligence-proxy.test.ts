import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { __intelligenceProxyContract, intelligenceProxyHandlers, proxyIntelligenceRequest } from "./intelligence-proxy.ts";

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
    const tree = readFileSync(join(process.cwd(), "src/routeTree.gen.ts"), "utf8").replaceAll("'", '"');
    assert.match(tree, /id: "\/\$"/);
    assert.match(tree, /fullPath: "\/api\/intelligence\/\$a\/\$b"/);
    assert.match(tree, /fullPath: "\/api\/intelligence\/\$a\/\$b\/\$c"/);
  });
});

describe("intelligence proxy transport", () => {
  it("uses the binding, preserves nested paths, query, body and status, and filters headers", async () => {
    const requests: Request[] = [];
    const bindings = { INTELLIGENCE: { fetch: async (request: Request) => {
      requests.push(request);
      assert.equal(await request.text(), '{"test":true}');
      return Response.json({ error: "contract_error" }, { status: 422, headers: { "cache-control": "private, no-store" } });
    } } };
    for (const method of ["POST", "PUT"]) {
      const response = await proxyIntelligenceRequest(new Request("https://frontend.example.test/api/intelligence/a/b/c/d?cursor=a%2Fb", {
        method, body: '{"test":true}', headers: { authorization: "Bearer test", "content-type": "application/json", cookie: "private=1", "x-untrusted": "drop" },
      }), bindings);
      assert.equal(response.status, 422);
      assert.equal(response.headers.get("x-a-bulls-intelligence-proxy"), "1");
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const forwarded = requests.at(-1)!;
      assert.equal(new URL(forwarded.url).pathname, "/api/intelligence/a/b/c/d");
      assert.equal(new URL(forwarded.url).search, "?cursor=a%2Fb");
      assert.equal(forwarded.method, method);
      assert.equal(forwarded.headers.get("authorization"), "Bearer test");
      assert.equal(forwarded.headers.get("cookie"), null);
      assert.equal(forwarded.headers.get("x-untrusted"), null);
    }
  });
  it("uses configurable HTTP without a binding and cannot replace its host with //", async (t) => {
    let seen: Request | undefined;
    t.mock.method(globalThis, "fetch", async (request: Request) => {
      seen = request;
      return Response.json({ ok: true });
    });
    const response = await proxyIntelligenceRequest(new Request("https://frontend.example.test//other.example.test/api/health"), {});
    assert.equal(response.status, 200);
    assert.equal(new URL(seen!.url).origin, __intelligenceProxyContract.upstream);
    assert.equal(new URL(seen!.url).pathname, "//other.example.test/api/health");
  });
  it("rejects unsupported methods before fetching and never retries a failed binding", async (t) => {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => { throw new Error("HTTP fallback must not run"); });
    t.mock.method(console, "error", () => {});
    const bindings = { INTELLIGENCE: { fetch: async () => { calls++; throw new Error("offline"); } } };
    assert.equal((await proxyIntelligenceRequest(new Request("https://frontend.example.test/api/intelligence/a", { method: "DELETE" }), bindings)).status, 405);
    assert.equal(calls, 0);
    const failed = await proxyIntelligenceRequest(new Request("https://frontend.example.test/api/intelligence/a", { method: "POST", body: "write" }), bindings);
    assert.equal(failed.status, 503);
    assert.equal(calls, 1);
  });
});
