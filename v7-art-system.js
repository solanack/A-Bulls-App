/* A Bulls App v7 — premium-play feature flags, art manifests and UI audio. */
(function (global) {
  'use strict';

  const features = Object.freeze({
    // Hidden, never deleted: flip both values to true to restore the legacy
    // Bull Pen cosmetic workflow and EPOCH-specific ship presentation.
    bullpenNftCosmetics: false,
    themedEpochShips: false,
    chunkyToyArt: true
  });

  const bossKeys = Object.freeze([
    'rugpaw', 'diamond-fang', 'candlewick', 'gasfee-golem', 'whale-song',
    'ponzimouse', 'rekt-raven', 'slippage-slug', 'copium-cat', 'fud-hound',
    'paperhand-phantom', 'moonboy-owl', 'dump-truck-turtle', 'airdrop-vulture',
    'honeypot-wasp', 'gas-war-goat', 'snipe-serpent', 'bagholder-bear',
    'exit-liquidity-eel'
  ]);
  const bossAssets = Object.freeze(Object.fromEntries(
    bossKeys.map(key => [key, `assets/v7/bosses/${key}.webp`])
  ));
  const levelBackgrounds = Object.freeze(Array.from({ length: 19 }, (_, index) =>
    `assets/v7/backgrounds/level-${String(index + 1).padStart(2, '0')}.webp`
  ));

  const config = Object.freeze({
    version: '7.0.1',
    playerShip: 'assets/v7/player-ship.webp',
    bearShip: 'assets/v7/enemies/bear-fighter.webp',
    bossAssets,
    levelBackgrounds
  });

  let lastUiCue = 0;
  async function playUiCue(event) {
    if (!event.target?.closest?.('button, [role="button"], summary, select, input[type="checkbox"], input[type="radio"]')) return;
    const now = performance.now();
    if (now - lastUiCue < 55) return;
    lastUiCue = now;
    try {
      await global.AudioManager?.unlock?.();
      global.AudioManager?.sfx?.ui?.();
    } catch (_) {}
  }

  function removePilotPresentation() {
    // Pilot collection was abandoned. Remove its DOM presentation at startup
    // without touching the hidden Bull Pen compatibility surfaces below.
    document.querySelectorAll('.pilot-sample-panel, .pilot-sample-grid').forEach(node => node.remove());
    document.querySelectorAll('img[src*="/pilots/"]').forEach(image => {
      const card = image.closest('.feature-card');
      if (card) card.remove();
      else image.remove();
    });
    document.querySelectorAll('[data-home-action="herd"]').forEach(node => {
      if (node.matches('.text-cta')) node.innerHTML = 'HERD <span aria-hidden="true">→</span>';
    });
    const hero = document.querySelector('#addBullsView .herd-hero');
    if (hero) {
      const chip = hero.querySelector('.season-chip');
      const heading = hero.querySelector('h1');
      if (chip) chip.textContent = 'HERD';
      if (heading) heading.textContent = 'YOUR SHIPS. YOUR PROGRESS.';
    }
  }

  function applyFlags() {
    document.documentElement.classList.add('v7-art-direction');
    document.body?.classList.add('v7-art-direction');
    removePilotPresentation();
    document.querySelectorAll('[data-requires-bullpen-cosmetics]').forEach(node => { node.hidden = !features.bullpenNftCosmetics; });
    const holdings = document.getElementById('bullpenHoldersPanel');
    if (holdings) holdings.hidden = !features.bullpenNftCosmetics;
    const shipSelect = document.getElementById('shipSelect')?.closest('label');
    if (shipSelect) shipSelect.hidden = !features.themedEpochShips;
    // Preserve accessible names while removing browser-generated descriptive
    // tooltips from the playful surfaces. Analytics keeps its required labels.
    document.querySelectorAll('[title]').forEach(node => {
      if (node.closest('#trackView, #intelligenceView')) return;
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
      sharedCurrency: true,
      leaderboardByGameKey: true
    };
  }

  global.BBRV7 = Object.freeze({ features, config, registryReport });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyFlags, { once: true });
  else applyFlags();
})(window);
