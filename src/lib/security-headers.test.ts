import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  applySecurityHeaders,
  baselineSecurityHeaders,
  CONTENT_SECURITY_POLICY_REPORT_ONLY,
  FRAME_ANCESTORS,
} from "./security-headers.ts";

const headersFile = readFileSync(new URL("../../public/_headers", import.meta.url), "utf8");
const rootRoute = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
const startEntry = readFileSync(new URL("../start.ts", import.meta.url), "utf8");

function directive(name: string): string {
  const match = CONTENT_SECURITY_POLICY_REPORT_ONLY.split("; ").find((part) => part.startsWith(`${name} `) || part === name);
  assert.ok(match, `missing CSP directive ${name}`);
  return match;
}

describe("baseline security headers", () => {
  it("keeps the document cache contract and adds the baseline on the root route", () => {
    assert.match(rootRoute, /headers:\s*\(\)\s*=>/);
    assert.match(rootRoute, /Cache-Control["']:\s*["']no-store, no-cache, must-revalidate["']/);
    assert.match(rootRoute, /Pragma["']:\s*["']no-cache["']/);
    assert.match(rootRoute, /baselineSecurityHeaders\(\)/);
    assert.doesNotMatch(rootRoute, /X-Frame-Options/);
  });

  it("attaches the same headers to every Worker response without dropping CSRF", () => {
    assert.match(startEntry, /applySecurityHeaders/);
    assert.match(startEntry, /requestMiddleware:\s*\[securityHeadersMiddleware,\s*csrfMiddleware\]/);
    assert.match(startEntry, /createCsrfMiddleware\(\{\s*filter:\s*\(ctx\)\s*=>\s*ctx\.handlerType === "serverFn"/);
    assert.doesNotMatch(startEntry, /X-Frame-Options/);
  });

  it("mirrors the Report-Only policy in public/_headers and keeps script MIME rules", () => {
    assert.match(headersFile, /\/assets\/\*\.js[\s\S]*Content-Type:\s*text\/javascript/);
    assert.match(headersFile, /X-Content-Type-Options:\s*nosniff/);
    assert.match(headersFile, /Cache-Control:\s*no-store/);
    assert.equal(headersFile.split("\n").some((line) => !line.trim().startsWith("#") && /x-frame-options/i.test(line)), false);
    assert.equal(headersFile.split("\n").filter((line) => line.includes("X-Content-Type-Options")).length, 1);
    for (const line of headersFile.split("\n")) {
      assert.ok(line.length <= 2000, `header line exceeds 2000 characters (${line.length})`);
    }
    const headers = baselineSecurityHeaders();
    for (const [name, value] of Object.entries(headers)) {
      assert.match(headersFile, new RegExp(`${name}: ${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
  });

  it("matches the loads the browser actually makes", () => {
    assert.match(directive("script-src"), /'unsafe-inline'/);
    assert.match(directive("style-src"), /'unsafe-inline'/);
    assert.match(directive("style-src"), /https:\/\/fonts\.googleapis\.com/);
    assert.match(directive("font-src"), /https:\/\/fonts\.gstatic\.com/);
    assert.doesNotMatch(directive("font-src"), /data:/);
    assert.match(directive("img-src"), /data:/);
    assert.match(directive("img-src"), /blob:/);
    assert.doesNotMatch(directive("img-src"), /https:/);
    assert.match(directive("connect-src"), /https:\/\/api\.dexscreener\.com/);
    assert.doesNotMatch(CONTENT_SECURITY_POLICY_REPORT_ONLY, /workers\.dev/);
    assert.match(directive("worker-src"), /blob:/);
    assert.equal(directive("object-src"), "object-src 'none'");
    assert.match(directive("frame-ancestors"), /https:\/\/grok\.com/);
    assert.match(directive("frame-ancestors"), /https:\/\/\*\.grok\.com/);
    assert.match(directive("frame-ancestors"), /https:\/\/\*\.grok-sandbox\.com/);
    const permissions = baselineSecurityHeaders()["Permissions-Policy"];
    for (const feature of ["camera", "microphone", "geolocation", "payment", "usb", "serial", "bluetooth", "interest-cohort"]) {
      assert.match(permissions, new RegExp(`${feature}=\\(\\)`));
    }
    assert.equal(baselineSecurityHeaders()["Strict-Transport-Security"], "max-age=31536000; includeSubDomains");
    assert.equal(baselineSecurityHeaders()["Cross-Origin-Opener-Policy"], "same-origin-allow-popups");
    assert.equal(baselineSecurityHeaders()["Cross-Origin-Resource-Policy"], "same-site");
    assert.equal(baselineSecurityHeaders()["Content-Security-Policy"], FRAME_ANCESTORS);
    assert.match(CONTENT_SECURITY_POLICY_REPORT_ONLY, new RegExp(FRAME_ANCESTORS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(Object.keys(baselineSecurityHeaders()).includes("X-Frame-Options"), false);
  });

  it("writes the baseline onto a Worker response without replacing other headers", async () => {
    const response = applySecurityHeaders(new Response("ok", { headers: { "cache-control": "no-store" } }));
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("content-security-policy"), FRAME_ANCESTORS);
    assert.equal(response.headers.get("content-security-policy-report-only"), CONTENT_SECURITY_POLICY_REPORT_ONLY);
    assert.equal(response.headers.get("x-frame-options"), null);
    assert.equal(await response.text(), "ok");
  });
});
