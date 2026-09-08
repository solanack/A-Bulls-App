import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { speakObservedParticle } from "./observed-speech.ts";
import type { FieldParticle, UniverseSnapshot } from "./types.ts";

const now = 1_700_000_000_000;
const snapshot: UniverseSnapshot = {
  galaxyId: "pump-fun",
  windowStart: now - 60_000,
  windowEnd: now,
  observedEventCount: 1,
  samplingPolicy: "test",
  coverageStatement: "test",
  sources: ["test"],
  particles: [],
};

function particle(cosmicKind: FieldParticle["cosmicKind"], metadata: FieldParticle["metadata"] = {}): FieldParticle {
  return {
    id: `test:${cosmicKind}`,
    kind: cosmicKind,
    cosmicKind,
    originGalaxyId: "pump-fun",
    verificationState: "observed",
    observedAt: now,
    category: "program",
    magnitudeBand: 0.5,
    position: [0, 0, 0],
    source: "test",
    metadata,
  };
}

describe("Grey cosmology speech", () => {
  it("calls decorative wallpaper DUST rather than a Ghost", () => {
    const speech = speakObservedParticle(particle("ghost", { skyRole: "wallpaper" }), snapshot);
    assert.match(speech, /^DUST\./);
    assert.match(speech, /not a live token/i);
  });

  it("describes planets as public wallets without claiming ownership", () => {
    const speech = speakObservedParticle(
      particle("planet", { wallet: "Wallet1111111111111111111111111111111111111", linkedMints: ["Mint1"] }),
      snapshot,
    );
    assert.match(speech, /^PLANET\./);
    assert.match(speech, /public wallet/i);
    assert.match(speech, /not proof/i);
    assert.doesNotMatch(speech, /market cap/i);
  });

  it("describes migration as a wormhole while preserving launch origin", () => {
    const speech = speakObservedParticle(
      particle("wormhole", { mint: "Mint111111111111111111111111111111111111111", from: "curve", to: "amm", pool: "pool" }),
      snapshot,
    );
    assert.match(speech, /^WORMHOLE\./);
    assert.match(speech, /keeps its original launch galaxy/i);
    assert.match(speech, /migration/i);
  });

  it("does not certify a liquidity belt without liquidity evidence", () => {
    const speech = speakObservedParticle(particle("asteroid-belt", { liquidityUsd: null, liqSol: null }), snapshot);
    assert.match(speech, /^ASTEROID BELT\./);
    assert.match(speech, /unavailable/i);
    assert.match(speech, /should not be certified/i);
  });
});
