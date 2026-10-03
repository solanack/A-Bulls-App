import test from "node:test";
import assert from "node:assert/strict";
import {
  WARP_APPROACH_DISTANCE,
  WARP_COMMIT,
  WARP_DURATION_MS,
  WARP_REDUCED_MS,
  WARP_STREAK_LENGTH,
  WARP_TINT,
  isFieldWarpRoute,
  sampleWarp,
  warpDuration,
  warpPortal,
  warpTint,
} from "./galaxy-warp.ts";
import { createUniverseMapSnapshot, GALAXY_ZERO_CENTERS } from "./synthetic-universe.ts";

test("warp timing stays inside the cinematic window and reduced motion is a short fade", () => {
  assert.ok(WARP_DURATION_MS >= 1200 && WARP_DURATION_MS <= 1800);
  assert.ok(WARP_REDUCED_MS > 0 && WARP_REDUCED_MS < 700);
  assert.equal(warpDuration(false), WARP_DURATION_MS);
  assert.equal(warpDuration(true), WARP_REDUCED_MS);
  assert.ok(WARP_COMMIT > 0.4 && WARP_COMMIT < 0.75);
  assert.ok(WARP_STREAK_LENGTH >= 8 && WARP_STREAK_LENGTH <= 32);
  assert.ok(WARP_APPROACH_DISTANCE < 140 && WARP_APPROACH_DISTANCE > 70);
});

test("streaks ease in, peak at the scene swap, then retract; reduced motion never streaks", () => {
  const start = sampleWarp(0, false);
  const mid = sampleWarp(WARP_COMMIT * 0.5, false);
  const commit = sampleWarp(WARP_COMMIT, false);
  const end = sampleWarp(1, false);
  assert.equal(start.streak, 0);
  assert.equal(start.committed, false);
  assert.ok(mid.streak > start.streak && mid.streak < commit.streak);
  assert.ok(commit.streak > 0.95);
  assert.equal(commit.committed, true);
  assert.ok(end.streak < 0.02);
  assert.ok(commit.flash > mid.flash && commit.flash > sampleWarp(1, false).flash);
  for (const t of [0, 0.2, 0.58, 0.8, 1]) {
    assert.equal(sampleWarp(t, true).streak, 0);
  }
  assert.ok(sampleWarp(WARP_COMMIT, true).flash < sampleWarp(WARP_COMMIT, false).flash);
  assert.ok(sampleWarp(WARP_COMMIT, true).flash > 0.2);
});

test("approach accelerates before the commit and arrival settles afterward", () => {
  const early = sampleWarp(WARP_COMMIT * 0.45, false).approach;
  const later = sampleWarp(WARP_COMMIT * 0.85, false).approach;
  assert.ok(later > early);
  assert.ok(sampleWarp(WARP_COMMIT, false).settle > 0.95);
  assert.ok(sampleWarp(1, false).settle < 0.02);
  assert.equal(sampleWarp(0.2, false).settle, 0);
});

test("only Field entrances aim at a portal, and each room keeps its tint", () => {
  assert.deepEqual(warpPortal("galaxy-zero", "fomo"), [...GALAXY_ZERO_CENTERS[0]]);
  assert.deepEqual(warpPortal("galaxy-zero", "afterbell"), [...GALAXY_ZERO_CENTERS[1]]);
  assert.equal(warpPortal("fomo", "afterbell"), null);
  assert.equal(warpPortal("fomo", "galaxy-zero"), null);
  assert.equal(isFieldWarpRoute("galaxy-zero", "fomo"), true);
  assert.equal(isFieldWarpRoute("afterbell", "galaxy-zero"), true);
  assert.equal(isFieldWarpRoute("fomo", "fomo"), false);
  assert.equal(isFieldWarpRoute("pump-fun", "fomo"), false);
  const fomo = warpTint("fomo");
  const afterbell = warpTint("afterbell");
  assert.ok(fomo[2] > fomo[0] && fomo[0] > fomo[1], "FOMO tint stays violet");
  assert.ok(Math.max(...afterbell) - Math.min(...afterbell) < 0.16, "AFTERBELL tint stays silver-white");
  assert.deepEqual(warpTint("fomo"), [...WARP_TINT.fomo]);
});

test("Field home galaxies keep a bright core, spiral fabric, halo and a depth shell", () => {
  const snapshot = createUniverseMapSnapshot(1200, 861);
  for (const [index, id] of ["fomo", "afterbell"].entries()) {
    const body = snapshot.particles.filter((particle) => particle.metadata?.targetGalaxyId === id);
    const roles = new Set(body.map((particle) => particle.metadata?.galaxyRole));
    assert.ok(roles.has("core") && roles.has("fabric") && roles.has("halo") && roles.has("depth"));
    const core = body.find((particle) => particle.metadata?.galaxyRole === "core");
    assert.deepEqual(core?.position, [...GALAXY_ZERO_CENTERS[index]]);
    assert.ok(body.some((particle) => particle.metadata?.galaxyRole === "depth" && Math.abs(particle.position[1]) > 6));
    assert.equal(body.every((particle) => particle.metadata?.interactive === true), true);
  }
});
