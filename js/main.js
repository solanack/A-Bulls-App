document.addEventListener('DOMContentLoaded', () => {
  BackgroundManager?.migrateProfile(profile);
  // Drive footer stamp from single build constant (Platform.version)
  const stamp = document.querySelector('.build-stamp');
  if (stamp && window.BBRPlatform?.buildStamp) stamp.textContent = BBRPlatform.buildStamp();
  initUI();
  BullInvaders?.init();
  window.BBRLife?.init?.();
  window.BBRSThemeCustomizer?.init?.();

  // Bull Vision is additive so this release can be layered onto the recovered
  // production source without duplicating the heavy Trickshot reconstruction engine.
  const bullVisionScript = document.createElement('script');
  bullVisionScript.src = 'js/bull-vision.js?v=8.6.0';
  bullVisionScript.defer = true;
  bullVisionScript.onload = () => window.BBRBullVision?.init?.();
  bullVisionScript.onerror = () => console.warn('[bull-vision] client failed to load');
  document.head.append(bullVisionScript);

  // Bull Intelligence is intentionally a separate read-only layer. It starts with
  // explainable wallet DNA, a recent-history Museum, and wallet rivalries using the
  // Worker endpoints already deployed for public wallet analytics. Advanced archival
  // modules can replace/extend its data adapter later without changing the UI contract.
  const bullIntelligenceScript = document.createElement('script');
  bullIntelligenceScript.src = 'js/bull-intelligence.js?v=8.6.0';
  bullIntelligenceScript.defer = true;
  bullIntelligenceScript.onload = () => {
    window.BBRBullIntelligence?.init?.();

    // The pure core contains normalized-event reconstruction, historical rule replay,
    // Radar scoring and Solana Weather classification. It is intentionally loaded before
    // Intelligence Lab so the UI can activate these features only when defensible data exists.
    const intelligenceCoreScript = document.createElement('script');
    intelligenceCoreScript.src = 'js/intelligence-core.js?v=8.6.0';
    intelligenceCoreScript.defer = true;
    intelligenceCoreScript.onload = () => {
      const labScript = document.createElement('script');
      labScript.src = 'js/intelligence-lab.js?v=8.6.0';
      labScript.defer = true;
      labScript.onload = () => window.BBRIntelligenceLab?.init?.();
      labScript.onerror = () => console.warn('[intelligence-lab] client failed to load');
      document.head.append(labScript);
    };
    intelligenceCoreScript.onerror = () => console.warn('[intelligence-core] client failed to load');
    document.head.append(intelligenceCoreScript);
  };
  bullIntelligenceScript.onerror = () => console.warn('[bull-intelligence] client failed to load');
  document.head.append(bullIntelligenceScript);

  const serviceBanner = document.getElementById('serviceStatusBanner');
  const serviceText = document.getElementById('serviceStatusText');
  const updateServiceBanner = detail => {
    if (!serviceBanner || !serviceText) return;
    const offline = navigator.onLine === false;
    const degraded = detail?.degraded === true;
    serviceBanner.hidden = !(offline || degraded);
    serviceBanner.classList.toggle('is-offline', offline);
    serviceText.textContent = offline
      ? 'You are offline. Cached game assets remain available.'
      : 'Live data service is temporarily degraded. Cached analytics may still be shown.';
  };
  window.addEventListener('offline', () => updateServiceBanner({ degraded: true }));
  window.addEventListener('online', () => updateServiceBanner({ degraded: false }));
  window.addEventListener('bbrs:api-status', event => updateServiceBanner(event.detail));
  updateServiceBanner({});

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js?v=8.6.0', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(error => console.warn('[pwa]', error));
  }
  console.log('%cA Bulls App 8.6.0 — Bull Vision + Bull Intelligence', 'color:#c4afcf;font-weight:bold');
});
