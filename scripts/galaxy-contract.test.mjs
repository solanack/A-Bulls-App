import assert from "node:assert/strict";
import test from "node:test";

import {
  GALAXIES,
  COSMOLOGY_RULES,
  canonicalUniverseId,
  cosmicKindForEntity,
  getGalaxy,
  isPopulatedGalaxy,
  preserveLaunchOrigin,
} from "../src/lib/field/galaxies.ts";

test("Galaxy Zero and pump.fun are populated through the shared contract", () => {
  const zero = getGalaxy("galaxy-zero");
  assert.equal(zero.status, "populated");
  assert.equal(zero.seed, 861);
  assert.equal(isPopulatedGalaxy("galaxy-zero"), true);
  assert.equal(isPopulatedGalaxy("pump-fun"), true);
  assert.equal(GALAXIES.length, 2);
});

test("existing entities map to the locked universe taxonomy", () => {
  assert.equal(cosmicKindForEntity("token"), "star");
  assert.equal(cosmicKindForEntity("wallet"), "planet");
  assert.equal(cosmicKindForEntity("nft"), "moon");
  assert.equal(cosmicKindForEntity("transaction"), "comet");
  assert.equal(cosmicKindForEntity("cluster"), "asteroid-belt");
  assert.equal(cosmicKindForEntity("program"), "galaxy");
  assert.equal(cosmicKindForEntity("migration"), "wormhole");
  assert.equal(Object.keys(COSMOLOGY_RULES).length, 10);
});

test("launch origin can be set once but never rewritten", () => {
  assert.equal(preserveLaunchOrigin(undefined, "galaxy-zero"), "galaxy-zero");
  assert.equal(preserveLaunchOrigin("galaxy-zero", "galaxy-zero"), "galaxy-zero");
  assert.throws(
    () => preserveLaunchOrigin("galaxy-zero", "pump-fun"),
    /Launch origin is immutable/,
  );
});

test("wallet identity remains stable across galaxies", () => {
  assert.equal(
    canonicalUniverseId("planet", "WalletABC", "galaxy-zero"),
    canonicalUniverseId("planet", "walletabc", "pump-fun"),
  );
  assert.notEqual(
    canonicalUniverseId("star", "MintABC", "galaxy-zero"),
    canonicalUniverseId("star", "MintABC", "pump-fun"),
  );
});
