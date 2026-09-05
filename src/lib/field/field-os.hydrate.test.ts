import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isFieldV0EvidenceSnapshot,
  shouldReplacePrototypeField,
  sparseHydrateDisclosure,
  visibilityFloor,
} from "./hydrate-gate.ts";
import type { UniverseSnapshot } from "./types.ts";

function snapshot(partial: Partial<UniverseSnapshot> & { particles: UniverseSnapshot["particles"] }): UniverseSnapshot {
  return {
    galaxyId: "galaxy-zero",
    windowStart: 0,
    windowEnd: 1,
    observedEventCount: partial.particles.length,
    samplingPolicy: "legacy-field-compat",
    coverageStatement: "test",
    sources: ["field-compat"],
    ...partial,
  };
}

const particle = {
  id: "p1",
  kind: "token",
  cosmicKind: "star" as const,
  originGalaxyId: "galaxy-zero" as const,
  verificationState: "observed",
  observedAt: 1,
  category: "swap" as const,
  magnitudeBand: 0.5,
  position: [0, 0, 0] as [number, number, number],
};

describe("hydrate-gate visibility floor", () => {
  it("floors at 200 and scales with budget", () => {
    assert.equal(visibilityFloor(1800), 200);
    assert.equal(visibilityFloor(2800), 224);
    assert.equal(visibilityFloor(4200), 336);
  });
});

describe("shouldReplacePrototypeField", () => {
  it("retains prototype when indexed count is 0 (6c9808e)", () => {
    assert.equal(shouldReplacePrototypeField(null, 2800), false);
    assert.equal(shouldReplacePrototypeField(snapshot({ particles: [] }), 2800), false);
  });

  it("rejects sparse legacy galaxy-zero snapshots (~4 particles)", () => {
    const sparse = snapshot({
      particles: Array.from({ length: 4 }, (_, i) => ({ ...particle, id: `p${i}` })),
    });
    assert.equal(shouldReplacePrototypeField(sparse, 2800), false);
    assert.equal(shouldReplacePrototypeField(sparse, 1800), false);
  });

  it("accepts dense legacy snapshots at/above the floor", () => {
    const dense = snapshot({
      particles: Array.from({ length: 224 }, (_, i) => ({ ...particle, id: `p${i}` })),
    });
    assert.equal(shouldReplacePrototypeField(dense, 2800), true);
  });

  it("allows sparse Field v0 evidence snapshots", () => {
    const fieldV0 = snapshot({
      galaxyId: "pump-fun",
      samplingPolicy: "indexer-field-v0 evidence-only; incomplete signals omitted or labeled",
      sources: ["indexer-field-v0"],
      particles: [{ ...particle, originGalaxyId: "pump-fun", source: "indexer-field-v0" }],
    });
    assert.equal(isFieldV0EvidenceSnapshot(fieldV0), true);
    assert.equal(shouldReplacePrototypeField(fieldV0, 2800), true);
  });
});

describe("sparseHydrateDisclosure", () => {
  it("mentions particle count and floor", () => {
    const text = sparseHydrateDisclosure("Indexed · fresh.", 4, 224);
    assert.match(text, /only 4 particles/);
    assert.match(text, /floor 224/);
    assert.match(text, /prototype/);
  });
});
