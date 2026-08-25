document.addEventListener('DOMContentLoaded', () => {
  // vNext owns product navigation and Intelligence. Keep this bootstrap limited to
  // shared platform services that are still used by Bull Invaders and the PWA.
  globalThis.BackgroundManager?.migrateProfile?.(globalThis.profile);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js?v=vnext', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(error => console.warn('[pwa]', error));
  }

  console.log('%cA Bulls App vNext — Universe · Intelligence · Trickster · Bull Invaders', 'color:#c4afcf;font-weight:bold');
});
