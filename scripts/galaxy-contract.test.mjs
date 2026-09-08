import assert from "node:assert/strict";
import test from "node:test";
import { PerspectiveCamera, Vector3 } from 'three';

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
import { createGalaxySnapshot, GALAXY_ZERO_CAMERA_DISTANCE, GALAXY_ZERO_CENTERS } from "../src/lib/field/synthetic-universe.ts";

test('all galaxy cores project inside portrait and desktop viewports',()=>{
  for(const [width,height] of [[320,900],[390,844],[412,915],[1280,800]]){
    const camera=new PerspectiveCamera(55,width/height,0.1,700), distance=GALAXY_ZERO_CAMERA_DISTANCE;
    camera.position.set(Math.sin(0.4)*Math.cos(0.18)*distance,Math.sin(0.18)*distance,Math.cos(0.4)*Math.cos(0.18)*distance);
    camera.lookAt(0,0,0);camera.updateMatrixWorld();
    for(const position of GALAXY_ZERO_CENTERS){
      const projected=new Vector3(...position).project(camera);
      assert.ok(Math.abs(projected.x)<0.9 && Math.abs(projected.y)<0.9 && projected.z<1,`${width}x${height}: ${position} must be visible`);
    }
  }
});

test("Galaxy Zero contains the populated protocol galaxies and decorative dust is not evidence", () => {
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
  assert.equal(map.particles.filter((particle) => particle.metadata?.galaxyRole === "core").length, 3);
  assert.ok(map.particles.some((particle) => particle.cosmicKind === "dust" && particle.verificationState === "decorative"));
  assert.ok(!map.particles.some((particle) => particle.cosmicKind === "ghost" && particle.verificationState === "decorative"));
  assert.ok(GALAXY_ZERO_CAMERA_DISTANCE >= 190, "portrait camera must frame the complete directory");
  assert.ok(GALAXY_ZERO_CENTERS.every(([x, y]) => Math.abs(x) <= 30 && Math.abs(y) <= 25), "galaxy cores must remain inside the portrait field");
});

test("existing entities map to the locked universe taxonomy while unknown fabric maps to dust", () => {
  assert.equal(cosmicKindForEntity("token"), "star");
  assert.equal(cosmicKindForEntity("wallet"), "planet");
  assert.equal(cosmicKindForEntity("nft"), "moon");
  assert.equal(cosmicKindForEntity("transaction"), "comet");
  assert.equal(cosmicKindForEntity("cluster"), "asteroid-belt");
  assert.equal(cosmicKindForEntity("program"), "galaxy");
  assert.equal(cosmicKindForEntity("migration"), "wormhole");
  assert.equal(cosmicKindForEntity("dead-token"), "black-hole");
  assert.equal(cosmicKindForEntity("pump-death"), "supernova");
  assert.equal(cosmicKindForEntity("dormant"), "ghost");
  assert.equal(cosmicKindForEntity("unknown-fabric"), "dust");
  assert.equal(Object.keys(COSMOLOGY_RULES).length, 11);
  assert.match(COSMOLOGY_RULES.dust.onChainMeaning, /No on-chain meaning/i);
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
    canonicalUniverseId("planet", "WalletABC", "pump-fun"),
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
