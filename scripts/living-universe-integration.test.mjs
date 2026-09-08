import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("frontend delegates storage, cache, snapshots, and provider budgets to the Intelligence Worker", async () => {
  const [resolver, snapshots, config] = await Promise.all([
    readFile("src/lib/intelligence.ts", "utf8"),
    readFile("src/lib/universe-data/service.ts", "utf8"),
    readFile("wrangler.jsonc", "utf8"),
  ]);
  assert.match(resolver, /\/api\/intelligence\/field\/resolve/);
  assert.match(snapshots, /\/api\/intelligence\/field\/snapshot/);
  assert.doesNotMatch(resolver + snapshots, /store\.server|reserveProviderUnits|readLatestSnapshot/);
  assert.doesNotMatch(config, /UNIVERSE_DB|HELIUS_MONTHLY_CREDITS|HELIUS_BREAKER_RATIO/);
});

test("every governing analysis mode is wired to a real Worker route", async () => {
  const [types, dispatcher, workspace] = await Promise.all([
    readFile("src/lib/field/types.ts", "utf8"),
    readFile("src/lib/universe-intelligence.ts", "utf8"),
    readFile("src/components/universe-workspace.tsx", "utf8"),
  ]);
  for (const mode of ["replay", "evidence", "compare", "what-if", "sequences", "ghost"]) {
    assert.match(types, new RegExp(`id: \\"${mode}\\"`));
    assert.match(workspace, new RegExp(`mode\\s*===\\s*\\"${mode}\\"`));
  }
  for (const route of [
    "replay-bundle",
    "event-context",
    "wallet-rivalry",
    "parallel-universe",
    "market-sequence",
    "ghost-portfolio",
    "chain-radar",
    "trickster/validate",
    "trickster/share",
  ]) assert.match(dispatcher, new RegExp(route.replace("/", "\\/")));
  assert.match(workspace, /No indexed OHLC series exists/);
  assert.match(workspace, /No price series was invented/);
});

test("education is explicitly narrated and noncompetitive", async () => {
  const source = await readFile("src/components/universe-workspace.tsx", "utf8");
  assert.match(source, /NARRATED EDUCATION · NO SCORE/);
  assert.match(source, /no missions, rankings, prizes, or progression loops/i);
  assert.doesNotMatch(source, /leaderboard|high score|connect wallet/i);
});
