import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/app-shell.tsx", import.meta.url), "utf8");
const socialPolicy = readFileSync(new URL("../workers/socialfi-policy.mjs", import.meta.url), "utf8");

const required = [
  'const MENU_ITEMS',
  'className="gz-menu-button"',
  'className="gz-search"',
  'className="gz-bottom"',
  'aria-label="Galaxy Zero modes"',
];

const forbidden = [
  'className="field-shell__brand"',
  'className="field-shell__galaxy-trigger"',
  'className="field-shell__mode-tools"',
  'className="field-shell__commands"',
  '>A BULLS APP<',
];

const missing = required.filter((marker) => !source.includes(marker));
const restored = forbidden.filter((marker) => source.includes(marker));

if (missing.length || restored.length) {
  console.error("RELEASE BLOCKED: the locked simplified Field interface has changed.");
  if (missing.length) console.error(`Missing: ${missing.join(", ")}`);
  if (restored.length) console.error(`Expanded UI restored: ${restored.join(", ")}`);
  process.exit(1);
}

const walletExecutionLocks = [
  "walletConnectionEnabled: false",
  "walletSigningEnabled: false",
  "tradingEnabled: false",
  "tokenLaunchEnabled: false",
  "nativeTokenEnabled: false",
  "enabled: false",
  'adapter: "disabled"',
];
const missingExecutionLocks = walletExecutionLocks.filter((marker) => !socialPolicy.includes(marker));
if (missingExecutionLocks.length) {
  console.error("RELEASE BLOCKED: wallet execution or native-token locks have changed.");
  console.error(`Missing locks: ${missingExecutionLocks.join(", ")}`);
  process.exit(1);
}

console.log("Release baseline verified: simplified hamburger interface and wallet-execution locks are active.");

