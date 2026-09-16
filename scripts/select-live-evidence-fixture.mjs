import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const WSOL = "So11111111111111111111111111111111111111112";
const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

function rowsFromWrangler(payload) {
  const containers = Array.isArray(payload) ? payload : [payload];
  const rows = [];
  for (const container of containers) {
    if (Array.isArray(container?.results)) rows.push(...container.results);
    else if (Array.isArray(container?.result?.results)) rows.push(...container.result.results);
    else if (Array.isArray(container?.result)) rows.push(...container.result);
  }
  return rows;
}

export function selectLiveEvidenceFixture(payload) {
  const rows = rowsFromWrangler(payload);
  assert.ok(rows.length > 0, "Production D1 returned no retained evidence candidates");

  const groups = new Map();
  for (const row of rows) {
    const wallet = String(row?.wallet || "").trim();
    const mint = String(row?.mint || "").trim();
    const roundId = String(row?.round_id || `${wallet}:${mint}:${row?.from_ts}:${row?.to_ts}`).trim();
    const from = Number(row?.from_ts);
    const to = Number(row?.to_ts);
    if (!ADDRESS_RE.test(wallet) || !ADDRESS_RE.test(mint)) continue;
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from <= 0 || to < from) continue;
    if (to - from > 60 * 60 * 24 * 365 * 5) continue;
    const key = `${roundId}|${wallet}|${mint}|${from}|${to}`;
    if (!groups.has(key)) groups.set(key, { wallet, mint, from, to, signatures: [] });
    const signature = String(row?.signature || "").trim();
    if (SIGNATURE_RE.test(signature) && !groups.get(key).signatures.includes(signature)) {
      groups.get(key).signatures.push(signature);
    }
  }

  const fixture = [...groups.values()].find((candidate) => candidate.signatures.length > 0);
  assert.ok(fixture, "Production D1 has no candidate with replayable Solana receipts");
  return Object.freeze({
    wallet: fixture.wallet,
    mint: fixture.mint,
    quoteMint: WSOL,
    from: fixture.from,
    to: fixture.to,
    signatures: Object.freeze([...fixture.signatures]),
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputPath = process.argv[2];
  assert.ok(inputPath, "Usage: node scripts/select-live-evidence-fixture.mjs <wrangler-d1-json>");
  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  process.stdout.write(`${JSON.stringify(selectLiveEvidenceFixture(payload))}\n`);
}
