import type { FieldParticle, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";
export const PONS_GALAXY_PATH = "/api/intelligence/pons/galaxy";
export const PONS_GALAXY_URL = `https://abullsapp.com${PONS_GALAXY_PATH}`;

export type PonsLaunch = {
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
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

export function ponsLaunchToParticle(launch: PonsLaunch): FieldParticle {
  const angle = hashUnit(launch.token) * Math.PI * 2;
  const radius = 24 + hashUnit(`${launch.token}:radius`) * 62;
  const vertical = (hashUnit(`${launch.token}:height`) - 0.5) * 18;
  const volumeH24 = marketNumber(launch.market, "volumeH24");
  const liquidityUsd = marketNumber(launch.market, "liquidityUsd");
  const priceUsd = marketNumber(launch.market, "priceUsd");
  const symbol = typeof launch.market?.symbol === "string" ? launch.market.symbol : null;
  const name = typeof launch.market?.name === "string" ? launch.market.name : null;
  const magnitudeBand =
    volumeH24 !== null
      ? clamp01(Math.log10(1 + volumeH24) / 7)
      : liquidityUsd !== null
        ? clamp01(Math.log10(1 + liquidityUsd) / 7)
        : 0.42;
  const observedAt = launch.blockTime ?? Date.now();

  return {
    id: `star:pons:${launch.token.toLowerCase()}`,
    eventId: `pons:${launch.transactionHash.toLowerCase()}`,
    kind: "token",
    cosmicKind: "star",
    originGalaxyId: "pons",
    verificationState: launch.finality || "observed",
    observedAt,
    category: "program",
    magnitudeBand,
    position: [Math.cos(angle) * radius, vertical, Math.sin(angle) * radius],
    source: "verified-pons-factory-event",
    metadata: {
      chainId: 4663,
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
      volumeH24,
      liquidityUsd,
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
    samplingPolicy: "bounded verified PONS factory launch events; newest first",
    coverageStatement:
      input.disclosure ??
      "PONS membership requires an allowlisted factory TokenLaunched event. Market enrichment may be unavailable.",
    sources: ["Robinhood Chain RPC", "verified PONS V1/V2 factories"],
    particles,
  };
}

export async function loadPonsGalaxyDelivery(): Promise<PonsGalaxyDelivery> {
  try {
    const response = await fetch(`${PONS_GALAXY_URL}?limit=250`, {
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
          ? "PONS verified index is staged but disabled. The prototype fabric remains visible."
          : "PONS verified index is unavailable. No unverified token feed was substituted.",
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
          disclosure: `${body.data.coverage?.statement ?? "PONS index is available."} Honest empty: no verified launches are indexed yet.`,
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
        coverage: body.data.coverage?.complete === true ? "fresh" : "stale",
        circuitBreaker: null,
        disclosure:
          body.data.coverage?.statement ?? "Bounded verified PONS launch-origin coverage.",
      },
    };
  } catch {
    return degraded("PONS verified index is unreachable. No browser-side market or RPC fallback was attempted.");
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
