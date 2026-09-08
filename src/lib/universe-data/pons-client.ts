import type { FieldParticle, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";
import { fetchIntelligence } from "../intelligence-origin.ts";
export const PONS_GALAXY_PATH = "/api/intelligence/pons/galaxy";
export const PONS_GALAXY_URL = `https://abullsapp.com${PONS_GALAXY_PATH}`;
export const PONS_TEACHING_TOKEN = "0x39dbed3a2bd333467115de45665cc57f813c4571";

export function ponsTeachingParticle(): FieldParticle {
  return {
    id: `planet:pons:${PONS_TEACHING_TOKEN}`,
    eventId: "pons:teaching",
    kind: "token",
    cosmicKind: "planet",
    originGalaxyId: "pons",
    verificationState: "teaching",
    observedAt: Date.now(),
    category: "program",
    magnitudeBand: 0.82,
    position: [18, 4, 12],
    source: "pons-teaching",
    metadata: {
      mint: PONS_TEACHING_TOKEN,
      symbol: "PONS",
      name: "PONS",
      teaching: true,
      skyRole: "teaching",
      originVerified: false,
      chainId: 4663,
    },
  };
}

export function ponsTeachingSnapshot(): UniverseSnapshot {
  const particle = ponsTeachingParticle();
  const now = particle.observedAt;
  return {
    galaxyId: "pons",
    windowStart: now - 300_000,
    windowEnd: now,
    observedEventCount: 0,
    samplingPolicy:
      "pinned PONS query token; not a ranked member",
    coverageStatement:
      "No ranked PONS tokens are available yet. Tap the pinned PONS token to query its market data.",
    sources: ["pons-teaching"],
    particles: [particle],
  };
}

export type PonsLaunch = {
  rank: number;
  token: string;
  factory: string;
  factoryVersion: "v1" | "v2";
  curve: string | null;
  deployer: string;
  dexFactory: string | null;
  pairToken: string;
  pool: string | null;
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  blockTime: number | null;
  finality: string;
  state: string;
  market?: Record<string, unknown>;
};

type PonsGalaxyBody = {
  ok?: boolean;
  error?: string;
  data?: {
    generatedAt?: number;
    coverage?: { complete?: boolean; statement?: string };
    launches?: PonsLaunch[];
  };
};

export type PonsGalaxyDelivery = {
  snapshot: UniverseSnapshot | null;
  status: UniverseDataStatus;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function hashUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function marketNumber(market: Record<string, unknown> | undefined, key: string) {
  const value = market?.[key];
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

export function ponsLaunchToParticle(launch: PonsLaunch): FieldParticle {
  const angle = hashUnit(launch.token) * Math.PI * 2;
  const radius = 24 + hashUnit(`${launch.token}:radius`) * 62;
  const vertical = (hashUnit(`${launch.token}:height`) - 0.5) * 18;
  const marketCapUsd = marketNumber(launch.market, "marketCapUsd");
  const fdvUsd = marketNumber(launch.market, "fdvUsd");
  const priceUsd = marketNumber(launch.market, "priceUsd");
  const marketObservedAt = marketNumber(launch.market, "observedAt");
  const symbol = typeof launch.market?.symbol === "string" ? launch.market.symbol : null;
  const name = typeof launch.market?.name === "string" ? launch.market.name : null;
  const magnitudeBand =
    marketCapUsd !== null ? clamp01(0.45 + Math.log10(1 + marketCapUsd) / 16) : 0.42;
  const observedAt = launch.blockTime ?? Date.now();

  return {
    id: `planet:pons:${launch.token.toLowerCase()}`,
    eventId: `pons:${launch.transactionHash.toLowerCase()}`,
    kind: "token",
    cosmicKind: "planet",
    originGalaxyId: "pons",
    verificationState: launch.finality || "observed",
    observedAt,
    category: "program",
    magnitudeBand,
    position: [Math.cos(angle) * radius, vertical, Math.sin(angle) * radius],
    source: "verified-pons-factory-event",
    metadata: {
      chainId: 4663,
      rank: launch.rank,
      mint: launch.token,
      factory: launch.factory,
      factoryVersion: launch.factoryVersion,
      curve: launch.curve,
      deployer: launch.deployer,
      dexFactory: launch.dexFactory,
      pairToken: launch.pairToken,
      pool: launch.pool,
      transactionHash: launch.transactionHash,
      blockNumber: launch.blockNumber,
      blockHash: launch.blockHash,
      state: launch.state,
      symbol,
      name,
      priceUsd,
      marketCapUsd,
      fdvUsd,
      marketObservedAt,
      originVerified: true,
    },
  };
}

export function snapshotFromPonsLaunches(
  launches: readonly PonsLaunch[],
  input: { generatedAt?: number; disclosure?: string } = {},
): UniverseSnapshot {
  const particles = launches.map(ponsLaunchToParticle);
  const observed = particles.map((particle) => particle.observedAt).filter(Number.isFinite);
  const now = input.generatedAt ?? Date.now();
  const windowStart = observed.length ? Math.min(...observed) : now;
  const windowEnd = observed.length ? Math.max(now, ...observed) : now;
  return {
    galaxyId: "pons",
    windowStart,
    windowEnd,
    observedEventCount: particles.length,
    samplingPolicy:
      "stable top 25 by verified market cap; $500,000 floor; two qualifying cycles to enter and two misses to exit",
    coverageStatement:
      input.disclosure ??
      "PONS origin is verified from an allowlisted factory receipt. Market cap is provider-reported; FDV is never substituted.",
    sources: ["Bitquery Trading.Tokens", "Robinhood Chain RPC", "verified PONS V1/V2 factories"],
    particles,
  };
}

export async function loadPonsGalaxyDelivery(): Promise<PonsGalaxyDelivery> {
  try {
    const response = await fetchIntelligence(`${PONS_GALAXY_PATH}?limit=25`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return degraded("PONS endpoint returned a non-JSON response. No direct provider fallback was attempted.");
    }
    const body = (await response.json()) as PonsGalaxyBody;
    if (!response.ok || !body.ok || !body.data) {
      const disabled = response.status === 404 || body.error === "feature_disabled";
      return degraded(
        disabled
          ? "PONS rankings are disabled. Tap the pinned PONS token to query its market data."
          : "PONS top-25 index is unavailable. No unverified token feed was substituted.",
      );
    }
    const launches = body.data.launches ?? [];
    if (!launches.length) {
      return {
        snapshot: null,
        status: {
          store: "d1",
          coverage: "empty",
          circuitBreaker: null,
          disclosure: body.data.coverage?.statement ?? "No ranked PONS tokens are available yet.",
        },
      };
    }
    return {
      snapshot: snapshotFromPonsLaunches(launches, {
        generatedAt: body.data.generatedAt,
        disclosure: body.data.coverage?.statement,
      }),
      status: {
        store: "d1",
        coverage: launches.every((launch) => {
          const observed = marketNumber(launch.market, "observedAt");
          return observed != null && Date.now() - observed <= 900_000 && observed <= Date.now() + 120_000;
        }) ? "fresh" : "stale",
        circuitBreaker: null,
        disclosure:
          body.data.coverage?.statement ?? "Bounded verified PONS top-25 market-cap coverage.",
      },
    };
  } catch {
    return degraded("PONS top-25 index is unreachable. No browser-side market or RPC fallback was attempted.");
  }
}

function degraded(disclosure: string): PonsGalaxyDelivery {
  return {
    snapshot: null,
    status: {
      store: "memory-fallback",
      coverage: "degraded",
      circuitBreaker: null,
      disclosure,
    },
  };
}
