/**
 * Field v0 adapter — maps Indexer Field contract events/snapshots into
 * Galaxy Zero FieldParticle / UniverseSnapshot shapes.
 *
 * Evidence-only: never invent metrics. Missing lifecycle signals stay
 * incomplete:true (or are omitted). Trade + planet linked-mints are the
 * first live path; dying / exit / birth / wormhole light up when Indexer
 * emits real derived evidence.
 */

import type {
  CosmicObjectKind,
  FieldParticle,
  GalaxyId,
  ParticleCategory,
  UniverseSnapshot,
} from "./types";
import {
  canonicalUniverseId,
  cosmicKindForEntity,
  preserveLaunchOrigin,
} from "./galaxies";

export const FIELD_V0_VERSION = 1 as const;

export type FieldV0Envelope = {
  readonly v: typeof FIELD_V0_VERSION;
  readonly chain: "solana";
  readonly ts: number;
  readonly source: "helius" | "pumpfun" | "derived";
  readonly mint: string;
  readonly sig: string | null;
};

export type FieldV0TradeEvent = FieldV0Envelope & {
  readonly type: "token.trade";
  readonly side: "buy" | "sell";
  readonly wallet: string;
  readonly solAmount: number;
  readonly tokenAmount: number;
  readonly priceSol: number;
  readonly slot: number;
};

export type FieldV0BirthEvent = FieldV0Envelope & {
  readonly type: "token.birth";
  readonly creator: string;
  readonly name?: string;
  readonly symbol?: string;
  readonly uri?: string;
  readonly bondingCurve?: string;
};

export type FieldV0GraduatedEvent = FieldV0Envelope & {
  readonly type: "token.graduated" | "token.migrated";
  readonly from: string;
  readonly to: string;
  readonly pool: string;
};

export type FieldV0DyingEvent = FieldV0Envelope & {
  readonly type: "token.dying";
  readonly reason: readonly ("liquidity_drain" | "activity_collapse" | "holder_decay")[];
  readonly score: number;
  readonly metrics?: {
    readonly uniqueTraders24h?: number;
    readonly volumeSol24h?: number;
    readonly holderDelta24h?: number;
    readonly liqSol?: number;
  };
  readonly evidence?: readonly string[];
  readonly incomplete?: boolean;
};

export type FieldV0HolderExitEvent = FieldV0Envelope & {
  readonly type: "holder.exit";
  readonly wallet: string;
  readonly soldAmount: number;
  readonly solReceived: number;
  readonly remainingPct: number;
  readonly isFullExit: boolean;
};

export type FieldV0Event =
  | FieldV0TradeEvent
  | FieldV0BirthEvent
  | FieldV0GraduatedEvent
  | FieldV0DyingEvent
  | FieldV0HolderExitEvent;

export type FieldV0StarSnapshot = {
  readonly mint: string;
  readonly symbol?: string;
  readonly name?: string;
  readonly state: "birth" | "active" | "graduating" | "migrated" | "dying";
  readonly visualDrivers?: {
    readonly score?: number;
    readonly volumeSol24h?: number;
    readonly uniqueTraders24h?: number;
    readonly liqSol?: number;
    readonly holderDelta24h?: number;
  };
  readonly lastTrade?: {
    readonly side: "buy" | "sell";
    readonly priceSol: number;
    readonly ts: number;
  } | null;
  readonly wormhole?: {
    readonly from: string;
    readonly to: string;
    readonly pool: string;
  } | null;
  readonly incomplete?: boolean;
};

export type FieldV0PlanetSnapshot = {
  readonly wallet: string;
  readonly linkedMints: readonly string[];
  readonly exits?: readonly {
    readonly mint: string;
    readonly remainingPct: number;
    readonly isFullExit: boolean;
    readonly solReceived?: number;
    readonly ts: number;
  }[];
  readonly netSolDelta24h?: number;
  readonly incomplete?: boolean;
};

