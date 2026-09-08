import type { CosmicObjectKind, FieldParticle, JsonValue } from "./types";

export type CosmicVisualProfile = {
  readonly index: number;
  readonly label: string;
  readonly meaning: string;
  readonly minWorldSize: number;
  readonly maxWorldSize: number;
  readonly motion: "static" | "orbit" | "trail" | "pulse" | "portal" | "fade";
};

export const COSMIC_VISUALS: Record<CosmicObjectKind, CosmicVisualProfile> = Object.freeze({
  galaxy: Object.freeze({ index: 0, label: "GALAXY", meaning: "Launch ecosystem / origin", minWorldSize: 5.8, maxWorldSize: 12.5, motion: "static" }),
  star: Object.freeze({ index: 1, label: "STAR", meaning: "Observed public wallet / holder / trader", minWorldSize: 1.35, maxWorldSize: 4.9, motion: "pulse" }),
  planet: Object.freeze({ index: 2, label: "PLANET", meaning: "Token / mint", minWorldSize: 2.8, maxWorldSize: 7.2, motion: "orbit" }),
  moon: Object.freeze({ index: 3, label: "MOON", meaning: "Related NFT collection", minWorldSize: 0.95, maxWorldSize: 2.2, motion: "orbit" }),
  "asteroid-belt": Object.freeze({ index: 4, label: "ASTEROID BELT", meaning: "Observed liquidity / LP depth", minWorldSize: 4.6, maxWorldSize: 9.2, motion: "orbit" }),
  comet: Object.freeze({ index: 5, label: "COMET", meaning: "Large/current indexed trade", minWorldSize: 2.4, maxWorldSize: 6.1, motion: "trail" }),
  "black-hole": Object.freeze({ index: 6, label: "BLACK HOLE", meaning: "Collapsed / rugged token with indexed evidence", minWorldSize: 4.8, maxWorldSize: 8.5, motion: "static" }),
  supernova: Object.freeze({ index: 7, label: "SUPERNOVA", meaning: "Historical pump-and-death event", minWorldSize: 6.2, maxWorldSize: 10.8, motion: "pulse" }),
  wormhole: Object.freeze({ index: 8, label: "WORMHOLE", meaning: "Migration / bridge event", minWorldSize: 5.2, maxWorldSize: 9.2, motion: "portal" }),
  ghost: Object.freeze({ index: 9, label: "GHOST", meaning: "Dormant / collapsed historical trace", minWorldSize: 1.8, maxWorldSize: 4.6, motion: "fade" }),
  dust: Object.freeze({ index: 10, label: "DUST", meaning: "Decorative field fabric — not market evidence", minWorldSize: 0.22, maxWorldSize: 0.9, motion: "static" }),
});

export const COSMIC_KIND_INDEX: Record<CosmicObjectKind, number> = Object.freeze(
  Object.fromEntries(Object.entries(COSMIC_VISUALS).map(([kind, profile]) => [kind, profile.index])) as Record<CosmicObjectKind, number>,
);

function numeric(value: JsonValue | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}
function clamp01(value: number) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function logUnit(value: number | null, decades: number) { return value == null || value <= 0 ? null : clamp01(Math.log10(1 + value) / decades); }

export function renderCosmicKind(particle: Pick<FieldParticle, "cosmicKind" | "metadata" | "verificationState">): CosmicObjectKind {
  if (typeof particle.metadata?.targetGalaxyId === "string") return "galaxy";
  if (particle.metadata?.skyRole === "wallpaper" || particle.verificationState === "decorative") return "dust";
  return particle.cosmicKind;
}

export function cosmicWorldSize(particle: FieldParticle): number {
  const kind = renderCosmicKind(particle);
  const profile = COSMIC_VISUALS[kind];
  if (kind === "galaxy") {
    if (particle.metadata?.galaxyRole === "fabric") return 0.72 + clamp01(particle.magnitudeBand) * 0.9;
    if (particle.metadata?.galaxyRole === "core") return 9.5 + clamp01(particle.magnitudeBand) * 3;
  }
  if (kind === "dust") return profile.minWorldSize + clamp01(particle.magnitudeBand) * (profile.maxWorldSize - profile.minWorldSize);

  let evidenceUnit: number | null = null;
  if (kind === "planet") {
    evidenceUnit = logUnit(numeric(particle.metadata?.liquidityUsd), 7) ?? logUnit(numeric(particle.metadata?.marketCapUsd), 10) ?? logUnit(numeric(particle.metadata?.skyHeat), 8);
  } else if (kind === "star") {
    const observedShare = numeric(particle.metadata?.observedSharePct);
    const observatoryRank = numeric(particle.metadata?.observatoryRank);
    const net = numeric(particle.metadata?.observedNetToken);
    evidenceUnit = observedShare != null ? clamp01(observedShare / 100) : observatoryRank != null ? clamp01(1 - (observatoryRank - 1) / 58) : logUnit(net, 10);
  } else if (kind === "asteroid-belt") {
    evidenceUnit = logUnit(numeric(particle.metadata?.liquidityUsd), 7) ?? logUnit(numeric(particle.metadata?.liqSol), 5);
  } else if (kind === "comet") {
    evidenceUnit = logUnit(numeric(particle.metadata?.tradeUsd), 7) ?? logUnit(numeric(particle.metadata?.solAmount), 4);
  } else if (kind === "black-hole" || kind === "supernova") {
    evidenceUnit = numeric(particle.metadata?.score);
  }
  const unit = clamp01(evidenceUnit ?? particle.magnitudeBand);
  const liveBoost = ["live", "watch", "teaching"].includes(String(particle.metadata?.skyRole ?? "")) ? 1.08 : 1;
  return Math.min(profile.maxWorldSize, (profile.minWorldSize + unit * (profile.maxWorldSize - profile.minWorldSize)) * liveBoost);
}

export function cosmicLabel(kind: CosmicObjectKind) { return COSMIC_VISUALS[kind].label; }
export function cosmicMeaning(kind: CosmicObjectKind) { return COSMIC_VISUALS[kind].meaning; }
