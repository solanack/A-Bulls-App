import type {
  FieldParticle,
  GalaxyDefinition,
  ParticleCategory,
  UniverseSnapshot,
} from "./types";
import { mulberry } from "./hash";
import { cosmicKindForEntity, getGalaxy, preserveLaunchOrigin } from "./galaxies";

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
  const random = mulberry(seed);
  const bounded = Math.max(400, Math.min(16000, Math.trunc(count)));
  const windowStart = 1_000_000;
  const durationSeconds = 60;
  const particles: FieldParticle[] = Array.from({ length: bounded }, (_, index) => {
    const radius = 18 + random() * 82;
    const angle = random() * Math.PI * 2;
    const vertical = (random() - 0.5) * 70;
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
