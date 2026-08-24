/**
 * Runtime quality governor.
 *
 * Performance: starts from the already-applied low tier and only *upgrades*
 * after a 2s probe. Never spends the first seconds on a heavier pipeline.
 */

const PROBE_SECONDS = 2;
const VERIFY_SECONDS = 2;

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function summarize(samples) {
  return {
    frames: samples.length,
    medianMs: +percentile(samples, 0.5).toFixed(2),
    p95Ms: +percentile(samples, 0.95).toFixed(2),
    averageFps: +(1000 / (samples.reduce((a, b) => a + b, 0) / samples.length)).toFixed(1),
  };
}

function chooseTier(stats) {
  if (stats.medianMs <= 14.5 && stats.p95Ms <= 20) return 'high';
  if (stats.medianMs <= 20 && stats.p95Ms <= 28) return 'balanced';
  return 'low';
}

export class MobilePerformanceGovernor {
  constructor(engine) {
    this.engine = engine;
    this.enabled = !!engine.config.mobile && !engine.config.deterministic;
    this.phase = 'before';
    this.elapsed = 0;
    this.samples = [];
    this._hudTick = 0;
    this.report = { device: this.deviceInfo(), before: null, after: null, tier: engine.config.mobileTier || 'low' };
    globalThis.__MOBILE_PERF__ = this.report;
    this.showHud = new URLSearchParams(location.search).get('perf') === '1';
    if (this.showHud) this.createHud();
  }

  deviceInfo() {
    return {
      userAgent: navigator.userAgent,
      cores: navigator.hardwareConcurrency ?? null,
      memoryGb: navigator.deviceMemory ?? null,
      viewport: `${innerWidth}x${innerHeight}`,
      pixelRatio: devicePixelRatio,
    };
  }

  createHud() {
    this.hud = document.createElement('pre');
    this.hud.setAttribute('aria-live', 'polite');
    Object.assign(this.hud.style, {
      position: 'fixed', top: '8px', left: '8px', zIndex: 10000, margin: 0,
      padding: '8px 10px', color: '#8ff', background: '#001b', border: '1px solid #4aa8',
      font: '11px/1.35 ui-monospace,monospace', pointerEvents: 'none', whiteSpace: 'pre-wrap',
    });
    document.body.appendChild(this.hud);
    this.paintHud();
  }

  paintHud(liveMs = 0) {
    if (!this.hud) return;
    const fmt = (s) => s ? `${s.medianMs} ms median | ${s.p95Ms} ms p95 | ${s.averageFps} fps` : 'collecting…';
    const input = globalThis.__MOBILE_INPUT_PERF__;
    const inputText = input?.samples
      ? `${input.medianMs} ms median | ${input.p95Ms} ms p95 | ${input.samples} samples`
      : 'drag right side to sample';
    this.hud.textContent = `MOBILE PERF — ${this.phase}\nlive ${liveMs.toFixed(1)} ms | tier ${this.report.tier}\nbefore ${fmt(this.report.before)}\nafter  ${fmt(this.report.after)}\ninput  ${inputText}`;
  }

  frame(frameMs) {
    if (!this.enabled) {
      if (this.showHud && ++this._hudTick % 15 === 0) this.paintHud(frameMs);
      return;
    }
    if (frameMs <= 0 || frameMs >= 100) return;
    this.elapsed += frameMs / 1000;
    this.samples.push(frameMs);
    this.paintHud(frameMs);
    const limit = this.phase === 'before' ? PROBE_SECONDS : VERIFY_SECONDS;
    if (this.elapsed < limit || this.samples.length < 30) return;

    const stats = summarize(this.samples);
    if (this.phase === 'before') {
      this.report.before = stats;
      const tier = chooseTier(stats);
      this.report.tier = tier;
      if (tier !== this.engine.config.mobileTier) {
        this.engine.config.applyMobileTier(tier);
        this.engine.events.emit('mobile-quality:changed', { tier, stats });
        this.engine.resize();
      }
      this.phase = 'after';
      this.elapsed = 0;
      this.samples = [];
      console.info('[mobile-perf] baseline', stats, 'applying tier', tier);
      return;
    }

    this.report.after = stats;
    this.report.inputLatency = { ...(globalThis.__MOBILE_INPUT_PERF__ || {}) };
    this.phase = 'complete';
    this.enabled = false;
    this.paintHud();
    try { localStorage.setItem('claude-of-duty-mobile-perf', JSON.stringify(this.report)); } catch { /* */ }
    console.info('[mobile-perf] verified', this.report);
  }

  dispose() { this.hud?.remove(); }
}
