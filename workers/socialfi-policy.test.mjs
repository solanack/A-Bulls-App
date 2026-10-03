import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.deepEqual(capabilities.available, ["public-discovery", "evidence-feed"]);
  assert.ok(capabilities.unavailable.includes("profiles"));
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
  assert.deepEqual(body.available, []);
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

function mockDb(handlers = {}) {
  return {
    prepare(sql) {
      const run = handlers.prepare?.(sql) || { results: [] };
      return {
        bind(...args) {
          const resolved = typeof run === "function" ? run(args) : run;
          return {
            async all() {
              return resolved;
            },
            async first() {
              return resolved?.results?.[0] || null;
            },
            async run() {
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
    async batch() {
      return [];
    },
  };
}

test("discover feed reads indexed Solana membership for Galaxy Zero", async () => {
  const prepared = [];
  const env = {
    SOCIALFI_ENABLED: "true",
    INTELLIGENCE_DB: mockDb({
      prepare(sql) {
        prepared.push(sql);
        assert.equal(sql.includes("pump_trades"), false);
        assert.equal(/order by block_time/i.test(sql), false);
        if (sql.includes("intelligence_universe_membership_events")) {
          assert.match(sql, /universe_id = \?/);
          assert.match(sql, /ORDER BY observed_at DESC, id DESC/);
          return (args) => {
            assert.deepEqual(args, ["solana", 10]);
            return {
              results: [
                {
                  id: 11,
                  entity_id: "So11111111111111111111111111111111111111112",
                  event_kind: "entered",
                  observed_at: 1_700_000_100,
                  source_snapshot_id: "solana:snap1",
                },
                {
                  id: 12,
                  entity_id: "So11111111111111111111111111111111111111112",
                  event_kind: "exited",
                  observed_at: 1_700_000_200,
                  source_snapshot_id: "solana:snap2",
                },
              ],
            };
          };
        }
        return { results: [] };
      },
    }),
  };

  const response = await handleSocialFiRequest(
    new Request("https://example.com/api/social/feed?scope=discover&limit=10"),
    env,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.scope, "discover");
  assert.equal(body.galaxyId, "galaxy-zero");
  assert.deepEqual(body.sources, [
    "intelligence-mesh",
    "indexed Solana field",
    "universe-membership",
  ]);
  assert.equal(body.sources.includes("synthetic-prototype"), false);
  assert.equal(prepared.some((sql) => sql.includes("pump_trades")), false);
  assert.equal(body.items.length, 2);
  assert.deepEqual(
    body.items.map((item) => item.kind),
    ["alert", "observation"],
  );
  for (const item of body.items) {
    assert.equal(item.evidenceId, null);
    assert.equal(item.galaxyId, "galaxy-zero");
    assert.equal(item.actor.id, "indexer:galaxy-zero");
    assert.equal(item.reactions, 0);
    assert.equal(/pump\.fun|EVIDENCE ATTACHED/i.test(item.body), false);
  }
});

test("retired pump-fun and unsupported fomo are not discover sources", async () => {
  for (const galaxyId of ["pump-fun", "fomo", "pons", "afterbell"]) {
    const response = await handleSocialFiRequest(
      new Request(`https://example.com/api/social/feed?scope=discover&galaxyId=${galaxyId}`),
      { SOCIALFI_ENABLED: "true", INTELLIGENCE_DB: mockDb() },
    );
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "unknown_galaxy");
  }
});

test("social cards do not claim a resolved evidence receipt", () => {
  const source = readFileSync(
    new URL("../src/components/socialfi-workspace.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("EVIDENCE ATTACHED"), false);
  assert.match(source, /INDEXED OBSERVATION/);
});

test("creators scope is closed in step 1", async () => {
  const response = await handleSocialFiRequest(
    new Request("https://example.com/api/social/feed?scope=creators"),
    { SOCIALFI_ENABLED: "true", INTELLIGENCE_DB: mockDb() },
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "scope_not_in_step_1");
});
