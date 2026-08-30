import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("frontend consumes the existing Intelligence Worker compatibility routes", async () => {
  const [service, intelligence, config] = await Promise.all([
    read("src/lib/universe-data/service.ts"),
    read("src/lib/intelligence.ts"),
    read("wrangler.jsonc"),
  ]);
  assert.match(service, /api\/intelligence\/field\/snapshot/);
  assert.match(intelligence, /api\/intelligence\/field\/resolve/);
  assert.match(config, /INTELLIGENCE_WORKER_URL/);
  assert.doesNotMatch(`${service}\n${intelligence}\n${config}`, /UNIVERSE_DB/);
});

test("backend adapter is composed into the rich Worker without replacing it", async () => {
  const [hooks, adapter, migration, production] = await Promise.all([
    read("workers/intelligence-worker-hooks.mjs"),
    read("workers/intelligence-field-compat.mjs"),
    read("workers/migrations/0020_field_compat.sql"),
    read("workers/wrangler.production.toml"),
  ]);
  assert.match(hooks, /handleFieldCompatibilityRequest/);
  assert.match(adapter, /usesExistingIntelligenceDb:true/);
  assert.match(adapter, /bull_intelligence_cache/);
  assert.match(migration, /intelligence_provider_budget_monthly/);
  assert.match(production, /binding = "INTELLIGENCE_DB"/);
  assert.doesNotMatch(production, /binding = "UNIVERSE_DB"/);
});
