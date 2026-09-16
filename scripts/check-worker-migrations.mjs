import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const directory = new URL("../workers/migrations/", import.meta.url);
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
assert.ok(files.length > 0, "No Intelligence D1 migrations were found");

const destructive = /\b(?:DROP\s+(?:TABLE|COLUMN|INDEX)|TRUNCATE|ALTER\s+TABLE[\s\S]{0,120}\b(?:DROP|RENAME)\b)\b/i;
// Historical migration 0025 predates this gate and rebuilt two ranking tables.
// It is retained byte-for-byte for already provisioned databases; no new migration
// receives this exception.
const legacyExceptions = new Set(["0025_fomo_ponsfamily.sql"]);
for (const name of files) {
  const sql = await readFile(new URL(name, directory), "utf8");
  if (legacyExceptions.has(name)) continue;
  assert.ok(!destructive.test(sql), `${name} violates the expand-first migration policy`);
}
console.log(`Expand-first migration policy verified for ${files.length - legacyExceptions.size} governed Intelligence D1 migrations; 0025 is a frozen legacy exception.`);
