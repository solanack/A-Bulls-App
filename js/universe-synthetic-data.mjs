import { normalizeUniverseSnapshot } from './universe-contracts.mjs';

const KINDS = ['transaction','wallet','program','token','nft','cluster'];
const STATES = ['observed','confirmed','finalized','verified'];
const CATEGORIES = ['swap','transfer','nft','staking','program','failure'];

function generator(seed) {
  let value = (Number(seed) || 1) >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createSyntheticUniverse({
  seed = 861,
  count = 2500,
  windowStart = 1_000_000,
  durationSeconds = 60
} = {}) {
  const random = generator(seed);
  const boundedCount = Math.max(1, Math.min(50000, Math.trunc(Number(count) || 1)));
  const particles = Array.from({ length: boundedCount }, (_, index) => {
    const radius = 18 + random() * 82;
    const angle = random() * Math.PI * 2;
    const vertical = (random() - 0.5) * 70;
    return {
      id: `synthetic-${seed}-${index}`,
      kind: KINDS[index % KINDS.length],
      verificationState: STATES[index % STATES.length],
      observedAt: windowStart + random() * durationSeconds,
      category: CATEGORIES[index % CATEGORIES.length],
      magnitudeBand: random(),
      position: [
        Math.cos(angle) * radius,
        vertical,
        Math.sin(angle) * radius
      ]
    };
  });

  return normalizeUniverseSnapshot({
    windowStart,
    windowEnd: windowStart + durationSeconds,
    observedEventCount: boundedCount,
    samplingPolicy: 'synthetic deterministic prototype; not blockchain data',
    coverageStatement: 'Bounded activity window · sampled for exploration',
    sources: ['synthetic-prototype'],
    particles
  });
}
