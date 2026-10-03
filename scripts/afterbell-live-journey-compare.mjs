import { readFileSync } from "node:fs";

const REGISTRY_SOURCE_URL = new URL(
  "../src/lib/universe-data/afterbell-client.ts",
  import.meta.url,
);
const TRADERS_PATHNAME = "/api/intelligence/afterbell/traders";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function callsign(wallet) {
  return wallet.length >= 8 ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : wallet;
}

/** mintHint values inside XSTOCK_REGISTRY, in source order. Hints outside that array are ignored. */
export function registryMintHints(source) {
  const start = source.indexOf("export const XSTOCK_REGISTRY");
  if (start < 0) throw new Error("XSTOCK_REGISTRY is missing from the Afterbell client");
  const end = source.indexOf("];", start);
  if (end < 0) throw new Error("XSTOCK_REGISTRY array is not closed");
  const body = source.slice(start, end);
  const mints = [...body.matchAll(/mintHint:\s*"([^"]+)"/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  if (!mints.length) throw new Error("XSTOCK_REGISTRY has no mintHint values");
  return [...new Set(mints)];
}

export function loadRegistryMintHints(source = readFileSync(REGISTRY_SOURCE_URL, "utf8")) {
  return registryMintHints(source);
}

export function afterbellTradersPath(mints, limit = 50) {
  const unique = [...new Set(mints.map((value) => String(value || "").trim()).filter(Boolean))];
  return `${TRADERS_PATHNAME}?mints=${encodeURIComponent(unique.join(","))}&limit=${limit}`;
}

export function isAfterbellTradersRequest(url) {
  try {
    return new URL(url, "https://example.test").pathname === TRADERS_PATHNAME;
  } catch {
    return false;
  }
}

