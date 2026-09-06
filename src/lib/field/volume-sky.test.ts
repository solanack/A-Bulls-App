import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { FieldParticle, UniverseSnapshot } from "./types.ts";
import {
  SKY_CAP,
  HELIUS_MEMBERSHIP_LIMIT,
  LIQ_FLOOR_USD,
  admitStar,
  composeVolumeSky,
  countLiveStars,
  fiveMinuteHeat,
} from "./volume-sky.ts";

const now = 1_700_000_000_000;

function star(id: string, meta: Record<string, unknown>, extra: Partial<FieldParticle> = {}): FieldParticle {
  return {
    id,
    kind: "token",
    cosmicKind: "star",
    originGalaxyId: "galaxy-zero",
    verificationState: "observed",
    observedAt: now,
    category: "swap",
    magnitudeBand: 0.5,
    position: [0, 0, 0],
    metadata: { mint: id, ...meta } as FieldParticle["metadata"],
    ...extra,
  };
}

function snapshot(particles: FieldParticle[]): UniverseSnapshot {
  return {
    galaxyId: "galaxy-zero",
    windowStart: now - 60_000,
    windowEnd: now,
    observedEventCount: particles.length,
    samplingPolicy: "test",
    coverageStatement: "test",
    sources: ["test"],
    particles,
  };
}

function healthy(id: string, heatUsd: number): FieldParticle {
  return star(id, {
    volumeUsdM5: heatUsd,
    liqUsd: 50_000,
    uniqueTraders24h: 40,
    buysM5: 20,
    sellsM5: 18,
    pairCreatedAt: now - 60 * 60 * 1000,
  });
}

describe("volume sky knobs", () => {
  it("stays 5m-only, cap 120, Helius membership 10", () => {
    assert.equal(SKY_CAP, 120);
    assert.equal(HELIUS_MEMBERSHIP_LIMIT, 10);
    assert.equal(LIQ_FLOOR_USD, 10_000);
  });
});

describe("fiveMinuteHeat", () => {
  it("uses explicit 5m USD and never invents a 1h rank", () => {
    const heat = fiveMinuteHeat(
      star("Mint111111111111111111111111111111111111111", { volumeUsdM5: 1200, volumeSol24h: 9e6 }),
      { windowStart: now - 60_000, windowEnd: now },
    );
    assert.deepEqual(heat, { value: 1200, unit: "usd" });
  });
});

describe("admitStar wash gates", () => {
  it("rejects thin liquidity, one-sided tape, and wash-like velocity", () => {
    const window = { windowStart: now - 60_000, windowEnd: now };
    assert.equal(admitStar(healthy("A".padEnd(44, "1"), 400), window, now).admitted, true);
    assert.equal(
      admitStar(star("B".padEnd(44, "2"), { volumeUsdM5: 400, liqUsd: 500, uniqueTraders24h: 40, buysM5: 10, sellsM5: 10, pairCreatedAt: now - 3_600_000 }), window, now).admitted,
      false,
    );
    const wash = admitStar(
      star("C".padEnd(44, "3"), { volumeUsdM5: 90_000, liqUsd: 10_000, uniqueTraders24h: 40, buysM5: 10, sellsM5: 10, pairCreatedAt: now - 3_600_000 }),
      window,
      now,
    );
    assert.equal(wash.admitted, false);
    assert.ok(wash.flags.includes("wash-like-velocity"));
  });
});

describe("composeVolumeSky", () => {
  it("ranks admitted stars by 5m heat, caps live at 120, and keeps leftovers observed not safe", () => {
    const liveStars = Array.from({ length: 140 }, (_, i) =>
      healthy(`Mint${String(i).padStart(39, "0")}`, 10_000 - i),
    );
    const composed = composeVolumeSky({
      prototype: snapshot([]),
      live: snapshot(liveStars),
      now,
    });
    const live = composed.particles.filter((p) => p.metadata?.skyRole === "live");
    const observed = composed.particles.filter((p) => p.metadata?.skyRole === "observed");
    assert.equal(live.length, 120);
    assert.ok(observed.length > 0);
    assert.equal(countLiveStars(composed), 120);
    assert.equal(composed.samplingPolicy.includes("Helius membership stays 10"), true);
    assert.match(composed.coverageStatement, /No safety claim/);
    assert.equal(/\bSAFE\b/.test(JSON.stringify(composed)), false);
  });
});
