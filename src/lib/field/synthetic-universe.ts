import type {
  FieldParticle,
  GalaxyDefinition,
  ParticleCategory,
  UniverseSnapshot,
} from "./types";
import { mulberry } from "./hash.ts";
import { cosmicKindForEntity, getGalaxy, preserveLaunchOrigin } from "./galaxies.ts";

const KINDS = ["transaction", "wallet", "program", "token", "nft", "cluster"] as const;
const STATES = ["observed", "confirmed", "finalized", "verified"] as const;
const CATEGORIES: ParticleCategory[] = [
  "swap",
  "transfer",
  "nft",
  "staking",
  "program",
  "failure",
];

export function createSyntheticUniverse(count = 2800, seed = 861): UniverseSnapshot {
  return createGalaxySnapshot(getGalaxy("galaxy-zero"), count, seed);
}

export function createGalaxySnapshot(
  galaxy: GalaxyDefinition,
  count = 2800,
  seed = galaxy.seed,
): UniverseSnapshot {
  if (galaxy.id === "galaxy-zero") return createUniverseMapSnapshot(count, seed);
  const random = mulberry(seed);
  const bounded = Math.max(400, Math.min(16000, Math.trunc(count)));
  const windowStart = 1_000_000;
  const durationSeconds = 60;
  const flatten = galaxy.id === "pons" ? 0.26 : galaxy.id === "pump-fun" ? 0.5 : 1;
  const particles: FieldParticle[] = Array.from({ length: bounded }, (_, index) => {
    const radius = galaxy.id === "pons" ? 22 + random() * 64 : 18 + random() * 82;
    const angle = random() * Math.PI * 2;
    const vertical = (random() - 0.5) * 70 * flatten;
    const kind = KINDS[index % KINDS.length];
    return {
      id: `${galaxy.id}-synthetic-${seed}-${index}`,
      kind,
      cosmicKind: cosmicKindForEntity(kind),
      originGalaxyId: preserveLaunchOrigin(undefined, galaxy.id),
      verificationState: STATES[index % STATES.length],
      observedAt: windowStart + random() * durationSeconds,
      category: CATEGORIES[index % CATEGORIES.length],
      magnitudeBand: random(),
      position: [Math.cos(angle) * radius, vertical, Math.sin(angle) * radius],
    };
  });

  return {
    galaxyId: galaxy.id,
    windowStart,
    windowEnd: windowStart + durationSeconds,
    observedEventCount: bounded,
    samplingPolicy: "synthetic deterministic prototype; not blockchain data",
    coverageStatement: "Bounded activity window · sampled for exploration",
    sources: galaxy.sources,
    particles,
  };
}

/** Galaxy Zero contains protocol galaxies, never synthetic chain entities. */
export const GALAXY_ZERO_CENTERS: readonly [number, number, number][] = [
  [-28, 18, -10],
  [28, 14, -6],
  [0, -24, 18],
];

export const GALAXY_ZERO_CAMERA_DISTANCE = 205;

export function createUniverseMapSnapshot(count = 2800, seed = 861): UniverseSnapshot {
  const random = mulberry(seed);
  const bounded = Math.max(600, Math.min(6000, Math.trunc(count)));
  const definitions = [getGalaxy("solana-core"), getGalaxy("pump-fun"), getGalaxy("pons")];
  const centers = GALAXY_ZERO_CENTERS;
  const particles: FieldParticle[] = [];
  const perGalaxy = Math.floor(bounded * 0.78 / definitions.length);
  for (const [galaxyIndex, target] of definitions.entries()) {
    const center = centers[galaxyIndex];
    for (let index = 0; index < perGalaxy; index += 1) {
      const arm = index % 3;
      const radius = 2.5 + Math.pow(random(), 0.62) * 17;
      const angle = radius * 0.31 + arm * Math.PI * 2 / 3 + (random() - 0.5) * 0.7;
      particles.push({
        id: `galaxy-map:${target.id}:${index}`,
        kind: "galaxy-node",
        cosmicKind: "galaxy",
        originGalaxyId: "galaxy-zero",
        verificationState: "directory",
        observedAt: 1_000_000,
        category: galaxyIndex === 0 ? "swap" : galaxyIndex === 1 ? "staking" : "program",
        magnitudeBand: index < 10 ? 1 : 0.22 + random() * 0.62,
        position: [center[0] + Math.cos(angle) * radius, center[1] + (random() - 0.5) * 4, center[2] + Math.sin(angle) * radius],
        source: "a-bulls-galaxy-directory",
        metadata: { targetGalaxyId: target.id, name: target.name, description: target.description, galaxyRole: index < 10 ? "core" : "fabric", interactive: true },
      });
    }
  }
  while (particles.length < bounded) {
    const radius = 105 + random() * 135;
    const angle = random() * Math.PI * 2;
    particles.push({ id: `galaxy-zero:expanse:${particles.length}`, kind: "expanse", cosmicKind: "ghost", originGalaxyId: "galaxy-zero", verificationState: "decorative", observedAt: 1_000_000, category: "unknown", magnitudeBand: 0.08 + random() * 0.22, position: [Math.cos(angle) * radius, (random() - 0.5) * 130, Math.sin(angle) * radius], source: "a-bulls-galaxy-directory", metadata: { galaxyRole: "expanse", interactive: false } });
  }
  return { galaxyId: "galaxy-zero", windowStart: 1_000_000, windowEnd: 1_000_060, observedEventCount: 0, samplingPolicy: "protocol galaxy directory; decorative expanse is not chain evidence", coverageStatement: "Galaxy Zero maps available protocol galaxies. Enter a galaxy for indexed activity.", sources: ["a-bulls-galaxy-directory"], particles };
}

export function createStarfield(count = 520, seed = 42) {
  const random = mulberry(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const radius = 90 + random() * 170;
    const angle = random() * Math.PI * 2;
    const vertical = (random() - 0.5) * 150;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = vertical;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    sizes[i] = 0.35 + random() * 1.35;
  }
  return { positions, sizes, count };
}
