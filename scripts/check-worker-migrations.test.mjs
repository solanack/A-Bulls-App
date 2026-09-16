import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("all Intelligence D1 migrations are expand-first", () => {
  const result = spawnSync(process.execPath, [new URL("./check-worker-migrations.mjs", import.meta.url).pathname], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Expand-first migration policy verified/);
});
