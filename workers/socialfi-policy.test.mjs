import test from "node:test";
import assert from "node:assert/strict";
import {
  requireSocialWrites,
  socialCapabilities,
  walletExecutionPolicy,
} from "./socialfi-policy.mjs";
import { handleSocialFiRequest } from "./socialfi-router.mjs";

test("all wallet and token execution capabilities are hard-disabled", () => {
  const capabilities = socialCapabilities({
    SOCIALFI_ENABLED: "true",
    SOCIALFI_WRITES_ENABLED: "true",
    WALLET_CONNECTION_ENABLED: "true",
    WALLET_SIGNING_ENABLED: "true",
    TRADING_ENABLED: "true",
    TOKEN_LAUNCH_ENABLED: "true",
    NATIVE_TOKEN_ENABLED: "true",
  });
  assert.equal(capabilities.socialEnabled, true);
  assert.equal(capabilities.writesEnabled, true);
  assert.equal(capabilities.walletConnectionEnabled, false);
  assert.equal(capabilities.walletSigningEnabled, false);
  assert.equal(capabilities.tradingEnabled, false);
  assert.equal(capabilities.tokenLaunchEnabled, false);
  assert.equal(capabilities.nativeTokenEnabled, false);
  assert.equal(walletExecutionPolicy({ WALLET_SIGNING_ENABLED: "true" }).enabled, false);
});

test("social writes fail closed independently from the read surface", () => {
  assert.deepEqual(requireSocialWrites({}), { ok: false, status: 404, error: "feature_disabled" });
  assert.deepEqual(requireSocialWrites({ SOCIALFI_ENABLED: "true" }), {
    ok: false,
    status: 403,
    error: "social_writes_disabled",
  });
  assert.equal(
    requireSocialWrites({ SOCIALFI_ENABLED: "true", SOCIALFI_WRITES_ENABLED: "true" }).ok,
    true,
  );
});

test("capabilities are inspectable while SocialFi is disabled", async () => {
  const response = await handleSocialFiRequest(
    new Request("https://example.com/api/social/capabilities"),
    {},
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.socialEnabled, false);
  assert.equal(body.walletExecution.enabled, false);
});

test("feed and writes are unreachable while SocialFi is disabled", async () => {
  const feed = await handleSocialFiRequest(new Request("https://example.com/api/social/feed"), {});
  const post = await handleSocialFiRequest(
    new Request("https://example.com/api/social/posts", { method: "POST" }),
    {},
  );
  assert.equal(feed.status, 404);
  assert.equal(post.status, 404);
});
