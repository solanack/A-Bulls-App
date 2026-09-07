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
  GALAXY_CONTENT,
} from "../src/lib/field/galaxies.ts";
import { createGalaxySnapshot } from "../src/lib/field/synthetic-universe.ts";

test("Galaxy Zero contains the populated protocol galaxies", () => {
  const zero = getGalaxy("galaxy-zero");
  assert.equal(zero.status, "populated");
  assert.equal(zero.seed, 861);
  assert.equal(isPopulatedGalaxy("galaxy-zero"), true);
  assert.equal(isPopulatedGalaxy("solana-core"), true);
  assert.equal(isPopulatedGalaxy("pump-fun"), true);
  assert.equal(isPopulatedGalaxy("pons"), true);
  assert.equal(getGalaxy("pons").ecosystem, "PONS launch origin on Robinhood Chain");
  assert.equal(GALAXIES.length, 4);
  assert.deepEqual(GALAXY_CONTENT.pons.excludes, ["nft"]);
  const map = createGalaxySnapshot(zero, 900);
  assert.equal(map.observedEventCount, 0);
  assert.deepEqual(new Set(map.particles.flatMap((particle) => typeof particle.metadata?.targetGalaxyId === "string" ? [particle.metadata.targetGalaxyId] : [])), new Set(["solana-core", "pump-fun", "pons"]));
  assert.equal(map.particles.some((particle) => ["wallet", "transaction", "token", "nft", "program"].includes(particle.kind)), false);
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
  assert.equal(preserveLaunchOrigin(undefined, "solana-core"), "solana-core");
  assert.equal(preserveLaunchOrigin("solana-core", "solana-core"), "solana-core");
  assert.throws(
    () => preserveLaunchOrigin("solana-core", "pump-fun"),
    /Launch origin is immutable/,
  );
});

test("wallet identity remains stable across galaxies", () => {
  assert.equal(
    canonicalUniverseId("planet", "WalletABC", "solana-core"),
    canonicalUniverseId("planet", "walletabc", "pump-fun"),
  );
  assert.notEqual(
    canonicalUniverseId("star", "MintABC", "solana-core"),
    canonicalUniverseId("star", "MintABC", "pump-fun"),
  );
  assert.notEqual(
    canonicalUniverseId("star", "MintABC", "pump-fun"),
    canonicalUniverseId("star", "MintABC", "pons"),
  );
});

test("volume sky knobs stay 5m-only, cap 120, Helius membership 10", async () => {
  const sky = await import("../src/lib/field/volume-sky.ts");
  assert.equal(sky.SKY_CAP, 120);
  assert.equal(sky.HELIUS_MEMBERSHIP_LIMIT, 10);
  assert.equal(sky.LIQ_FLOOR_USD, 10_000);
  assert.equal(sky.MAX_M5_VOL_TO_LIQ, 8);
});
