document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js?v=particle-universe', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(error => console.warn('[pwa]', error));
  }

  console.log('%cA Bulls App — Particle Universe · Intelligence · Create', 'color:#c4afcf;font-weight:bold');
});
