import type { FieldParticle, GalaxyId, JsonValue, UniverseSnapshot } from "./types.ts";
import { mintKey } from "./watchlist.ts";

export const SKY_CAP = 120;
export const LIQ_FLOOR_USD = 10_000;
export const LIQ_FLOOR_SOL = 70;
export const MAX_M5_VOL_TO_LIQ = 8;
export const MIN_UNIQUE_TRADERS = 10;
export const MIN_PAIR_AGE_MS = 3 * 60 * 1000;
export const WINDOW_5M_MAX_MS = 400_000;
export const HELIUS_MEMBERSHIP_LIMIT = 10;
export const OBSERVED_CAP = 80;

export type HeatUnit = "usd" | "sol";
export type FiveMinuteHeat = { value: number; unit: HeatUnit };
export type SkyRole = "live" | "watch" | "teaching" | "observed" | "wallpaper";

export type WatchPin = {
  mint: string;
  galaxyId?: GalaxyId;
};

function isRecord(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numeric(value: JsonValue | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function nested(meta: Record<string, JsonValue> | undefined, path: string[]): JsonValue | undefined {
  let current: JsonValue | undefined = meta;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function lookalikeMint(id: string): string | null {
  const text = id.trim();
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)) return text;
  if (/^0x[a-fA-F0-9]{40}$/.test(text)) return text;
  return null;
}

export function particleMint(
  particle:
    | {
        id?: string;
        kind?: string;
        cosmicKind?: string;
        metadata?: Record<string, JsonValue> | undefined;
      }
    | null
    | undefined,
): string | null {
  const mint = particle?.metadata?.mint;
  if (typeof mint === "string" && mint.trim()) return mint.trim();
  if (particle && (particle.kind === "token" || particle.cosmicKind === "star" || particle.cosmicKind === "black-hole" || particle.cosmicKind === "supernova")) {
    const fromId = lookalikeMint(String(particle.id ?? ""));
    if (fromId) return fromId;
  }
  return null;
}

export function flattenMarketMetadata(particle: FieldParticle): FieldParticle {
  const meta = { ...(particle.metadata ?? {}) };
  const drivers = isRecord(meta.visualDrivers) ? meta.visualDrivers : null;
  const copyIfMissing = (key: string, source: JsonValue | undefined) => {
    if (numeric(meta[key]) == null && numeric(source) != null) meta[key] = numeric(source) as number;
  };
  if (drivers) {
    copyIfMissing("volumeSol24h", drivers.volumeSol24h);
    copyIfMissing("uniqueTraders24h", drivers.uniqueTraders24h);
    copyIfMissing("liqSol", drivers.liqSol);
  }
  const mint = particleMint({ ...particle, metadata: meta });
  if (mint && typeof meta.mint !== "string") meta.mint = mint;
  return { ...particle, metadata: meta };
}

export function volumeM5Usd(particle: FieldParticle): number | null {
  const meta = particle.metadata;
  return (
    numeric(meta?.volumeUsdM5) ??
    numeric(meta?.volumeM5) ??
    numeric(nested(meta, ["volumeUsd", "m5"])) ??
    numeric(nested(meta, ["market", "volumeUsd", "m5"]))
  );
}

export function volumeSolWindow(particle: FieldParticle): number | null {
  const meta = particle.metadata;
  return numeric(meta?.volumeSol24h) ?? numeric(nested(meta, ["visualDrivers", "volumeSol24h"])) ?? numeric(meta?.volumeSol);
}

export function liquidityUsd(particle: FieldParticle): number | null {
  return numeric(particle.metadata?.liquidityUsd) ?? numeric(particle.metadata?.liqUsd) ?? numeric(nested(particle.metadata, ["market", "liquidityUsd"]));
}

export function liquiditySol(particle: FieldParticle): number | null {
  return numeric(particle.metadata?.liqSol) ?? numeric(nested(particle.metadata, ["visualDrivers", "liqSol"]));
}

export function uniqueTraders(particle: FieldParticle): number | null {
  return (
    numeric(particle.metadata?.uniqueTraders24h) ??
    numeric(particle.metadata?.uniqueTraders) ??
    numeric(nested(particle.metadata, ["visualDrivers", "uniqueTraders24h"]))
  );
}

export function tapeM5(particle: FieldParticle): { buys: number | null; sells: number | null } {
  const buys =
    numeric(particle.metadata?.buysM5) ??
    numeric(nested(particle.metadata, ["transactions", "m5", "buys"])) ??
    numeric(nested(particle.metadata, ["market", "transactions", "m5", "buys"])) ??
    numeric(nested(particle.metadata, ["activity", "pressure", "m5", "buys"]));
  const sells =
    numeric(particle.metadata?.sellsM5) ??
    numeric(nested(particle.metadata, ["transactions", "m5", "sells"])) ??
    numeric(nested(particle.metadata, ["market", "transactions", "m5", "sells"])) ??
    numeric(nested(particle.metadata, ["activity", "pressure", "m5", "sells"]));
  return { buys, sells };
}

export function pairCreatedAt(particle: FieldParticle): number | null {
  return numeric(particle.metadata?.pairCreatedAt) ?? numeric(nested(particle.metadata, ["market", "pairCreatedAt"]));
}

export function fiveMinuteHeat(particle: FieldParticle, snapshot: Pick<UniverseSnapshot, "windowStart" | "windowEnd">): FiveMinuteHeat | null {
  const usd = volumeM5Usd(particle);
  if (usd != null && usd > 0) return { value: usd, unit: "usd" };
  const windowMs = snapshot.windowEnd - snapshot.windowStart;
  if (windowMs > 0 && windowMs <= WINDOW_5M_MAX_MS) {
    const sol = volumeSolWindow(particle);
    if (sol != null && sol > 0) return { value: sol, unit: "sol" };
  }
  return null;
}

export function formatHeat(heat: FiveMinuteHeat | null | undefined): string | null {
  if (!heat) return null;
  if (heat.unit === "usd") {
    return `5m ${heat.value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: heat.value < 1 ? 2 : 0 })}`;
  }
  return `5m ${heat.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`;
}

export function isTeachingBody(particle: FieldParticle): boolean {
  return particle.metadata?.teaching === true || particle.metadata?.skyRole === "teaching";
}

function watchedMint(particle: FieldParticle, watchlist: readonly WatchPin[]): boolean {
  const mint = particleMint(particle);
  if (!mint) return false;
  const key = mintKey(mint);
  return watchlist.some((item) => mintKey(item.mint) === key && (!item.galaxyId || item.galaxyId === particle.originGalaxyId));
}

export function admitStar(
  particle: FieldParticle,
  snapshot: Pick<UniverseSnapshot, "windowStart" | "windowEnd">,
  now = Date.now(),
): { admitted: boolean; flags: string[] } {
  const flags: string[] = [];
  const heat = fiveMinuteHeat(particle, snapshot);
  if (!heat) flags.push("missing-5m-heat");

  const liqUsd = liquidityUsd(particle);
  const liqSol = liquiditySol(particle);
  if (liqUsd == null && liqSol == null) flags.push("missing-liquidity");
  else if ((liqUsd == null || liqUsd < LIQ_FLOOR_USD) && (liqSol == null || liqSol < LIQ_FLOOR_SOL)) {
    flags.push("thin-liquidity");
  }

  const traders = uniqueTraders(particle);
  const { buys, sells } = tapeM5(particle);
  if (traders != null && traders < MIN_UNIQUE_TRADERS) flags.push("thin-traders");
  if (traders == null) {
    if (buys == null || sells == null) flags.push("missing-traders");
    else if (buys <= 0 || sells <= 0) flags.push("one-sided-tape");
  } else if (buys != null && sells != null && (buys <= 0 || sells <= 0)) {
    flags.push("one-sided-tape");
  }

  if (heat && (liqUsd != null || liqSol != null)) {
    const liq = heat.unit === "usd" ? liqUsd : liqSol;
    if (liq != null && liq > 0 && heat.value / liq > MAX_M5_VOL_TO_LIQ) flags.push("wash-like-velocity");
  }

  const created = pairCreatedAt(particle);
  if (created != null && now - created < MIN_PAIR_AGE_MS) flags.push("young-pair");

  if (isTeachingBody(particle)) flags.push("teaching-body");

  const blocking = flags.some((flag) =>
    ["missing-5m-heat", "missing-liquidity", "thin-liquidity", "thin-traders", "missing-traders", "one-sided-tape", "wash-like-velocity", "young-pair"].includes(flag),
  );
  return { admitted: !blocking && !isTeachingBody(particle), flags };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function withSkyMeta(
  particle: FieldParticle,
  extra: Record<string, JsonValue>,
): FieldParticle {
  return {
    ...particle,
    metadata: { ...(particle.metadata ?? {}), ...extra },
  };
}

function heatScore(heat: FiveMinuteHeat | null): number {
  if (!heat) return 0;
  return heat.unit === "usd" ? heat.value + 1e12 : heat.value;
}

export function isLiveSkyParticle(particle: FieldParticle): boolean {
  const role = particle.metadata?.skyRole;
  if (role === "wallpaper") return false;
  if (role === "live" || role === "watch" || role === "teaching" || role === "observed") return true;
  const mint = particleMint(particle);
  return Boolean(mint && particle.source && particle.source !== "synthetic-prototype");
}

export function countLiveStars(snapshot: UniverseSnapshot): number {
  return snapshot.particles.filter((particle) => {
    const role = particle.metadata?.skyRole;
    return (particle.cosmicKind === "star" || particle.cosmicKind === "black-hole" || particle.cosmicKind === "supernova") && role === "live";
  }).length;
}

export function composeVolumeSky(input: {
  prototype: UniverseSnapshot;
  live: UniverseSnapshot | null;
  watchlist?: readonly WatchPin[];
  wallpaperLimit?: number;
  now?: number;
}): UniverseSnapshot {
  const now = input.now ?? Date.now();
  const watchlist = input.watchlist ?? [];
  const live = input.live;
  const prototype = input.prototype;
  const galaxyId = live?.galaxyId ?? prototype.galaxyId;
  const snapshotWindow = live ?? prototype;
  const flattened = (live?.particles ?? []).map(flattenMarketMetadata);

  const stars = flattened.filter((particle) => particle.cosmicKind === "star" || particle.cosmicKind === "black-hole" || particle.cosmicKind === "supernova");
  const comets = flattened.filter((particle) => particle.cosmicKind === "comet");
  const planets = flattened.filter((particle) => particle.cosmicKind === "planet");
  const other = flattened.filter(
    (particle) =>
      particle.cosmicKind !== "star" &&
      particle.cosmicKind !== "black-hole" &&
      particle.cosmicKind !== "supernova" &&
      particle.cosmicKind !== "comet" &&
      particle.cosmicKind !== "planet",
  );

  type Ranked = { particle: FieldParticle; heat: FiveMinuteHeat | null; pin: boolean; flags: string[]; admitted: boolean };
  const ranked: Ranked[] = [];
  for (const star of stars) {
    const teaching = isTeachingBody(star);
    const watched = watchedMint(star, watchlist);
    const ponsRank = numeric(star.metadata?.rank);
    const ponsMarketAt = numeric(star.metadata?.marketObservedAt);
    const ponsCap = numeric(star.metadata?.marketCapUsd);
    const verifiedPonsRank = galaxyId === "pons" && star.metadata?.originVerified === true && ponsRank != null && ponsRank >= 1 && ponsRank <= 25 && ponsCap != null && ponsCap >= 500_000;
    const verdict = verifiedPonsRank
      ? { admitted: ponsMarketAt != null && now - ponsMarketAt <= 15 * 60_000 && ponsMarketAt <= now + 120_000, flags: ponsMarketAt == null || now - ponsMarketAt > 15 * 60_000 ? ["stale-market"] : [] }
      : admitStar(star, snapshotWindow, now);
    const flags = [...verdict.flags];
    if (watched) flags.push("watch-pin");
    if (teaching && !flags.includes("teaching-body")) flags.push("teaching-body");
    const pin = watched || teaching;
    if (!verdict.admitted && !pin) {
      ranked.push({ particle: star, heat: fiveMinuteHeat(star, snapshotWindow), pin: false, flags, admitted: false });
      continue;
    }
    ranked.push({
      particle: star,
      heat: fiveMinuteHeat(star, snapshotWindow),
      pin,
      flags,
      admitted: verdict.admitted,
    });
  }

  ranked.sort((a, b) => Number(b.pin) - Number(a.pin) || (galaxyId === "pons" ? (numeric(a.particle.metadata?.rank) ?? 26) - (numeric(b.particle.metadata?.rank) ?? 26) : heatScore(b.heat) - heatScore(a.heat)));
  const pinCount = ranked.filter((row) => row.pin).length;
  const liveRoom = Math.max(SKY_CAP, pinCount);
  const board = ranked.filter((row) => row.admitted || row.pin);
  const chosen = board.filter((row, index) => row.pin || index < liveRoom).slice(0, liveRoom);
  const chosenIds = new Set(chosen.map((row) => row.particle.id));

  const skyStars = chosen.map((row) => {
    const heat = row.heat;
    const role: SkyRole = isTeachingBody(row.particle)
      ? "teaching"
      : row.flags.includes("watch-pin") && !row.admitted
        ? "watch"
        : "live";
    const magnitude = heat
      ? clamp01(0.55 + Math.log10(1 + heat.value) / 8)
      : role === "teaching"
        ? 0.82
        : 0.62;
    return withSkyMeta(
      { ...row.particle, magnitudeBand: Math.max(row.particle.magnitudeBand, magnitude) },
      {
        skyRole: role,
        skyFlags: row.flags,
        skyHeat: heat?.value ?? null,
        skyHeatUnit: heat?.unit ?? null,
        skyAdmitted: row.admitted,
      },
    );
  });

  const observed = ranked
    .filter((row) => !chosenIds.has(row.particle.id))
    .slice(0, OBSERVED_CAP)
    .map((row) =>
      withSkyMeta(row.particle, {
        skyRole: "observed",
        skyFlags: row.flags,
        skyHeat: row.heat?.value ?? null,
        skyHeatUnit: row.heat?.unit ?? null,
        skyAdmitted: false,
      }),
    );

  const liveComets = comets
    .sort((a, b) => b.observedAt - a.observedAt)
    .slice(0, 40)
    .map((particle) => withSkyMeta(particle, { skyRole: "live" }));
  const livePlanets = planets.slice(0, 40).map((particle) => withSkyMeta(particle, { skyRole: "live" }));
  const liveOther = other.slice(0, 20).map((particle) => withSkyMeta(particle, { skyRole: "live" }));

  const liveParticles = [...skyStars, ...observed, ...liveComets, ...livePlanets, ...liveOther];
  const liveIds = new Set(liveParticles.map((particle) => particle.id));
  const particleBudget = Math.max(1, input.wallpaperLimit ?? 2800);
  const wallpaperBudget = Math.max(0, particleBudget - liveParticles.length);
  const wallpaper = prototype.particles
    .filter((particle) => !liveIds.has(particle.id))
    .slice(0, wallpaperBudget)
    .map((particle) => withSkyMeta(particle, { skyRole: "wallpaper" }));

  const particles = [...liveParticles, ...wallpaper].slice(0, particleBudget);
  const times = particles.map((particle) => particle.observedAt);
  const windowStart = live?.windowStart ?? (times.length ? Math.min(...times) : now);
  const windowEnd = live?.windowEnd ?? (times.length ? Math.max(...times) : now);
  const liveCount = countLiveStars({ ...prototype, particles: liveParticles });

  return {
    galaxyId,
    windowStart,
    windowEnd,
    observedEventCount: live?.observedEventCount ?? 0,
    samplingPolicy: galaxyId === "pons" ? "PONS verified market-cap top 25; $500,000 floor; stale observations flagged; watchlist pins" : `volume-sky-5m-only cap ${SKY_CAP}; wash gates; watchlist pins; Helius membership stays ${HELIUS_MEMBERSHIP_LIMIT}`,
    coverageStatement: galaxyId === "galaxy-zero" ? prototype.coverageStatement : `${live?.coverageStatement ?? prototype.coverageStatement} ${galaxyId === "pons" ? "Market-cap ranking" : "5m market activity"} · ${liveCount} current tokens. Other observed tokens remain available to query.`,
    sources: [...new Set([...(live?.sources ?? []), ...prototype.sources, "volume-sky-5m"])],
    particles,
  };
}
