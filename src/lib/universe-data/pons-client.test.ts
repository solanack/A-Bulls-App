import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ponsLaunchToParticle, snapshotFromPonsLaunches, type PonsLaunch } from "./pons-client.ts";

const launch: PonsLaunch = {
  token: "0x1111111111111111111111111111111111111111",
  factory: "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e",
  factoryVersion: "v2",
  curve: "0x2222222222222222222222222222222222222222",
  deployer: "0x3333333333333333333333333333333333333333",
  dexFactory: null,
  pairToken: "0x0000000000000000000000000000000000000000",
  pool: null,
  transactionHash: `0x${"a".repeat(64)}`,
  blockNumber: 123,
  blockHash: `0x${"b".repeat(64)}`,
  blockTime: 1_800_000_000_000,
  finality: "ethereum-finalized-window",
  state: "launched",
  market: { volumeH24: 1_000_000, liquidityUsd: 250_000 },
};

describe("PONS verified-origin client", () => {
  it("maps a factory launch to a star and never invents a risk state", () => {
    const particle = ponsLaunchToParticle(launch);
    assert.equal(particle.originGalaxyId, "pons");
    assert.equal(particle.cosmicKind, "star");
    assert.equal(particle.source, "verified-pons-factory-event");
    assert.equal(particle.metadata?.originVerified, true);
    assert.equal(particle.metadata?.volumeH24, 1_000_000);
  });

  it("builds a flattened, evidence-only PONS snapshot", () => {
    const snapshot = snapshotFromPonsLaunches([launch], { generatedAt: 1_800_000_100_000 });
    assert.equal(snapshot.galaxyId, "pons");
    assert.equal(snapshot.particles.length, 1);
    assert.ok(Math.abs(snapshot.particles[0].position[1]) <= 9);
    assert.match(snapshot.samplingPolicy, /verified PONS factory/);
    assert.ok(!snapshot.particles.some((particle) => particle.cosmicKind === "black-hole"));
  });
});
