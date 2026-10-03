import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  afterbellTradersPath,
  assertAfterbellTraderRows,
  callsign,
  isAfterbellTradersRequest,
  loadRegistryMintHints,
  mintsForTraderComparison,
  pageTraderPayload,
  registryMintHints,
  selectRegistryFetch,
} from "./afterbell-live-journey-compare.mjs";

const REGISTRY = Object.freeze([
  "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
  "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
  "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
  "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX",
  "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg",
  "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
  "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ",
  "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1",
]);

function traderPayload(mints, count) {
  return {
    ok: true,
    method: "afterbell-cross-xstock-unique-retained-after-close-transactions-v5",
    mints,
    items: Array.from({ length: count }, (_, index) => ({
      wallet: `W${index}allet11111111111111111111111111`,
      displayName: `W${index}a…1111`,
      displayNameSource: "retained-alias",
      uniqueAfterCloseTxCount: count - index,
      transactionCount: count - index,
      latestTrades: [{ txId: `tx-${index}` }],
    })),
  };
}

test("registry mint hints are read from XSTOCK_REGISTRY and cannot pick up later hints", () => {
  const source = `
export const XSTOCK_REGISTRY:readonly CatalogItem[]=[
  {symbol:"AAPLx",mintHint:"MintA"},
  {symbol:"NVDAx"},
  {symbol:"TSLAx",mintHint:"MintC"},
];
const elsewhere = { mintHint: "NotInRegistry" };
`;
  assert.deepEqual(registryMintHints(source), ["MintA", "MintC"]);
  assert.throws(() => registryMintHints("export const OTHER = []"), /XSTOCK_REGISTRY is missing/);
});

test("live Afterbell client exposes the eight registry mintHint values the Field requests", () => {
  const source = readFileSync(
    new URL("../src/lib/universe-data/afterbell-client.ts", import.meta.url),
    "utf8",
  );
  assert.deepEqual(loadRegistryMintHints(source), [...REGISTRY]);
  assert.equal(loadRegistryMintHints().length, 8);
});

test("comparison mints follow the page traders request, not a shorter audit window", () => {
  const auditMints = REGISTRY.slice(0, 7);
  const auditUrl = `https://abullsapp.com/api/intelligence/afterbell/audit`;
  const shortTradersUrl = `https://abullsapp.com${afterbellTradersPath(auditMints)}`;
  const serverFnUrl = `https://abullsapp.com/_serverFn/getAfterbellTraders?payload=${encodeURIComponent(JSON.stringify({ data: { mints: REGISTRY, limit: 50 } }))}`;
  assert.equal(isAfterbellTradersRequest(auditUrl), false);
  assert.equal(isAfterbellTradersRequest(shortTradersUrl), true);
  assert.deepEqual(
    mintsForTraderComparison({ requestUrls: [auditUrl, serverFnUrl], registryMints: REGISTRY }),
    [...REGISTRY],
  );
  assert.deepEqual(
    mintsForTraderComparison({
      requestUrls: [shortTradersUrl, serverFnUrl],
      registryMints: REGISTRY,
    }),
    [...REGISTRY],
  );
  assert.deepEqual(mintsForTraderComparison({ requestUrls: [auditUrl], registryMints: REGISTRY }), [
    ...REGISTRY,
  ]);
  assert.deepEqual(
    mintsForTraderComparison({
      requestUrls: [`https://abullsapp.com${afterbellTradersPath(REGISTRY)}`],
      registryMints: REGISTRY,
    }),
    [...REGISTRY],
  );
});

test("a direct traders response for the page mint set beats a later count from a different moment", () => {
  const pagePayload = traderPayload(REGISTRY, 5);
  const laterPayload = traderPayload(REGISTRY, 4);
  const auditPayload = traderPayload(REGISTRY.slice(0, 7), 4);
  const selected = pageTraderPayload(
    [
      {
        url: `https://abullsapp.com${afterbellTradersPath(REGISTRY.slice(0, 7))}`,
        payload: auditPayload,
      },
      { url: `https://abullsapp.com${afterbellTradersPath(REGISTRY)}`, payload: laterPayload },
      {
        url: "https://abullsapp.com/_serverFn/getAfterbellTraders",
        payload: { result: pagePayload },
      },
    ],
    REGISTRY,
    5,
  );
  assert.equal(selected.traderPayload.items.length, 5);
  assert.equal(selected.traderPayload, pagePayload);
});

