import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/app-shell.tsx", import.meta.url), "utf8");
const socialPolicy = readFileSync(new URL("../workers/socialfi-policy.mjs", import.meta.url), "utf8");
const universeVision = readFileSync(new URL("../UNIVERSE_VISION.md", import.meta.url), "utf8");
const tokenSystemWorker = readFileSync(new URL("../workers/intelligence-token-system.mjs", import.meta.url), "utf8");
const observatoryWorker = readFileSync(new URL("../workers/intelligence-trader-observatory.mjs", import.meta.url), "utf8");

const required = [
  'const MENU_ITEMS',
  'className="gz-menu-button"',
  'className="gz-search"',
  'className="gz-bottom"',
  'aria-label="Galaxy Zero modes"',
  'id:"observatory"',
  'label:"TOP 50 TRADERS"',
  'id:"watchlist"',
  'label:"WATCHLIST"',
];

const forbidden = [
  'className="field-shell__brand"',
  'className="field-shell__galaxy-trigger"',
  'className="field-shell__mode-tools"',
  'className="field-shell__commands"',
  '>A BULLS APP<',
];

const compactSource = source.replace(/\s+/g, "");
const missing = required.filter((marker) => !compactSource.includes(marker.replace(/\s+/g, "")));
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

const cosmologyLocks = [
  "**token = PLANET**",
  "**public wallet/holder/trader = STAR**",
  "Missing holder/wallet evidence produces an honest empty sky",
  "No scraping or undocumented third-party leaderboard dependency is allowed",
];
const missingCosmologyLocks = cosmologyLocks.filter((marker) => !universeVision.includes(marker));
if (missingCosmologyLocks.length) {
  console.error("RELEASE BLOCKED: the approved token-planet / wallet-star research contract has changed.");
  console.error(`Missing cosmology locks: ${missingCosmologyLocks.join(" | ")}`);
  process.exit(1);
}

if (/\bfetch\s*\(/.test(tokenSystemWorker)) {
  console.error("RELEASE BLOCKED: token-planet entry must remain D1-only and cannot issue passive provider fetches.");
  process.exit(1);
}
if (!tokenSystemWorker.includes("No provider lookup") || !tokenSystemWorker.includes("No wallet stars were invented")) {
  console.error("RELEASE BLOCKED: token-system honest-empty disclosures are missing.");
  process.exit(1);
}
if (!observatoryWorker.includes("reference-only") || !observatoryWorker.includes("ingested:false") || !observatoryWorker.includes("Unmatched sells")) {
  console.error("RELEASE BLOCKED: weekly trader observatory evidence/disclosure rules have changed.");
  process.exit(1);
}

console.log("Release baseline verified: simplified Field, token planets, wallet stars, read-only observatory/watchlist, and execution locks are active.");
