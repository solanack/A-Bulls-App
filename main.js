/* A Bulls App — startup + hitch-aware Bull Invaders performance guard. */
(function (global) {
  'use strict';

  const SAMPLE_LIMIT = 360;
  const HITCH_MS = 50;
  const SEVERE_HITCH_MS = 100;
  const samples = [];
  const longTasks = [];
  let raf = 0;
  let last = 0;
  let observer = null;
  let activeRenderer = null;

  const percentile = (sorted, p) => {
    if (!sorted.length) return 0;
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
  };
  const pushBounded = (list, value, limit = SAMPLE_LIMIT) => {
    list.push(value);
    if (list.length > limit) list.splice(0, list.length - limit);
  };

  function performanceSnapshot() {
    const sorted = [...samples].sort((a, b) => a - b);
    const hitchCount = samples.filter(ms => ms >= HITCH_MS).length;
    const severeHitchCount = samples.filter(ms => ms >= SEVERE_HITCH_MS).length;
    return {
      sampleCount: samples.length,
      frameMs: {
        p50: percentile(sorted, .50), p95: percentile(sorted, .95), p99: percentile(sorted, .99),
        max: sorted.length ? sorted[sorted.length - 1] : 0
      },
      hitchCount,
      severeHitchCount,
      hitchRate: samples.length ? hitchCount / samples.length : 0,
      longTaskCount: longTasks.length,
      longestLongTaskMs: longTasks.length ? Math.max(...longTasks) : 0,
      invaders: global.BullInvaders?.performanceSnapshot?.() || null
    };
  }

  function lowerRendererQuality(detail) {
    if (!activeRenderer?.ready || activeRenderer.failed) return;
    const gameFrames = Number(detail?.invaders?.frames || 0);
    if (gameFrames < 30) return;
    const severe = detail.frameMs.p99 > 75 || detail.severeHitchCount >= 3 || detail.longestLongTaskMs > 120;
    const target = severe ? 'fast' : 'balanced';
    const rank = { fast: 0, balanced: 1, full: 2 };
    if ((rank[target] ?? 2) >= (rank[activeRenderer.quality] ?? 2)) return;
    activeRenderer.applyQuality?.(target);
    global.dispatchEvent(new CustomEvent('bbrs:renderer-quality-changed', {
      detail: { quality: target, reason: 'frame-pressure', metrics: detail }
    }));
  }

  function evaluatePressure() {
    const data = performanceSnapshot();
    if (data.sampleCount < 120) return;
    if (data.frameMs.p95 <= 24 && data.frameMs.p99 <= 45 && data.severeHitchCount < 2) return;
    lowerRendererQuality(data);
  }

  function monitorFrame(now) {
    if (last && !document.hidden) {
      pushBounded(samples, Math.min(250, Math.max(0, now - last)));
      if (samples.length % 120 === 0) evaluatePressure();
    }
    last = now;
    raf = requestAnimationFrame(monitorFrame);
  }

  function startPerformanceMonitor() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(monitorFrame);
    if ('PerformanceObserver' in global) {
      try {
        observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) pushBounded(longTasks, Number(entry.duration || 0), 120);
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch (_) {}
    }
  }

  function resetPerformanceMonitor() {
    samples.length = 0;
    longTasks.length = 0;
    global.BullInvaders?.resetPerformanceMetrics?.();
  }

  // Decorate the existing Pixi renderer instead of replacing it. Under pressure
  // only decorative VFX are visually capped; gameplay entities are never removed.
  const rendererFactory = global.BBRInvadersRendererV2;
  if (rendererFactory?.create && !rendererFactory.__performanceGuarded) {
    const originalCreate = rendererFactory.create.bind(rendererFactory);
    rendererFactory.create = options => {
      const renderer = originalCreate(options);
      activeRenderer = renderer;
      const originalRender = renderer.render.bind(renderer);
      renderer.render = model => {
        if (!model || renderer.quality === 'full') return originalRender(model);
        const fast = renderer.quality === 'fast';
        const decorated = {
          ...model,
          particles: Array.isArray(model.particles) ? model.particles.slice(-(fast ? 64 : 96)) : model.particles,
          explosions: Array.isArray(model.explosions) ? model.explosions.slice(-(fast ? 8 : 12)) : model.explosions,
          rocketBursts: Array.isArray(model.rocketBursts) ? model.rocketBursts.slice(-(fast ? 3 : 4)) : model.rocketBursts
        };
        return originalRender(decorated);
      };
      return renderer;
    };
    rendererFactory.__performanceGuarded = true;
  }

  global.BBRPerformanceMonitor = Object.freeze({
    start: startPerformanceMonitor,
    reset: resetPerformanceMonitor,
    snapshot: performanceSnapshot
  });
})(window);

document.addEventListener('DOMContentLoaded', () => {
  BackgroundManager?.migrateProfile(profile);
  const stamp = document.querySelector('.build-stamp');
  if (stamp && window.BBRPlatform?.buildStamp) stamp.textContent = BBRPlatform.buildStamp();
  initUI();
  BullInvaders?.init();
  window.BBRPerformanceMonitor?.start?.();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js?v=7.0.1', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(error => console.warn('[pwa]', error));
  }
  try {
    BBRCommunity?.render(document.getElementById('communityGoalHost'));
    BBRIntro?.maybeStart();
  } catch (e) { console.warn('[retention]', e); }
  console.log('%cA Bulls App 7.0.1 — Stabilized Play · Pixi/WebGL Engine V2 + Hitch Guard', 'color:#baff48;font-weight:bold');
});