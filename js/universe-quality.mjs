const TIERS = Object.freeze({
  canvas: Object.freeze({ particleLimit: 900, pixelRatio: 1, bloom: false, trails: false, renderer: 'canvas' }),
  low: Object.freeze({ particleLimit: 2500, pixelRatio: 1, bloom: false, trails: false, renderer: 'webgl' }),
  medium: Object.freeze({ particleLimit: 8000, pixelRatio: 1.25, bloom: true, trails: true, renderer: 'webgl' }),
  high: Object.freeze({ particleLimit: 16000, pixelRatio: 1.5, bloom: true, trails: true, renderer: 'webgl' })
});

function hasGpu(capabilities = {}) {
  return Boolean(capabilities.webgl2 || capabilities.webgl);
}

export function initialUniverseQuality(capabilities = {}) {
  if (!hasGpu(capabilities)) return 'canvas';
  if (capabilities.reducedMotion || capabilities.saveData) return 'low';
  if (Number(capabilities.deviceMemory ?? 0) >= 6) return 'high';
  if (Number(capabilities.deviceMemory ?? 0) >= 4) return 'medium';
  return 'low';
}

export function regressUniverseQuality(current) {
  if (current === 'high') return 'medium';
  if (current === 'medium') return 'low';
  return current;
}

export function improveUniverseQuality(current, capabilities = {}) {
  if (current === 'canvas' && hasGpu(capabilities)) return 'low';
  if (current === 'low' && Number(capabilities.deviceMemory ?? 0) >= 4 && !capabilities.saveData) return 'medium';
  if (current === 'medium' && Number(capabilities.deviceMemory ?? 0) >= 6) return 'high';
  return current;
}

export function qualityProfile(tier) {
  return TIERS[tier] ?? TIERS.canvas;
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
    this.#slowFrames = ms > 28 ? this.#slowFrames + 1 : 0;
    this.#fastFrames = ms < 14 ? this.#fastFrames + 1 : 0;
    if (this.#slowFrames >= 28) {
      this.#tier = regressUniverseQuality(this.#tier);
      this.#slowFrames = 0;
      this.#fastFrames = 0;
    } else if (this.#fastFrames >= 360) {
      this.#tier = improveUniverseQuality(this.#tier, this.#capabilities);
      this.#slowFrames = 0;
      this.#fastFrames = 0;
    }
    return this.#tier;
  }

  get tier() { return this.#tier; }
  get profile() { return qualityProfile(this.#tier); }
}
