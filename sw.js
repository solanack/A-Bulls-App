const BUILD = '8.7.0-vnext-44';
const CACHE = `abullsapp-v${BUILD}`;

const versioned = paths => paths.map(path => `${path}?v=${BUILD}`);
const numbered = (directory, prefix, extension, start, end) =>
  Array.from({ length: end - start + 1 }, (_, index) =>
    `${directory}/${prefix}${String(index + start).padStart(2, '0')}.${extension}`);

const V7_BOSSES = ['rugpaw','diamond-fang','candlewick','gasfee-golem','whale-song','ponzimouse','rekt-raven','slippage-slug','copium-cat','fud-hound','paperhand-phantom','moonboy-owl','dump-truck-turtle','airdrop-vulture','honeypot-wasp','gas-war-goat','snipe-serpent','bagholder-bear','exit-liquidity-eel']
  .map(name => `./assets/bosses-original/${name}.webp`);
const V7_BACKGROUNDS = numbered('./assets/v7/backgrounds', 'level-', 'webp', 1, 19);
const SHIPS = numbered('./assets/ships', 'ship-', 'webp', 1, 10).map((path, index) => {
  const names = ['dark-crown','skeleton','cyan','green-xray','ghost','gold','lava','silver','psychedelic','thermal'];
  return `./assets/ships/ship-${String(index + 1).padStart(2, '0')}-${names[index]}.webp`;
});

const NEXT_EXPERIENCE = [
  './css/product-shell-vnext.css?v=2',
  './css/universe.css?v=2',
  './css/trickster-studio.css?v=6',
  './css/trickster-simulation.css?v=1',
  './css/intelligence-workspace-vnext.css?v=2',
  './css/intelligence-event-inspector.css?v=5',
  './css/token-market-workspace.css?v=1',
  './css/market-sequence-discovery.css?v=2',
  './css/bull-invaders-vnext.css?v=1',
  './js/experience-entry.mjs?v=7',
  './js/market-context-player-bridge.mjs?v=3',
  ...[
    'experience-bootstrap','experience-feature-flags','experience-dependencies','product-registry','product-shell-vnext',
    'product-adapters','universal-search','entity-resolver-client','wallet-token-index-client','market-replay-client','market-coverage-panel','market-replay-empty-state','market-backfill-plan-client','market-backfill-plan-panel','market-sequence-discovery','market-sequence-participants','market-sequence-phases','market-sequence-phase-slice','market-sequence-phase-controls','market-sequence-phase-comparison','market-sequence-reconstruction','token-market-workspace','token-sequence-director','token-sequence-story-runtime','event-market-context-client','market-context-replay','event-story-director','event-story-price-selection','event-story-focus','event-story-scene-runtime','event-story-scene-slice','event-story-render-plan','event-story-scene-transition','event-story-frame-model','event-story-frame-renderer','event-story-frame-drawer','event-story-video-export','wallet-comparison-story-runtime','wallet-comparison-render-plan','wallet-comparison-frame-model','wallet-comparison-frame-renderer','wallet-comparison-frame-drawer','wallet-comparison-video-export','wallet-comparison-what-if','intelligence-event-ledger','universe-contracts','universe-quality',
    'universe-synthetic-data','universe-transition','universe-renderer','universe-client',
    'universe-experience','trickster-story-manifest','trickster-composer',
    'trickster-export-capabilities','trickster-timeline','trickster-caption-plan','trickster-caption-renderer','trickster-audio-cues','trickster-audio-renderer','trickster-narration-plan','trickster-clip-export','trickster-validation-client','trickster-video-delivery','trickster-studio',
    'temporal-replay-engine','trade-comparison-replay','trade-replay-player','replay-bundle-client','intelligence-workspace-vnext',
    'bull-invaders-host','evidence-state'
  ].map(name => `./js/${name}.mjs`)
];

const GAME_RUNTIME = versioned([
  './js/config.js','./js/api-client.js','./js/storage.js','./js/core.js',
  './js/background-manager.js','./js/audio-manager.js','./js/v7-art-system.js','./js/run-recorder.js','./js/share-card.js',
  './js/leaderboard.js','./js/run-mode.js','./js/bull-invaders-renderer-v2.js','./js/bull-invaders.js','./js/main.js'
]);

const CORE = [
  './','./index.html','./privacy.html','./terms.html','./favicon.svg',
  ...NEXT_EXPERIENCE,
  ...versioned(['./manifest.webmanifest','./css/styles.css','./css/dusk-atelier.css']),
  ...GAME_RUNTIME,
  './vendor/pixi-8.19.0.min.js',
  './assets/v7/player-ship.webp','./assets/v7/enemies/bear-fighter.webp',
  ...V7_BOSSES,...V7_BACKGROUNDS,...SHIPS,
  './assets/game/bull-invader-ship.webp',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/icon-maskable-192.png','./assets/icons/icon-maskable-512.png',
  ...['rapid','spread','shield','overdrive','magnet','nova','double-trinity','triangle','twin','trinity','railgun','plasma','homing','bomb','bomb2']
    .map(name => `./assets/powerups/ecosystem/${name}.svg`),
];

async function cacheOne(cache, path) {try {const request=new Request(path,{cache:'reload'});const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response);}catch(_){}}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(let index=0;index<CORE.length;index+=24)await Promise.all(CORE.slice(index,index+24).map(path=>cacheOne(cache,path)));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
function isStaticAsset(url){return /\.(?:js|css|mjs|json|png|jpe?g|webp|svg|gif|avif|woff2?|ttf|mp3|m4a|wav|ogg|mp4|webm)$/i.test(url.pathname);}
async function staleWhileRevalidate(request){const cache=await caches.open(CACHE),cached=await cache.match(request,{ignoreSearch:false}),refresh=fetch(request).then(async response=>{if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response;}).catch(()=>null);return cached||await refresh||new Response('Offline and this resource has not been cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
async function networkFirst(request){const cache=await caches.open(CACHE);try{const response=await fetch(request,{cache:'no-store'});if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response;}catch(_){return await cache.match(request)||(request.mode==='navigate'?await cache.match('./index.html'):null)||new Response('Offline and this resource has not been cached.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}}
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.includes('/api/')||event.request.headers.has('Authorization'))return;if(event.request.mode==='navigate'){event.respondWith(networkFirst(event.request));return;}event.respondWith(isStaticAsset(url)?staleWhileRevalidate(event.request):networkFirst(event.request));});
