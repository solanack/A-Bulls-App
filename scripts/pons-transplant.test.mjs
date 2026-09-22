import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appShell = readFileSync(new URL("../src/components/app-shell.tsx", import.meta.url), "utf8");
const fieldOs = readFileSync(new URL("../src/lib/field/field-os.ts", import.meta.url), "utf8");
const client = readFileSync(
  new URL("../src/lib/universe-data/pons-client.ts", import.meta.url),
  "utf8",
);
const worker = readFileSync(
  new URL("../workers/intelligence-pons-galaxy.mjs", import.meta.url),
  "utf8",
);

test("PONS remains additive inside the locked interface", () => {
  assert.match(appShell, /GALAXY_ORIGIN_CHIPS/);
  assert.match(appShell, /openGalaxy\(item\.id\)/);
  assert.doesNotMatch(appShell, /className="field-shell__galaxy-trigger"/);
});

test("Galaxy selection is one tap and does not narrate an entry description", () => {
  assert.doesNotMatch(appShell, /observedGalaxySpeech|observedBodySpeech|unlockSpeech|TAP AGAIN/);
  assert.doesNotMatch(fieldOs, /Tap again to enter/);
  assert.match(fieldOs, /if\(target\)\{this\.field\.clearFocus\(true\);this\.setGalaxy\(target\);return;\}/);
  assert.doesNotMatch(fieldOs, /safe to buy|guaranteed|will pump/i);
});

test("the browser reads only first-party Intelligence endpoints", () => {
  assert.match(client, /fetchIntelligence/);
  assert.doesNotMatch(client, /dexscreener|dexpaprika|rpc\.mainnet|eth_getLogs/i);
  assert.match(worker, /eth_getLogs/);
});

test("PONS indexing has no signing, order, launch, or wallet-connection path", () => {
  assert.doesNotMatch(worker, /eth_sendRawTransaction|personal_sign|wallet_connect|placeOrder/);
  assert.match(worker, /readOnly:true/);
});
