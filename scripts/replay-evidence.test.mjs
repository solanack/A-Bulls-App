import assert from "node:assert/strict";
import test from "node:test";
import {
  createReplayState,
  evidenceForParticle,
  stepReplayCursor,
  visibleReplayCount,
} from "../src/lib/field/replay.ts";

const particles = [10, 40, 90].map((observedAt, index) => ({
  id: `event-${index}`,
  eventId: `event-${index}`,
  kind: "transaction",
  cosmicKind: "comet",
  originGalaxyId: "galaxy-zero",
  verificationState: "synthetic",
  observedAt,
  category: "swap",
  source: "synthetic-prototype",
  slot: null,
  metadata: {},
  magnitudeBand: 1,
  position: [0, 0, 0],
}));

const snapshot = {
  galaxyId: "galaxy-zero",
  windowStart: 0,
  windowEnd: 100,
  observedEventCount: particles.length,
  samplingPolicy: "synthetic deterministic prototype; not blockchain data",
  coverageStatement: "Prototype window only",
  sources: ["synthetic-prototype"],
  particles,
};

test("replay exposes only events at or before the chain-time cursor", () => {
  assert.equal(visibleReplayCount(snapshot, 0), 0);
  assert.equal(visibleReplayCount(snapshot, 0.4), 2);
  assert.equal(visibleReplayCount(snapshot, 1), 3);
  assert.equal(createReplayState(snapshot).status, "paused");
});

test("replay steps to exact observed event boundaries", () => {
  assert.equal(stepReplayCursor(snapshot, 0, 1), 0.1);
  assert.equal(stepReplayCursor(snapshot, 0.4, 1), 0.9);
  assert.equal(stepReplayCursor(snapshot, 0.9, -1), 0.4);
});

test("evidence refuses to synthesize a price chart", () => {
  const evidence = evidenceForParticle(snapshot, particles[0]);
  assert.equal(evidence.chartStatus, "unavailable");
  assert.match(evidence.chartReason, /no price path is inferred|source is attached/i);
  assert.deepEqual(evidence.sources, ["synthetic-prototype"]);
});
