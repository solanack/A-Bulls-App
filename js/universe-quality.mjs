const TIERS = Object.freeze({
  fallback: Object.freeze({ particleLimit: 0, pixelRatio: 1, bloom: false, trails: false, renderer: 'list' }),
  low: Object.freeze({ particleLimit: 2500, pixelRatio: 1, bloom: false, trails: false, renderer: 'webgl2' }),
  medium: Object.freeze({ particleLimit: 10000, pixelRatio: 1.25, bloom: true, trails: true, renderer: 'webgl2' }),
  high: Object.freeze({ particleLimit: 30000, pixelRatio: 1.5, bloom: true, trails: true, renderer: 'webgpu' })
});

export function initialUniverseQuality(capabilities = {}) {
  if (capabilities.reducedMotion || capabilities.saveData || !capabilities.webgl2) return 'fallback';
  if (capabilities.webgpu && Number(capabilities.deviceMemory ?? 0) >= 6) return 'high';
  if (Number(capabilities.deviceMemory ?? 0) >= 4) return 'medium';
  return 'low';
}

export function regressUniverseQuality(current) {
  if (current === 'high') return 'medium';
  if (current === 'medium') return 'low';
  return 'fallback';
}

export function improveUniverseQuality(current, capabilities = {}) {
  if (current === 'fallback' && capabilities.webgl2 && !capabilities.reducedMotion) return 'low';
  if (current === 'low' && Number(capabilities.deviceMemory ?? 0) >= 4) return 'medium';
  if (current === 'medium' && capabilities.webgpu && Number(capabilities.deviceMemory ?? 0) >= 6) return 'high';
  return current;
}

export function qualityProfile(tier) {
  return TIERS[tier] ?? TIERS.fallback;
}

export class FrameBudgetController {
  #tier;
  #slowFrames = 0;
  #fastFrames = 0;
  #capabilities;

  constructor(tier, capabilities = {}) {
    this.#tier = TIERS[tier] ? tier : initialUniverseQuality(capabilities);
    this.#capabilities = capabilities;
  }

  sample(frameMilliseconds) {
    const ms = Number(frameMilliseconds);
    if (!Number.isFinite(ms) || ms <= 0) return this.#tier;
    this.#slowFrames = ms > 24 ? this.#slowFrames + 1 : 0;
    this.#fastFrames = ms < 14 ? this.#fastFrames + 1 : 0;
    if (this.#slowFrames >= 20) {
      this.#tier = regressUniverseQuality(this.#tier);
      this.#slowFrames = 0;
      this.#fastFrames = 0;
    } else if (this.#fastFrames >= 300) {
      this.#tier = improveUniverseQuality(this.#tier, this.#capabilities);
      this.#slowFrames = 0;
      this.#fastFrames = 0;
    }
    return this.#tier;
  }

  get tier() { return this.#tier; }
  get profile() { return qualityProfile(this.#tier); }
}