export type FieldV0AdaptOptions = {
  readonly galaxyId?: GalaxyId;
  readonly windowStart?: number;
  readonly windowEnd?: number;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function hashUnit(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function positionForId(id: string, radiusBase = 28, radiusSpan = 70): [number, number, number] {
  const u = hashUnit(id);
  const v = hashUnit(`${id}:y`);
  const w = hashUnit(`${id}:z`);
  const radius = radiusBase + u * radiusSpan;
  const angle = v * Math.PI * 2;
  const vertical = (w - 0.5) * 64;
  return [Math.cos(angle) * radius, vertical, Math.sin(angle) * radius];
}

function starCosmicKind(star: FieldV0StarSnapshot): CosmicObjectKind {
  if (star.state === "dying" && star.incomplete !== true) return "black-hole";
  if (star.state === "migrated" && star.wormhole) return "wormhole";
  if (star.state === "birth") return "star";
  return cosmicKindForEntity("token");
}

function magnitudeFromDrivers(star: FieldV0StarSnapshot): number {
  const drivers = star.visualDrivers;
  if (!drivers) return 0.35;
  if (star.state === "dying" && typeof drivers.score === "number") {
    return clamp01(drivers.score);
  }
  if (typeof drivers.volumeSol24h === "number") {
    return clamp01(Math.log10(1 + Math.max(0, drivers.volumeSol24h)) / 4);
  }
  if (typeof drivers.liqSol === "number") {
    return clamp01(Math.log10(1 + Math.max(0, drivers.liqSol)) / 4);
  }
  return 0.35;
}

/** Map an Indexer star snapshot into a Field particle (token → star / black-hole / wormhole). */
export function starToParticle(
  star: FieldV0StarSnapshot,
  options: FieldV0AdaptOptions = {},
): FieldParticle {
  const galaxyId = options.galaxyId ?? "pump-fun";
  const originGalaxyId = preserveLaunchOrigin(undefined, galaxyId);
  const cosmicKind = starCosmicKind(star);
  const id = canonicalUniverseId(cosmicKind === "wormhole" ? "wormhole" : cosmicKind === "black-hole" ? "black-hole" : "star", star.mint, originGalaxyId);
  const observedAt = star.lastTrade?.ts ?? options.windowEnd ?? Date.now();
  const incomplete = star.incomplete === true;

  return {
    id,
    eventId: star.lastTrade ? `trade:${star.mint}:${star.lastTrade.ts}` : undefined,
    kind: star.state === "dying" ? "dying-token" : "token",
    cosmicKind,
    originGalaxyId,
    verificationState: incomplete ? "incomplete" : "observed",
    observedAt,
    category: star.lastTrade?.side === "sell" ? "transfer" : "swap",
    magnitudeBand: magnitudeFromDrivers(star),
    position: positionForId(star.mint),
    source: "indexer-field-v0",
    metadata: {
      mint: star.mint,
      symbol: star.symbol ?? null,
      name: star.name ?? null,
      state: star.state,
      incomplete,
      visualDrivers: star.visualDrivers ?? null,
      lastTrade: star.lastTrade ?? null,
      wormhole: star.wormhole ?? null,
      fieldContract: "v0",
    },
  };
}

/** Map an Indexer planet snapshot into a Field particle (wallet → planet). */
export function planetToParticle(
  planet: FieldV0PlanetSnapshot,
  options: FieldV0AdaptOptions = {},
): FieldParticle {
  const galaxyId = options.galaxyId ?? "pump-fun";
  const originGalaxyId = preserveLaunchOrigin(undefined, galaxyId);
  const id = canonicalUniverseId("planet", planet.wallet, originGalaxyId);
  const exits = planet.exits ?? [];
  const latestExit = exits.reduce<
    (typeof exits)[number] | null
  >((best, exit) => (!best || exit.ts > best.ts ? exit : best), null);
  const observedAt = latestExit?.ts ?? options.windowEnd ?? Date.now();
  const incomplete = planet.incomplete === true;

  return {
    id,
    kind: "wallet",
    cosmicKind: "planet",
    originGalaxyId,
    verificationState: incomplete ? "incomplete" : "observed",
    observedAt,
    category: "transfer",
    magnitudeBand: clamp01(exits.length / 8),
    position: positionForId(planet.wallet, 18, 55),
    source: "indexer-field-v0",
    metadata: {
      wallet: planet.wallet,
      linkedMints: [...planet.linkedMints],
      exits: exits.map((exit) => ({ ...exit })),
      netSolDelta24h: planet.netSolDelta24h ?? null,
      incomplete,
      hasExitTrails: exits.length > 0 && !incomplete,
      fieldContract: "v0",
    },
  };
}

/** Map a live token.trade event into a comet pulse particle. */
export function tradeToParticle(
  trade: FieldV0TradeEvent,
  options: FieldV0AdaptOptions = {},
): FieldParticle {
  const galaxyId = options.galaxyId ?? "pump-fun";
  const originGalaxyId = preserveLaunchOrigin(undefined, galaxyId);
  const id = canonicalUniverseId(
    "comet",
    trade.sig ?? `${trade.mint}:${trade.ts}:${trade.wallet}`,
    originGalaxyId,
  );
  const category: ParticleCategory = trade.side === "buy" ? "swap" : "transfer";

  return {
    id,
    eventId: trade.sig ?? undefined,
    kind: "transaction",
    cosmicKind: "comet",
    originGalaxyId,
    verificationState: "observed",
    observedAt: trade.ts,
    category,
    magnitudeBand: clamp01(Math.log10(1 + Math.max(0, trade.solAmount)) / 3),
    position: positionForId(id, 40, 90),
    source: trade.source,
    slot: trade.slot,
    metadata: {
      type: trade.type,
      mint: trade.mint,
      wallet: trade.wallet,
      side: trade.side,
      solAmount: trade.solAmount,
      tokenAmount: trade.tokenAmount,
      priceSol: trade.priceSol,
      sig: trade.sig,
      fieldContract: "v0",
    },
  };
}

/**
 * Map holder.exit into a short-lived exit-trail cue attached to a planet identity.
 * Returns null when the event is incomplete / not evidence-backed.
 */
export function holderExitToParticle(
  exit: FieldV0HolderExitEvent & { incomplete?: boolean },
  options: FieldV0AdaptOptions = {},
): FieldParticle | null {
  if (exit.incomplete === true) return null;
  const galaxyId = options.galaxyId ?? "pump-fun";
  const originGalaxyId = preserveLaunchOrigin(undefined, galaxyId);
  const id = `exit:${exit.wallet}:${exit.mint}:${exit.ts}`;

  return {
    id,
    eventId: exit.sig ?? undefined,
    kind: "holder-exit",
    cosmicKind: "planet",
    originGalaxyId,
    verificationState: "observed",
    observedAt: exit.ts,
    category: "transfer",
    magnitudeBand: clamp01(1 - exit.remainingPct),
    position: positionForId(exit.wallet, 18, 55),
    source: exit.source,
    metadata: {
      type: exit.type,
      wallet: exit.wallet,
      mint: exit.mint,
      soldAmount: exit.soldAmount,
      solReceived: exit.solReceived,
      remainingPct: exit.remainingPct,
      isFullExit: exit.isFullExit,
      exitTrail: true,
      fieldContract: "v0",
    },
  };
}

/** Map token.dying — only when not incomplete. Otherwise returns null (honest empty). */
export function dyingToParticle(
  dying: FieldV0DyingEvent,
  options: FieldV0AdaptOptions = {},
): FieldParticle | null {
  if (dying.incomplete === true) return null;
  const galaxyId = options.galaxyId ?? "pump-fun";
  const originGalaxyId = preserveLaunchOrigin(undefined, galaxyId);
  const id = canonicalUniverseId("black-hole", dying.mint, originGalaxyId);

  return {
    id,
    eventId: dying.sig ?? undefined,
    kind: "dying-token",
    cosmicKind: "black-hole",
    originGalaxyId,
    verificationState: "derived",
    observedAt: dying.ts,
    category: "failure",
    magnitudeBand: clamp01(dying.score),
    position: positionForId(dying.mint),
    source: dying.source,
    metadata: {
      type: dying.type,
      mint: dying.mint,
      reason: [...dying.reason],
      score: dying.score,
      metrics: dying.metrics ?? null,
      evidence: dying.evidence ? [...dying.evidence] : null,
      incomplete: false,
      fieldContract: "v0",
    },
  };
}

export function buildUniverseSnapshotFromFieldV0(input: {
  readonly stars?: readonly FieldV0StarSnapshot[];
  readonly planets?: readonly FieldV0PlanetSnapshot[];
  readonly events?: readonly FieldV0Event[];
  readonly options?: FieldV0AdaptOptions;
}): UniverseSnapshot {
  const options = input.options ?? {};
  const galaxyId = options.galaxyId ?? "pump-fun";
  const particles: FieldParticle[] = [];

  for (const star of input.stars ?? []) {
    particles.push(starToParticle(star, options));
  }
  for (const planet of input.planets ?? []) {
    particles.push(planetToParticle(planet, options));
  }
  for (const event of input.events ?? []) {
    if (event.type === "token.trade") {
      particles.push(tradeToParticle(event, options));
      continue;
    }
    if (event.type === "token.dying") {
      const particle = dyingToParticle(event, options);
      if (particle) particles.push(particle);
      continue;
    }
    if (event.type === "holder.exit") {
      const particle = holderExitToParticle(event, options);
      if (particle) particles.push(particle);
    }
  }

  const times = particles.map((p) => p.observedAt);
  const windowStart = options.windowStart ?? (times.length ? Math.min(...times) : Date.now());
  const windowEnd = options.windowEnd ?? (times.length ? Math.max(...times) : windowStart);

  return {
    galaxyId,
    windowStart,
    windowEnd,
    observedEventCount: particles.length,
    samplingPolicy: "indexer-field-v0 evidence-only; incomplete signals omitted or labeled",
    coverageStatement:
      particles.length > 0
        ? "Field v0 adapter · evidence-backed particles only"
        : "Field v0 adapter · no evidence yet (honest empty)",
    sources: ["indexer-field-v0"],
    particles,
  };
}
