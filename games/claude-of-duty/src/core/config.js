/**
 * Central tuning + quality configuration.
 *
 * Performance: mobile applies the low tier at boot (renderScale 0.52, 50 Hz
 * physics, no bloom/TAA/SSR/GTAO) instead of probing on a heavier preset
 * for three seconds and hitching.
 */

export const PHYSICS_HZ = 120;
export const FIXED_DT = 1 / PHYSICS_HZ;
export const MAX_SUBSTEPS = 8;

export const MOBILE_TIERS = {
  low: {
    renderScale: 0.72, physicsHz: 50, maxSubsteps: 2,
    bloomEnabled: false, maxRagdolls: 3, ragdollIterations: 3,
  },
  balanced: {
    renderScale: 0.82, physicsHz: 60, maxSubsteps: 3,
    bloomEnabled: true, maxRagdolls: 4, ragdollIterations: 4,
  },
  high: {
    renderScale: 0.92, physicsHz: 72, maxSubsteps: 4,
    bloomEnabled: true, maxRagdolls: 6, ragdollIterations: 5,
  },
};

export const UNITS = {
  gravity: -9.81 * 2.1,
  playerHeight: 1.78,
  playerCrouchHeight: 1.12,
  playerRadius: 0.32,
  eyeOffset: 0.12,
};

export const QUALITY_PRESETS = {
  low: {
    renderScale: 0.78,
    shadowMapSize: 1024,
    cascades: 2,
    shadowDistance: 56,
    taa: false,
    gtao: false,
    ssr: false,
    volumetrics: false,
    motionBlur: false,
    bloom: false,
    anisotropy: 4,
    particleBudget: 1400,
    decalBudget: 48,
  },
  medium: {
    renderScale: 0.85,
    shadowMapSize: 1024,
    cascades: 3,
    shadowDistance: 90,
    taa: true,
    gtao: true,
    ssr: false,
    volumetrics: false,
    motionBlur: false,
    bloom: true,
    anisotropy: 4,
    particleBudget: 4000,
    decalBudget: 96,
  },
  high: {
    renderScale: 1.0,
    shadowMapSize: 2048,
    cascades: 3,
    shadowDistance: 120,
    taa: true,
    gtao: true,
    ssr: false,
    volumetrics: true,
    motionBlur: true,
    bloom: true,
    anisotropy: 8,
    particleBudget: 8000,
    decalBudget: 160,
  },
  ultra: {
    renderScale: 1.0,
    shadowMapSize: 2048,
    cascades: 4,
    shadowDistance: 200,
    taa: true,
    gtao: true,
    ssr: true,
    volumetrics: true,
    motionBlur: true,
    bloom: true,
    anisotropy: 16,
    particleBudget: 16000,
    decalBudget: 256,
  },
};

export const DEFAULTS = {
  quality: 'high',
  fov: 80,
  adsFovScale: 0.72,
  sensitivity: 0.0022,
  adsSensScale: 0.65,
  touchSensitivity: 0.0034,
  turnSensitivity: 1,
  autoAim: true,
  invertY: false,
  exposure: 1.0,
  deterministic: false,
};

export function createConfig(overrides = {}) {
  const cfg = { ...DEFAULTS, ...overrides };
  if (cfg.mobile && !overrides.quality) cfg.quality = 'low';
  cfg.q = { ...QUALITY_PRESETS[cfg.quality] };
  cfg.physicsHz = cfg.mobile ? MOBILE_TIERS.low.physicsHz : PHYSICS_HZ;
  cfg.maxSubsteps = cfg.mobile ? MOBILE_TIERS.low.maxSubsteps : MAX_SUBSTEPS;
  cfg.mobileTier = cfg.mobile ? 'low' : null;
  cfg.bloomEnabled = cfg.q.bloom;
  cfg.maxRagdolls = cfg.mobile ? 2 : 8;
  cfg.ragdollIterations = cfg.mobile ? 3 : 8;
  cfg.setQuality = (name) => {
    if (!QUALITY_PRESETS[name]) throw new Error(`unknown quality preset "${name}"`);
    cfg.quality = name;
    Object.assign(cfg.q, QUALITY_PRESETS[name]);
  };
  cfg.applyMobileTier = (name) => {
    const tier = MOBILE_TIERS[name];
    if (!tier) throw new Error(`unknown mobile tier "${name}"`);
    cfg.mobileTier = name;
    cfg.physicsHz = tier.physicsHz;
    cfg.maxSubsteps = tier.maxSubsteps;
    cfg.bloomEnabled = tier.bloomEnabled;
    cfg.maxRagdolls = tier.maxRagdolls;
    cfg.ragdollIterations = tier.ragdollIterations;
    cfg.q.renderScale = tier.renderScale;
    if (!tier.bloomEnabled) cfg.q.bloom = false;
    return tier;
  };
  if (cfg.mobile) cfg.applyMobileTier('low');
  return cfg;
}
