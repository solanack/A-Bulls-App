import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { FieldParticle, UniverseSnapshot } from "./types.ts";
import {
  SKY_CAP,
  HELIUS_MEMBERSHIP_LIMIT,
  LIQ_FLOOR_USD,
  admitPlanet,
  composeVolumeSky,
  countLivePlanets,
  countLiveStars,
  countLiveStars,
  fiveMinuteHeat,
  liquidityBeltForPlanet,
} from "./volume-sky.ts";

const now = 1_700_000_000_000;

function planet(
  id: string,
  meta: Record<string, unknown>,
  extra: Partial<FieldParticle> = {},
): FieldParticle {
  return {
    id,
    kind: "token",
    cosmicKind: "planet",
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

function healthy(id: string, heatUsd: number) {
  return planet(id, {
    volumeUsdM5: heatUsd,
    liqUsd: 50_000,
    uniqueTraders24h: 40,
    buysM5: 20,
    sellsM5: 18,
    pairCreatedAt: now - 3_600_000,
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
    assert.deepEqual(
      fiveMinuteHeat(
        planet("Mint111111111111111111111111111111111111111", {
          volumeUsdM5: 1200,
          volumeSol24h: 9e6,
        }),
        { windowStart: now - 60_000, windowEnd: now },
      ),
      { value: 1200, unit: "usd" },
    );
  });
});

describe("admitPlanet wash gates", () => {
  it("rejects thin liquidity, one-sided tape, and wash-like velocity", () => {
    const window = { windowStart: now - 60_000, windowEnd: now };
    assert.equal(admitPlanet(healthy("A".padEnd(44, "1"), 400), window, now).admitted, true);
    assert.equal(
      admitPlanet(
        planet("B".padEnd(44, "2"), {
          volumeUsdM5: 400,
          liqUsd: 500,
          uniqueTraders24h: 40,
          buysM5: 10,
          sellsM5: 10,
          pairCreatedAt: now - 3_600_000,
        }),
        window,
        now,
      ).admitted,
      false,
    );
    assert.equal(
      admitPlanet(
        planet("C".padEnd(44, "3"), {
          volumeUsdM5: 90_000,
          liqUsd: 10_000,
          uniqueTraders24h: 40,
          buysM5: 10,
          sellsM5: 10,
          pairCreatedAt: now - 3_600_000,
        }),
        window,
        now,
      ).admitted,
      false,
    );
  });
});

describe("liquidity belt", () => {
  it("appears only for observed liquidity on a token planet", () => {
    assert.equal(liquidityBeltForPlanet(planet("A".padEnd(44, "1"), {})), null);
    const belt = liquidityBeltForPlanet(healthy("A".padEnd(44, "1"), 400));
    assert.equal(belt?.cosmicKind, "asteroid-belt");
    assert.equal(belt?.metadata?.parentMint, "A".padEnd(44, "1"));
  });
});

describe("live STAR counting", () => {
  it("counts trader STARS independently from token PLANETS", () => {
    const trader: FieldParticle = {
      id: "trader-star",
      kind: "wallet",
      cosmicKind: "star",
      originGalaxyId: "afterbell",
      verificationState: "observed",
      observedAt: now,
      category: "swap",
      magnitudeBand: 0.8,
      position: [0, 10, 0],
      source: "indexed-afterbell",
      metadata: { wallet: "9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU", skyRole: "live" },
    };
    const field = { ...snapshot([trader]), galaxyId: "afterbell" as const };
    assert.equal(countLiveStars(field), 1);
    assert.equal(countLivePlanets(field), 0);
  });
});

describe("live STAR counters", () => {
  it("counts trader STARS independently from token PLANETS", () => {
    const trader: FieldParticle = {
      id: "afterbell-wallet", kind: "wallet", cosmicKind: "star", originGalaxyId: "afterbell", verificationState: "observed", observedAt: now, category: "swap", magnitudeBand: .7, position: [0,0,0], source: "helius-afterbell-pool-window", metadata: { wallet: "9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU", skyRole: "live" },
    };
    const live = { ...snapshot([trader]), galaxyId: "afterbell" as const };
    assert.equal(countLiveStars(live), 1);
    assert.equal(countLivePlanets(live), 0);
  });
});

describe("composeVolumeSky", () => {
  it("keeps qualifying PonsFamily ranks as token planets under the locked thresholds", () => {
    const qualifying = {
      ...snapshot([
        planet(
          "0x" + "1".repeat(40),
          {
            rank: 1,
            originVerified: true,
            marketCapUsd: 100_000,
            holderCount: 1_000,
            volumeH24: 25_000,
            marketObservedAt: now,
          },
          { originGalaxyId: "pons" },
        ),
      ]),
      galaxyId: "pons" as const,
    };
    const current = composeVolumeSky({ prototype: qualifying, live: qualifying, now });
    assert.equal(countLivePlanets(current), 1);
    assert.equal(current.particles.find((p) => p.metadata?.skyRole === "live")?.cosmicKind, "planet");

    const lowHolders = {
      ...qualifying,
      particles: qualifying.particles.map((p) => ({
        ...p,
        metadata: { ...p.metadata, holderCount: 700 },
      })),
    };
    assert.equal(countLivePlanets(composeVolumeSky({ prototype: lowHolders, live: lowHolders, now })), 0);

    const stale = composeVolumeSky({ prototype: qualifying, live: qualifying, now: now + 901_000 });
    assert.equal(countLivePlanets(stale), 0);
  });

  it("keeps retained Pump Field v0 token evidence visible without inventing missing market fields", () => {
    const mint = "Pump".padEnd(44, "1");
    const retained = planet(
      mint,
      {
        fieldContract: "v0",
        volumeSol24h: 18.4,
        lastTrade: { side: "buy", priceSol: 0.001, ts: now },
      },
      {
        originGalaxyId: "pump-fun",
        source: "indexer-field-v0",
      },
    );
    const live = { ...snapshot([retained]), galaxyId: "pump-fun" as const };
    const result = composeVolumeSky({ prototype: snapshot([]), live, now });
    const rendered = result.particles.find((p) => p.id === mint);
    assert.equal(rendered?.metadata?.skyRole, "live");
    assert.equal(rendered?.metadata?.skyAdmitted, true);
    assert.ok(Array.isArray(rendered?.metadata?.skyFlags));
    assert.equal(result.particles.some((p) => p.cosmicKind === "asteroid-belt"), false);
  });

  it("does not promote a Pump Field v0 token with no retained activity evidence", () => {
    const mint = "Pump".padEnd(44, "2");
    const empty = planet(
      mint,
      { fieldContract: "v0" },
      { originGalaxyId: "pump-fun", source: "indexer-field-v0" },
    );
    const live = { ...snapshot([empty]), galaxyId: "pump-fun" as const };
    assert.equal(countLivePlanets(composeVolumeSky({ prototype: snapshot([]), live, now })), 0);
  });

  it("normalizes legacy token-star and wallet-planet producer labels", () => {
    const token = { ...healthy("Mint".padEnd(44, "1"), 500), cosmicKind: "star" as const };
    const wallet: FieldParticle = {
      id: "w",
      kind: "wallet",
      cosmicKind: "planet",
      originGalaxyId: "pump-fun",
      verificationState: "observed",
      observedAt: now,
      category: "transfer",
      magnitudeBand: 0.5,
      position: [1, 2, 3],
      metadata: { wallet: "11111111111111111111111111111111" },
    };
    const result = composeVolumeSky({
      prototype: snapshot([]),
      live: { ...snapshot([token, wallet]), galaxyId: "pump-fun" },
      now,
    });
    assert.ok(result.particles.some((p) => p.kind === "token" && p.cosmicKind === "planet"));
    assert.ok(result.particles.some((p) => p.kind === "wallet" && p.cosmicKind === "star"));
  });

  it("ranks admitted planets by 5m heat and caps live at 120", () => {
    const bodies = Array.from({ length: 140 }, (_, i) =>
      healthy(`Mint${String(i).padStart(39, "0")}`, 10_000 - i),
    );
    const composed = composeVolumeSky({ prototype: snapshot([]), live: snapshot(bodies), now });
    assert.equal(
      composed.particles.filter((p) => p.cosmicKind === "planet" && p.metadata?.skyRole === "live").length,
      120,
    );
    assert.equal(countLivePlanets(composed), 120);
    assert.equal(/\bSAFE\b/.test(JSON.stringify(composed)), false);
  });
});