test("registry refetch retries once when the first payload length disagrees with the rendered STAR count", () => {
  const first = traderPayload(REGISTRY, 4);
  const retry = traderPayload(REGISTRY, 5);
  const missed = selectRegistryFetch(
    [{ ok: true, payload: first, traderUrl: "https://abullsapp.com/first" }],
    5,
  );
  assert.equal(missed.matched, false);
  assert.equal(missed.retried, false);
  assert.equal(missed.traderPayload.items.length, 4);
  const recovered = selectRegistryFetch(
    [
      { ok: true, payload: first, traderUrl: "https://abullsapp.com/first" },
      { ok: true, payload: retry, traderUrl: "https://abullsapp.com/retry" },
    ],
    5,
  );
  assert.equal(recovered.matched, true);
  assert.equal(recovered.retried, true);
  assert.equal(recovered.traderPayload, retry);
  const stillOff = selectRegistryFetch(
    [
      { ok: true, payload: first, traderUrl: "https://abullsapp.com/first" },
      { ok: true, payload: first, traderUrl: "https://abullsapp.com/retry" },
    ],
    5,
  );
  assert.equal(stillOff.matched, false);
  assert.equal(stillOff.traderPayload.items.length, 4);
});

test("ranking, unique tx, identity, and latest-trade assertions stay strict", () => {
  const wallets = [
    "Aaaawallet111111111111111111111111",
    "Bbbwallet1111111111111111111111111",
    "Cccwallet1111111111111111111111111",
  ];
  const passing = [
    {
      wallet: wallets[0],
      displayName: callsign(wallets[0]),
      displayNameSource: "wallet-callsign",
      uniqueAfterCloseTxCount: 4,
      transactionCount: 4,
      latestTrades: [{}, {}, {}],
    },
    {
      wallet: wallets[1],
      displayName: "@kept",
      displayNameSource: "fomoapi.io-retained-handle",
      uniqueAfterCloseTxCount: 4,
      transactionCount: 4,
      latestTrades: [],
    },
    {
      wallet: wallets[2],
      displayName: callsign(wallets[2]),
      displayNameSource: "wallet-callsign",
      uniqueAfterCloseTxCount: 2,
      transactionCount: 2,
      latestTrades: [{}],
    },
  ];
  assert.doesNotThrow(() => assertAfterbellTraderRows(passing, "desktop"));
  assert.throws(
    () =>
      assertAfterbellTraderRows([{ ...passing[0], displayName: "STAR · AFTERBELL #1" }], "desktop"),
    /numeric Afterbell identity leaked/,
  );
  assert.throws(
    () => assertAfterbellTraderRows([{ ...passing[0], displayName: "AFTERBELL #4" }], "desktop"),
    /numeric Afterbell identity leaked/,
  );
  assert.throws(
    () => assertAfterbellTraderRows([{ ...passing[0], transactionCount: 3 }], "desktop"),
    /unique tx contract mismatch/,
  );
  assert.throws(
    () =>
      assertAfterbellTraderRows([{ ...passing[0], displayName: "not-the-callsign" }], "desktop"),
    /unstable wallet callsign/,
  );
  assert.throws(
    () => assertAfterbellTraderRows([passing[2], passing[0]], "desktop"),
    /ranking not descending unique tx count/,
  );
  assert.throws(
    () => assertAfterbellTraderRows([passing[1], passing[0]], "desktop"),
    /deterministic tie-break changed/,
  );
  assert.throws(
    () => assertAfterbellTraderRows([{ ...passing[0], latestTrades: [{}, {}, {}, {}] }], "desktop"),
    /more than three latest trades exposed/,
  );
});