export function mintsFromTradersUrl(url) {
  const parsed = new URL(url, "https://example.test");
  const raw = parsed.searchParams.get("mints") || parsed.searchParams.get("mint") || "";
  return [
    ...new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export function sameMintSet(left, right) {
  const a = [
    ...new Set((left || []).map((value) => String(value || "").trim()).filter(Boolean)),
  ].sort();
  const b = [
    ...new Set((right || []).map((value) => String(value || "").trim()).filter(Boolean)),
  ].sort();
  return a.length === b.length && a.every((mint, index) => mint === b[index]);
}

const SOLANA_ADDRESS_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

export function solanaAddressesInText(text) {
  let decoded = String(text || "");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* keep the raw text when it is not percent-encoded */
  }
  return [...new Set(decoded.match(new RegExp(SOLANA_ADDRESS_RE.source, "g")) || [])];
}

/**
 * Mints the Field actually requested.
 * A direct /api/intelligence/afterbell/traders query that already matches the
 * registry wins. A server-function URL that contains every registry mintHint
 * is the same request. A shorter list, including the audit endpoint's stale
 * window, must not replace the registry. When no page request is visible,
 * fall back to every XSTOCK_REGISTRY mintHint.
 */
export function mintsForTraderComparison({ requestUrls = [], registryMints }) {
  const registry = [...registryMints];
  for (const url of requestUrls) {
    if (!isAfterbellTradersRequest(url)) continue;
    const queried = mintsFromTradersUrl(url);
    if (queried.length && sameMintSet(queried, registry)) return queried;
  }
  for (const url of requestUrls) {
    const present = new Set(solanaAddressesInText(url));
    if (registry.length && registry.every((mint) => present.has(mint))) return registry;
  }
  for (const url of requestUrls) {
    if (!isAfterbellTradersRequest(url)) continue;
    const queried = mintsFromTradersUrl(url);
    if (queried.length) return queried;
  }
  return registry;
}

export function unwrapTraderPayload(body) {
  if (!body || typeof body !== "object") return body;
  if (Array.isArray(body.items)) return body;
  const nested = body.result;
  if (nested && typeof nested === "object" && Array.isArray(nested.items)) return nested;
  return body;
}

export function isAfterbellTraderPayload(body) {
  const payload = unwrapTraderPayload(body);
  if (!payload || payload.ok !== true || !Array.isArray(payload.items)) return false;
  if (
    typeof payload.method === "string" &&
    payload.method.startsWith("afterbell-cross-xstock-unique-retained")
  )
    return true;
  if (!Array.isArray(payload.mints)) return false;
  return payload.items.every(
    (row) =>
      row &&
      typeof row.wallet === "string" &&
      row.wallet &&
      Object.hasOwn(row, "uniqueAfterCloseTxCount") &&
      Object.hasOwn(row, "transactionCount"),
  );
}

function capturedMintSet(hit) {
  const payload = unwrapTraderPayload(hit?.payload);
  const direct = isAfterbellTradersRequest(hit?.url || "");
  const fromUrl = direct ? mintsFromTradersUrl(hit.url) : [];
  if (fromUrl.length) return fromUrl;
  return Array.isArray(payload?.mints) ? payload.mints : [];
}

/**
 * Prefer a registry-mint traders response the page itself received.
 * A count match wins so a trade that lands after hydrate cannot replace the
 * payload the Field already rendered. The first registry-mint payload is the
 * fallback when none of them match the rendered count.
 */
export function pageTraderPayload(captured, registryMints, pageCount) {
  const matches = [];
  for (const hit of captured || []) {
    const payload = unwrapTraderPayload(hit?.payload);
    if (!isAfterbellTraderPayload(payload)) continue;
    if (!sameMintSet(capturedMintSet(hit), registryMints)) continue;
    matches.push({
      traderPayload: payload,
      directUrl: isAfterbellTradersRequest(hit.url) ? hit.url : null,
    });
  }
  const agreed = matches.find((hit) => hit.traderPayload.items.length === pageCount);
  return agreed ?? matches[0] ?? null;
}

/**
 * When the page request was not observable, compare a registry-mint fetch.
 * A single retry wins when it agrees with the rendered count and the first fetch does not.
 */
export function selectRegistryFetch(fetches, pageCount) {
  const usable = (fetches || [])
    .filter((hit) => hit && hit.ok && isAfterbellTraderPayload(hit.traderPayload ?? hit.payload))
    .map((hit) => ({ ...hit, payload: unwrapTraderPayload(hit.traderPayload ?? hit.payload) }));
  if (!usable.length) return null;
  const agreed = usable.find((hit) => hit.payload.items.length === pageCount);
  const chosen = agreed ?? usable[usable.length - 1];
  return {
    traderPayload: chosen.payload,
    traderUrl: chosen.traderUrl ?? null,
    matched: chosen.payload.items.length === pageCount,
    retried: Boolean(agreed && usable[0] !== agreed),
  };
}

export function assertAfterbellTraderRows(items, viewportName, assertFn = assert) {
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    const prev = items[i - 1];
    assertFn(
      !/^STAR\s*·?\s*AFTERBELL\s*#/i.test(String(row.displayName || "")) &&
        !/AFTERBELL\s*#/i.test(String(row.displayName || "")),
      `${viewportName}: numeric Afterbell identity leaked`,
    );
    assertFn(
      Number(row.uniqueAfterCloseTxCount) === Number(row.transactionCount),
      `${viewportName}: unique tx contract mismatch`,
    );
    if (row.displayNameSource === "wallet-callsign")
      assertFn(
        row.displayName === callsign(row.wallet),
        `${viewportName}: unstable wallet callsign for ${row.wallet}`,
      );
    if (prev) {
      const a = Number(prev.uniqueAfterCloseTxCount);
      const b = Number(row.uniqueAfterCloseTxCount);
      assertFn(a >= b, `${viewportName}: ranking not descending unique tx count`);
      if (a === b)
        assertFn(
          String(prev.wallet).localeCompare(String(row.wallet)) <= 0,
          `${viewportName}: deterministic tie-break changed`,
        );
    }
    assertFn(
      (row.latestTrades || []).length <= 3,
      `${viewportName}: more than three latest trades exposed`,
    );
  }
}
