/* A Bulls App — lightweight hitch-aware performance monitor.
 * Inspired by the profiling lessons in Claude-of-Duty: percentiles and long
 * stalls matter more than average FPS. This module does not alter gameplay,
 * scoring, hitboxes, projectile counts, or timing rules.
 */
(function (global) {
  'use strict';

  const SAMPLE_LIMIT = 360;
  const HITCH_MS = 50;
  const SEVERE_HITCH_MS = 100;
  const samples = [];
  const longTasks = [];
  let raf = 0;
  let last = 0;
  let running = false;
  let observer = null;

  function pushBounded(list, value, limit = SAMPLE_LIMIT) {
    list.push(value);
    if (list.length > limit) list.splice(0, list.length - limit);
  }

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
    return sorted[index];
  }

  function snapshot() {
    const sorted = [...samples].sort((a, b) => a - b);
    const hitches = samples.filter(ms => ms >= HITCH_MS).length;
    const severe = samples.filter(ms => ms >= SEVERE_HITCH_MS).length;
    const invaders = global.BullInvaders?.performanceSnapshot?.() || null;
    return {
      sampleCount: samples.length,
      frameMs: {
        p50: percentile(sorted, .50),
        p95: percentile(sorted, .95),
        p99: percentile(sorted, .99),
        max: sorted.length ? sorted[sorted.length - 1] : 0
      },
      hitchCount: hitches,
      severeHitchCount: severe,
      hitchRate: samples.length ? hitches / samples.length : 0,
      longTaskCount: longTasks.length,
      longestLongTaskMs: longTasks.length ? Math.max(...longTasks) : 0,
      invaders
    };
  }

  function emitPressure() {
    const data = snapshot();
    if (data.sampleCount < 120) return;
    const pressured = data.frameMs.p95 > 24 || data.frameMs.p99 > 45 || data.severeHitchCount >= 2;
    if (!pressured) return;
    global.dispatchEvent(new CustomEvent('bbrs:performance-pressure', { detail: data }));
  }

  function frame(now) {
    if (!running) return;
    if (last && !document.hidden) {
      const delta = Math.min(250, Math.max(0, now - last));
      pushBounded(samples, delta);
      if (samples.length % 120 === 0) emitPressure();
    }
    last = now;
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
    if ('PerformanceObserver' in global) {
      try {
        observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) pushBounded(longTasks, Number(entry.duration || 0), 120);
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch (_) {}
    }
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    observer?.disconnect?.();
    observer = null;
  }

  function reset() {
    samples.length = 0;
    longTasks.length = 0;
    global.BullInvaders?.resetPerformanceMetrics?.();
  }

  global.BBRPerformanceMonitor = Object.freeze({ start, stop, reset, snapshot });
})(window);
