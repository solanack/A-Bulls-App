import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fetchIntelligence,
  INTELLIGENCE_ORIGINS,
  INTELLIGENCE_PUBLIC_ORIGIN,
  INTELLIGENCE_WORKER_ORIGIN,
  shouldRetryIntelligenceOrigin,
} from "./intelligence-origin.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function htmlResponse(status: number): Response {
  return new Response("<html>not found</html>", {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("intelligence origin", () => {
  it("prefers workers.dev before the public domain for serverFn fetches", () => {
    assert.equal(INTELLIGENCE_ORIGINS[0], INTELLIGENCE_WORKER_ORIGIN);
    assert.equal(INTELLIGENCE_ORIGINS[1], INTELLIGENCE_PUBLIC_ORIGIN);
    assert.ok(INTELLIGENCE_ORIGINS.indexOf(INTELLIGENCE_WORKER_ORIGIN) < INTELLIGENCE_ORIGINS.indexOf(INTELLIGENCE_PUBLIC_ORIGIN));
  });

  it("does not retry JSON 404 so callers can read share_not_found / feature_disabled", () => {
    assert.equal(shouldRetryIntelligenceOrigin(jsonResponse(404, { error: "share_not_found" })), false);
    assert.equal(shouldRetryIntelligenceOrigin(jsonResponse(404, { error: "feature_disabled" })), false);
    assert.equal(shouldRetryIntelligenceOrigin(jsonResponse(400, { error: "invalid_manifest" })), false);
    assert.equal(shouldRetryIntelligenceOrigin(jsonResponse(200, { ok: true })), false);
  });

  it("retries non-JSON responses and status >= 500", () => {
    assert.equal(shouldRetryIntelligenceOrigin(htmlResponse(404)), true);
    assert.equal(shouldRetryIntelligenceOrigin(jsonResponse(500, { error: "upstream" })), true);
    assert.equal(shouldRetryIntelligenceOrigin(jsonResponse(503, { error: "unavailable" })), true);
  });

  it("returns a JSON 404 instead of throwing intelligence_origin_404", async () => {
    const urls: string[] = [];
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return jsonResponse(404, { ok: false, error: "share_not_found" });
    };
    const response = await fetchIntelligence("/api/intelligence/trickster/share/missing");
    assert.equal(response.status, 404);
    assert.equal((await response.json() as { error: string }).error, "share_not_found");
    assert.equal(urls.length, 1);
    assert.equal(urls[0], `${INTELLIGENCE_WORKER_ORIGIN}/api/intelligence/trickster/share/missing`);
  });

  it("retries HTML 404 from workers.dev then returns JSON from abullsapp.com", async () => {
    const urls: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.startsWith(INTELLIGENCE_WORKER_ORIGIN)) return htmlResponse(404);
      return jsonResponse(200, { ok: true, shareId: "ad2538ff000fcceb707d55d5" });
    };
    const response = await fetchIntelligence("/api/intelligence/trickster/validate", { method: "POST" });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { shareId?: string }).shareId, "ad2538ff000fcceb707d55d5");
    assert.deepEqual(urls, [
      `${INTELLIGENCE_WORKER_ORIGIN}/api/intelligence/trickster/validate`,
      `${INTELLIGENCE_PUBLIC_ORIGIN}/api/intelligence/trickster/validate`,
    ]);
  });

  it("throws intelligence_origin_404 only when every origin is non-JSON 404", async () => {
    globalThis.fetch = async () => htmlResponse(404);
    await assert.rejects(
      () => fetchIntelligence("/api/intelligence/trickster/validate"),
      (error: unknown) => error instanceof Error && error.message === "intelligence_origin_404",
    );
  });
});
