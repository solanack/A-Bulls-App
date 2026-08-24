document.addEventListener('DOMContentLoaded', () => {
  BackgroundManager?.migrateProfile(profile);
  const stamp = document.querySelector('.build-stamp');
  if (stamp && window.BBRPlatform?.buildStamp) stamp.textContent = BBRPlatform.buildStamp();
  initUI();
  BullInvaders?.init();
  window.BBRLife?.init?.();
  window.BBRSThemeCustomizer?.init?.();

  const bullVisionScript = document.createElement('script');
  bullVisionScript.src = 'js/bull-vision.js?v=8.6.0';
  bullVisionScript.defer = true;
  bullVisionScript.onload = () => window.BBRBullVision?.init?.();
  bullVisionScript.onerror = () => console.warn('[bull-vision] client failed to load');
  document.head.append(bullVisionScript);

  const bullIntelligenceScript = document.createElement('script');
  bullIntelligenceScript.src = 'js/bull-intelligence.js?v=8.6.0';
  bullIntelligenceScript.defer = true;
  bullIntelligenceScript.onload = () => {
    window.BBRBullIntelligence?.init?.();
    const intelligenceCoreScript = document.createElement('script');
    intelligenceCoreScript.src = 'js/intelligence-core.js?v=8.6.0';
    intelligenceCoreScript.defer = true;
    intelligenceCoreScript.onload = () => {
      const labScript = document.createElement('script');
      labScript.src = 'js/intelligence-lab.js?v=8.6.0';
      labScript.defer = true;
      labScript.onload = () => {
        window.BBRIntelligenceLab?.init?.();

        const modules = [
          ['js/intelligence-time-machine.js?v=8.6.0', 'BBRIntelligenceHistory', 'intelligence-history'],
          ['js/intelligence-radar-weather.js?v=8.6.0', 'BBRRadarWeather', 'bull-radar-weather'],
          ['js/intelligence-where-were-you.js?v=8.6.0', 'BBRWhereWereYou', 'where-were-you'],
          ['js/intelligence-constellation.js?v=8.6.0', 'BBRWalletConstellation', 'wallet-constellation'],
          ['js/intelligence-nft-memory.js?v=8.6.0', 'BBRNFTMemory', 'nft-memory'],
          ['js/intelligence-ghost-portfolio.js?v=8.6.0', 'BBRGhostPortfolio', 'ghost-portfolio']
        ];
        modules.forEach(([src, globalName, label]) => {
          const script = document.createElement('script');
          script.src = src;
          script.defer = true;
          script.onload = () => window[globalName]?.init?.();
          script.onerror = () => console.warn(`[${label}] client failed to load`);
          document.head.append(script);
        });
      };
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
