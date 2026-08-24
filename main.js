document.addEventListener('DOMContentLoaded', () => {
  BackgroundManager?.migrateProfile(profile);
  // Drive footer stamp from single build constant (Platform.version)
  const stamp = document.querySelector('.build-stamp');
  if (stamp && window.BBRPlatform?.buildStamp) stamp.textContent = BBRPlatform.buildStamp();
  initUI();
  BullInvaders?.init();

  // Start hitch-aware performance telemetry after the game has registered.
  // This is local-only diagnostics: it does not send telemetry off-device and
  // does not change Ranked timing, hitboxes, scoring, or projectile rules.
  import('./performance-monitor.js')
    .then(() => window.BBRPerformanceMonitor?.start?.())
    .catch(error => console.warn('[perf-monitor]', error));

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js?v=7.0.1', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(error => console.warn('[pwa]', error));
  }
  // v6 EPOCH campaign + retention hooks
  try {
    BBRCommunity?.render(document.getElementById('communityGoalHost'));
    BBRIntro?.maybeStart();
  } catch (e) { console.warn('[retention]', e); }
  console.log('%cA Bulls App 7.0.1 — Stabilized Play · Pixi/WebGL Engine V2', 'color:#baff48;font-weight:bold');
});