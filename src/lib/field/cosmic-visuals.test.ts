import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COSMIC_VISUALS, cosmicWorldSize, renderCosmicKind } from "./cosmic-visuals.ts";
import type { FieldParticle } from "./types.ts";

function particle(cosmicKind: FieldParticle["cosmicKind"], magnitudeBand = 0.5, metadata: FieldParticle["metadata"] = {}): FieldParticle {
  return {
    id: `${cosmicKind}-1`,
    kind: cosmicKind,
    cosmicKind,
    originGalaxyId: "solana-core",
    verificationState: "observed",
    observedAt: 1_700_000_000_000,
    category: "swap",
    magnitudeBand,
    position: [0, 0, 0],
    source: "test",
    metadata,
  };
}

describe("cosmic visual language", () => {
  it("reserves dust for decorative wallpaper so ghosts remain evidence-bearing traces", () => {
    const wallpaper = particle("star", 1, { skyRole: "wallpaper" });
    assert.equal(renderCosmicKind(wallpaper), "dust");
    assert.match(COSMIC_VISUALS.dust.meaning, /not market evidence/i);
    assert.match(COSMIC_VISUALS.ghost.meaning, /historical trace/i);
  });

  it("makes protocol galaxy cores unmistakably larger than token stars and decorative dust", () => {
    const core = particle("galaxy", 1, { galaxyRole: "core", targetGalaxyId: "pump-fun" });
    const star = particle("star", 1, { skyRole: "live", liquidityUsd: 1_000_000 });
    const dust = particle("dust", 1, { skyRole: "wallpaper" });
    assert.ok(cosmicWorldSize(core) > cosmicWorldSize(star));
    assert.ok(cosmicWorldSize(star) > cosmicWorldSize(dust) * 4);
  });

  it("uses observed liquidity to size asteroid belts without turning null into zero", () => {
    const unknown = particle("asteroid-belt", 0.25, { liquidityUsd: null });
    const deep = particle("asteroid-belt", 0.25, { liquidityUsd: 10_000_000 });
    assert.ok(cosmicWorldSize(deep) > cosmicWorldSize(unknown));
  });

  it("keeps all real object classes visually above decorative dust", () => {
    const dustMax = COSMIC_VISUALS.dust.maxWorldSize;
    for (const [kind, profile] of Object.entries(COSMIC_VISUALS)) {
      if (kind === "dust") continue;
      assert.ok(profile.minWorldSize > dustMax, `${kind} must remain larger than dust`);
    }
  });
});
