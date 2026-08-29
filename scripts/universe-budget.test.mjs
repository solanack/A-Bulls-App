import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canReserveProviderUnits,
  circuitBreakerLimit,
  monthKey,
  normalizeBudgetPolicy,
  usageCoverage,
} from "../src/lib/universe-data/budget.ts";

const policy = {
  provider: "helius",
  monthlyLimit: 1_000,
  circuitBreakerRatio: 0.75,
};

test("the provider circuit breaker closes at the conservative threshold", () => {
  assert.equal(circuitBreakerLimit(policy), 750);
  assert.equal(canReserveProviderUnits({ unitsSpent: 749 }, policy, 1), true);
  assert.equal(canReserveProviderUnits({ unitsSpent: 749 }, policy, 2), false);
  assert.equal(canReserveProviderUnits({ unitsSpent: 750 }, policy, 0), true);
  assert.equal(usageCoverage(750, policy), "stale");
});

test("unsafe policy values are clamped", () => {
  assert.deepEqual(normalizeBudgetPolicy({ ...policy, circuitBreakerRatio: 1.5 }), {
    ...policy,
    circuitBreakerRatio: 0.95,
  });
  assert.deepEqual(normalizeBudgetPolicy({ ...policy, circuitBreakerRatio: 0.1 }), {
    ...policy,
    circuitBreakerRatio: 0.5,
  });
});

test("usage rolls over by UTC month", () => {
  assert.equal(monthKey(Date.UTC(2026, 7, 31, 23, 59)), "2026-08");
  assert.equal(monthKey(Date.UTC(2026, 8, 1, 0, 0)), "2026-09");
});

test("D1 schema contains the complete cost-controlled data spine", async () => {
  const schema = await readFile("cloudflare/migrations/0001_universe_index.sql", "utf8");
  for (const table of [
    "universe_snapshots",
    "universe_query_cache",
    "provider_usage",
    "market_candles",
    "ingestion_receipts",
  ]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
});
