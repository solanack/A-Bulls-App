/* A Bulls App v8.2 — authoritative art manifest, Dusk Atelier activation, Epoch ships, and haptic UI feedback. */
(function (global) {
  'use strict';

  const features = Object.freeze({
    themedEpochShips: true
  });

  const bossKeys = Object.freeze([
    'rugpaw', 'diamond-fang', 'candlewick', 'gasfee-golem', 'whale-song',
    'ponzimouse', 'rekt-raven', 'slippage-slug', 'copium-cat', 'fud-hound',
    'paperhand-phantom', 'moonboy-owl', 'dump-truck-turtle', 'airdrop-vulture',
    'honeypot-wasp', 'gas-war-goat', 'snipe-serpent', 'bagholder-bear',
    'exit-liquidity-eel'
  ]);
  const bossAssets = Object.freeze(Object.fromEntries(
    bossKeys.map(key => [key, `assets/bosses-original/${key}.webp`])
  ));
  const levelBackgrounds = Object.freeze(Array.from({ length: 19 }, (_, index) =>
    `assets/v7/backgrounds/level-${String(index + 1).padStart(2, '0')}.webp`
  ));

  const shipAssets = Object.freeze([
    'assets/v7/player-ship.webp',
    'assets/ships/ship-01-dark-crown.webp',
    'assets/ships/ship-02-skeleton.webp',
    'assets/ships/ship-03-cyan.webp',
    'assets/ships/ship-04-green-xray.webp',
    'assets/ships/ship-05-ghost.webp',
    'assets/ships/ship-06-gold.webp',
    'assets/ships/ship-07-lava.webp',
    'assets/ships/ship-08-silver.webp',
    'assets/ships/ship-09-psychedelic.webp',
    'assets/ships/ship-10-thermal.webp'
  ]);

  const config = Object.freeze({
    version: '8.5.0',
    playerShip: 'assets/v7/player-ship.webp',
    bearShip: 'assets/v7/enemies/bear-fighter.webp',
    bossAssets,
    levelBackgrounds,
    shipAssets
  });

  let lastUiCue = 0;
  function playUiCue(event) {
    if (!event.target?.closest?.('button, [role="button"], summary, select, input[type="checkbox"], input[type="radio"]')) return;
    const now = performance.now();
    if (now - lastUiCue < 55) return;
    lastUiCue = now;
    try {
      if (global.profile?.settings?.vibration !== false && typeof navigator.vibrate === 'function') navigator.vibrate(12);
    } catch (_) {}
  }

  function applyFlags() {
    document.documentElement.classList.remove('v7-art-direction');
    document.body?.classList.remove('v7-art-direction');
    document.documentElement.classList.add('dusk-atelier-direction');
    document.body?.classList.add('dusk-atelier-direction');
    const shipSelect = document.getElementById('shipSelect')?.closest('label');
    if (shipSelect) shipSelect.hidden = !features.themedEpochShips;
    // Preserve accessible names while removing browser-generated descriptive
    // tooltips from the playful surfaces. Analytics keeps its required labels.
    document.querySelectorAll('[title]').forEach(node => {
      if (node.closest('#trackView')) return;
      if (!node.getAttribute('aria-label')) node.setAttribute('aria-label', node.getAttribute('title'));
      node.removeAttribute('title');
    });
    document.addEventListener('pointerdown', playUiCue, { capture: true, passive: true });
    document.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') playUiCue(event);
    }, { capture: true });
  }

  function registryReport() {
    const registry = global.BBRPlatform?.games;
    return {
      registryAvailable: Boolean(registry?.register && registry?.list),
      installedGames: registry?.list?.().map(game => game.id) || [],
      sharedRunStore: true,
      sharedProfile: true,
      sharedCurrency: false,
      leaderboardByGameKey: true
    };
  }

  global.BBRV7 = Object.freeze({ features, config, registryReport });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyFlags, { once: true });
  else applyFlags();
})(window);
