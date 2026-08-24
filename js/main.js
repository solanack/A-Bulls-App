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
  console.log('%cA Bulls App 8.6.0 — Bull Vision', 'color:#c4afcf;font-weight:bold');
});
