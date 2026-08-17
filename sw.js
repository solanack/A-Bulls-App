const BUILD = '7.0.1';
const CACHE = `abullsapp-v${BUILD}-engine-v2`;

const versioned = paths => paths.map(path => `${path}?v=${BUILD}`);
const numbered = (directory, prefix, extension, start, end) =>
  Array.from({ length: end - start + 1 }, (_, index) =>
    `${directory}/${prefix}${String(index + start).padStart(2, '0')}.${extension}`);

const EPOCH_ATLASES = ['./assets/atlases/invaders-epoch-1-v630.json', './assets/atlases/invaders-epoch-1-v630.png'];
const V7_BOSSES = ['rugpaw','diamond-fang','candlewick','gasfee-golem','whale-song','ponzimouse','rekt-raven','slippage-slug','copium-cat','fud-hound','paperhand-phantom','moonboy-owl','dump-truck-turtle','airdrop-vulture','honeypot-wasp','gas-war-goat','snipe-serpent','bagholder-bear','exit-liquidity-eel']
  .map(name => `./assets/v7/bosses/${name}.webp`);
const V7_BACKGROUNDS = numbered('./assets/v7/backgrounds', 'level-', 'webp', 1, 19);
const V7_PILOTS = [
  './assets/v7/pilots/base/human-neutral.webp',
  './assets/v7/pilots/skin/fire-state.webp', './assets/v7/pilots/skin/ice-state.webp',
  './assets/v7/pilots/skin/ghost-state.webp', './assets/v7/pilots/skin/skeleton-state.webp',
  './assets/v7/pilots/special/prism-special.webp'
];

const CORE = [
  './', './index.html', './privacy.html', './terms.html', './.well-known/assetlinks.json', './BUILD.txt',
  ...versioned(['./manifest.webmanifest', './css/styles.css', './css/track.css']),
  ...versioned([
    './js/opening-sequence.js', './js/config.js', './js/api-client.js', './js/storage.js', './js/core.js',
    './js/background-manager.js', './js/audio-manager.js', './js/v7-art-system.js', './js/run-recorder.js', './js/bull-boss-roster.js', './js/share-card.js',
    './js/leaderboard.js', './js/bullion.js', './js/bull-invaders-renderer-v2.js', './js/bull-invaders.js', './js/profile-manager.js', './js/ui.js',
    './js/track-formatters.js', './js/track.js', './js/main.js',
    './js/retention/daily.js', './js/retention/streak.js', './js/retention/codex.js', './js/retention/crews.js',
    './js/retention/community.js', './js/retention/intro.js', './js/retention/run-bridge.js', './js/retention/center.js'
  ]),
  './vendor/pixi-8.19.0.min.js', './vendor/PIXI-LICENSE.txt',
  './assets/atlases/invaders-core-v620.json', './assets/atlases/invaders-core-v620.png',
  './assets/atlases/invaders-v7.json', './assets/atlases/invaders-v7.webp',
  ...EPOCH_ATLASES,
  './assets/v7/player-ship.webp', './assets/v7/enemies/bear-fighter.webp',
  ...V7_BOSSES, V7_BACKGROUNDS[0], ...V7_PILOTS,
  './assets/opening/opening-fade-1-title.jpg',
  './assets/opening/opening-fade-2-studio.png', './assets/opening/menu-bull-solana.webp',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-maskable-192.png', './assets/icons/icon-maskable-512.png',
  './assets/sol-incinerator.png', './assets/profile-fallback.svg',
  './assets/powerups/green-laser.svg', './assets/powerups/phantom.svg', './assets/powerups/solana.svg',
  './assets/powerups/super-bull.svg', './assets/powerups/magnet.svg', './assets/powerups/shockwave.svg',
  './assets/powerups/time-warp.svg', './assets/powerups/overdrive.svg',
  ...['rapid','spread','shield','overdrive','magnet','nova','double-trinity','triangle','twin','trinity','railgun','plasma','homing','bomb','bomb2']
    .map(name => `./assets/powerups/ecosystem/${name}.svg`),
  // The opening video and later level backgrounds are runtime-cached when used.
  // This keeps first install light without removing offline support after a visit.
];

self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  // Chunking keeps installation gentle on memory-constrained mobile browsers
  // while precaching the consolidated original roster and every player ship.
  for (let index = 0; index < CORE.length; index += 32) await cache.addAll(CORE.slice(index, index + 32));
  await self.skipWaiting();
})()));

self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
  );
});
