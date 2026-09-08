import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ponsLaunchToParticle, ponsTeachingParticle, snapshotFromPonsLaunches, type PonsLaunch } from "./pons-client.ts";

const launch: PonsLaunch = {
  rank: 1,
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
  finality: "confirmation-buffered",
  state: "launched",
  market: { marketCapUsd: 2_000_000, fdvUsd: 3_000_000, priceUsd: 0.02, observedAt: 1_800_000_100_000 },
};

describe("PONS verified-origin top-25 client", () => {
  it("maps ranked PONS tokens to planets without inventing a risk state", () => {
    const particle = ponsLaunchToParticle(launch);
    assert.equal(particle.originGalaxyId, "pons");
    assert.equal(particle.kind, "token");
    assert.equal(particle.cosmicKind, "planet");
    assert.match(particle.id, /^planet:pons:/);
    assert.equal(particle.source, "verified-pons-factory-event");
    assert.equal(particle.metadata?.originVerified, true);
    assert.equal(particle.metadata?.rank, 1);
    assert.equal(particle.metadata?.marketCapUsd, 2_000_000);
  });

  it("keeps the pinned PONS teaching token in the same token-planet taxonomy", () => {
    const particle = ponsTeachingParticle();
    assert.equal(particle.kind, "token");
    assert.equal(particle.cosmicKind, "planet");
    assert.match(particle.id, /^planet:pons:/);
    assert.equal(particle.metadata?.teaching, true);
  });

  it("builds a flattened, evidence-only top-25 snapshot", () => {
    const snapshot = snapshotFromPonsLaunches([launch], { generatedAt: 1_800_000_100_000 });
    assert.equal(snapshot.galaxyId, "pons");
    assert.equal(snapshot.particles.length, 1);
    assert.equal(snapshot.particles[0].cosmicKind, "planet");
    assert.ok(Math.abs(snapshot.particles[0].position[1]) <= 9);
    assert.match(snapshot.samplingPolicy, /top 25/);
    assert.match(snapshot.samplingPolicy, /\$500,000/);
    assert.ok(!snapshot.particles.some((particle) => particle.cosmicKind === "black-hole"));
  });
});
