/* Bull Invaders — two-axis touch shooter on the shared game platform. */
(function (global) {
  'use strict';

  const V7_FEATURES = global.BBRV7?.features || {};
  const V7_CONFIG = global.BBRV7?.config || {};
  const V7_PLAYER_SHIP = V7_CONFIG.playerShip || 'assets/v7/player-ship.webp';
  const V7_BEAR_SHIP = V7_CONFIG.bearShip || 'assets/v7/enemies/bear-fighter.webp';

  // v6.2 original boss roster. These are first-party characters, not borrowed
  // mascot art. Names stay out of combat HUD, while accessibility/codex surfaces
  // may use the displayName. Encounter balance remains tied to each slot.
  const BOSSES = [
    { key: 'rugpaw', displayName: 'Rugpaw', asset: 'assets/bosses-original/rugpaw.webp', colors: ['#8fe36b', '#ffd34f'], hands: [[.2,.62],[.8,.62]], attackTheme: 'teleport' },
    { key: 'diamond-fang', displayName: 'Diamond Fang', asset: 'assets/bosses-original/diamond-fang.webp', colors: ['#80e9ff', '#d9f7ff'], hands: [[.18,.59],[.82,.59]], attackTheme: 'ice' },
    { key: 'candlewick', displayName: 'Candlewick', asset: 'assets/bosses-original/candlewick.webp', colors: ['#ff314c', '#ffb12b'], hands: [[.22,.61],[.78,.61]], attackTheme: 'fire' },
    { key: 'gasfee-golem', displayName: 'Gasfee Golem', asset: 'assets/bosses-original/gasfee-golem.webp', colors: ['#f3b942', '#cbd2d8'], hands: [[.18,.62],[.82,.62]], attackTheme: 'burn-field' },
    { key: 'whale-song', displayName: 'Whale Song', asset: 'assets/bosses-original/whale-song.webp', colors: ['#43d7ff', '#326dff'], hands: [[.16,.58],[.84,.58]], attackTheme: 'wave' },
    { key: 'ponzimouse', displayName: 'Ponzimouse', asset: 'assets/bosses-original/ponzimouse.webp', colors: ['#b176ff', '#ffd35a'], hands: [[.2,.6],[.8,.6]], attackTheme: 'decoy' },
    { key: 'rekt-raven', displayName: 'Rekt Raven', asset: 'assets/bosses-original/rekt-raven.webp', colors: ['#9f75ff', '#ff486e'], hands: [[.2,.58],[.8,.58]], attackTheme: 'dive' },
    { key: 'slippage-slug', displayName: 'Slippage Slug', asset: 'assets/bosses-original/slippage-slug.webp', colors: ['#79ff5a', '#ff4bd8'], hands: [[.2,.64],[.8,.64]], attackTheme: 'trail' },
    { key: 'copium-cat', displayName: 'Copium Cat', asset: 'assets/bosses-original/copium-cat.webp', colors: ['#ff70d8', '#87eaff'], hands: [[.2,.61],[.8,.61]], attackTheme: 'gas' },
    { key: 'fud-hound', displayName: 'FUD Hound', asset: 'assets/bosses-original/fud-hound.webp', colors: ['#ff3d4f', '#ffb742'], hands: [[.16,.59],[.84,.59]], attackTheme: 'triple' },
    { key: 'paperhand-phantom', displayName: 'Paperhand Phantom', asset: 'assets/bosses-original/paperhand-phantom.webp', colors: ['#93f6ff', '#bb83ff'], hands: [[.2,.61],[.8,.61]], attackTheme: 'phase' },
    { key: 'moonboy-owl', displayName: 'Moonboy Owl', asset: 'assets/bosses-original/moonboy-owl.webp', colors: ['#ff9c40', '#64e9ff'], hands: [[.2,.6],[.8,.6]], attackTheme: 'rocket-dive' },
    { key: 'dump-truck-turtle', displayName: 'Dump Truck Turtle', asset: 'assets/bosses-original/dump-truck-turtle.webp', colors: ['#ffd345', '#73e85e'], hands: [[.16,.63],[.84,.63]], attackTheme: 'slam' },
    { key: 'airdrop-vulture', displayName: 'Airdrop Vulture', asset: 'assets/bosses-original/airdrop-vulture.webp', colors: ['#e58cff', '#ff4f55'], hands: [[.2,.6],[.8,.6]], attackTheme: 'bait-drop' },
    { key: 'honeypot-wasp', displayName: 'Honeypot Wasp', asset: 'assets/bosses-original/honeypot-wasp.webp', colors: ['#ffd93d', '#ff783f'], hands: [[.2,.59],[.8,.59]], attackTheme: 'swarm' },
    { key: 'gas-war-goat', displayName: 'Gas War Goat', asset: 'assets/bosses-original/gas-war-goat.webp', colors: ['#ff572f', '#ffc547'], hands: [[.18,.61],[.82,.61]], attackTheme: 'charge' },
    { key: 'snipe-serpent', displayName: 'Snipe Serpent', asset: 'assets/bosses-original/snipe-serpent.webp', colors: ['#48ff9c', '#9dff43'], hands: [[.21,.58],[.79,.58]], attackTheme: 'ambush' },
    { key: 'bagholder-bear', displayName: 'Bagholder Bear', asset: 'assets/bosses-original/bagholder-bear.webp', colors: ['#e6b146', '#ff4e36'], hands: [[.17,.62],[.83,.62]], attackTheme: 'armor' },
    { key: 'exit-liquidity-eel', displayName: 'Exit Liquidity Eel', asset: 'assets/bosses-original/exit-liquidity-eel.webp', colors: ['#4ff2ff', '#ad67ff'], hands: [[.18,.58],[.82,.58]], attackTheme: 'chain-lightning' }
  ];
  // The pre-rendered first-party roster above is the only boss-art source.
  const SHIPS = Object.freeze([
    Object.freeze({ id: 0, name: 'Genesis Validator', tag: 'Solana-gradient starter hull.', asset: 'assets/game/bull-invader-ship.webp' }),
    Object.freeze({ id: 1, name: 'Eclipse Crown', tag: 'Dark validator armor for EPOCH 2.', asset: 'assets/ships/ship-01-dark-crown.webp' }),
    Object.freeze({ id: 2, name: 'Ledger Wraith', tag: 'Bare-metal bones. Zero wasted weight.', asset: 'assets/ships/ship-02-skeleton.webp' }),
    Object.freeze({ id: 3, name: 'Turbine Cyan', tag: 'Fast cooling channels for dense fire.', asset: 'assets/ships/ship-03-cyan.webp' }),
    Object.freeze({ id: 4, name: 'Green Runtime', tag: 'Open-circuit hull with mineral proof lines.', asset: 'assets/ships/ship-04-green-xray.webp' }),
    Object.freeze({ id: 5, name: 'Phantom Drift', tag: 'Low-signature craft for silent entries.', asset: 'assets/ships/ship-05-ghost.webp' }),
    Object.freeze({ id: 6, name: 'Sunforge', tag: 'Solar-plated hull with a bright heat bloom.', asset: 'assets/ships/ship-06-gold.webp' }),
    Object.freeze({ id: 7, name: 'Lava Ledger', tag: 'Hot-state armor built for heavy lanes.', asset: 'assets/ships/ship-07-lava.webp' }),
    Object.freeze({ id: 8, name: 'Silver Stake', tag: 'Clean alloy tuned for precision.', asset: 'assets/ships/ship-08-silver.webp' }),
    Object.freeze({ id: 9, name: 'Prism Route', tag: 'Multi-path color routing through every cannon.', asset: 'assets/ships/ship-09-psychedelic.webp' }),
    Object.freeze({ id: 10, name: 'Thermal Finality', tag: 'Endgame hull forged for EPOCH 10.', asset: 'assets/ships/ship-10-thermal.webp' })
  ]);
  const EPOCH_SECTORS = Object.freeze([
    { name: 'Genesis Grid', tag: 'Green-cyan validator lanes awaken.', colors: ['#b0d3c4', '#a8c9d5'] },
    { name: 'Phantom Reach', tag: 'Purple signal fog hides fast targets.', colors: ['#AB9FF2', '#7B61FF'] },
    { name: 'Jupiter Crossroads', tag: 'Five routes converge under fire.', colors: ['#C7F284', '#00FFA3'] },
    { name: 'Orca Current', tag: 'Blue formations move like deep water.', colors: ['#3B82F6', '#a8c9d5'] },
    { name: 'Jito Relay', tag: 'Staked lances cut the longest lane.', colors: ['#b0d3c4', '#b0d3c4'] },
    { name: 'Helius Array', tag: 'Pink telemetry burns across the grid.', colors: ['#FF3B81', '#8B5CF6'] },
    { name: 'Meteora Belt', tag: 'Dual impacts bend the sector path.', colors: ['#d8c5e1', '#2DD4BF'] },
    { name: 'Pyth Horizon', tag: 'Seekers track through violet space.', colors: ['#7B61FF', '#a8c9d5'] },
    { name: 'Saga Core', tag: 'Purple pulse lanes reach critical speed.', colors: ['#8B5CF6', '#FF3B81'] },
    { name: 'Finality Gate', tag: 'Every route resolves in one last charge.', colors: ['#b0d3c4', '#c4afcf'] }
  ]);
  /* POWER_ICON_GUIDE
     64×64 SVG viewBox · 4px rounded stroke · 6px minimum internal radius ·
     transparent canvas · one brand-core color plus white highlight · 12px glow.
     Every power owns a distinct silhouette and a distinct asset file. */
  const POWER = {
    rapid: { name: 'Firedancer', asset: 'assets/powerups/ecosystem/rapid.svg', duration: 9000, color: '#a8c9d5' },
    spread: { name: 'Jupiter Routes', asset: 'assets/powerups/ecosystem/spread.svg', duration: 9000, color: '#C7F284' },
    shield: { name: 'Phantom Missile', asset: 'assets/powerups/ecosystem/shield.svg', duration: 0, color: '#AB9FF2', instant: true },
    overdrive: { name: 'Saga Pulse', asset: 'assets/powerups/ecosystem/overdrive.svg', duration: 8000, color: '#8B5CF6' },
    magnet: { name: 'Marinade Magnet', asset: 'assets/powerups/ecosystem/magnet.svg', duration: 10000, color: '#2DD4BF' },
    nova: { name: 'SolFlares', asset: 'assets/powerups/ecosystem/nova.svg', duration: 9000, color: '#FFD600', highlight: '#FFF59A', trail: '#F5C400' },
    doubleTrinity: { name: 'Dual Drift', asset: 'assets/powerups/ecosystem/double-trinity.svg', duration: 7200, color: '#00FFA3' },
    triangle: { name: 'Tensor Frame', asset: 'assets/powerups/ecosystem/triangle.svg', duration: 8200, color: '#B8FF3C' },
    twin: { name: 'Orca Pod', asset: 'assets/powerups/ecosystem/twin.svg', duration: 5200, color: '#3B82F6' },
    trinity: { name: 'Kamino Tri', asset: 'assets/powerups/ecosystem/trinity.svg', duration: 6200, color: '#7C5CFF' },
    railgun: { name: 'Jito Lance', asset: 'assets/powerups/ecosystem/railgun.svg', duration: 8500, color: '#b0d3c4' },
    plasma: { name: 'Helius Beam', asset: 'assets/powerups/ecosystem/plasma.svg', duration: 9000, color: '#FF3B81' },
    homing: { name: 'Pyth Seekers', asset: 'assets/powerups/ecosystem/homing.svg', duration: 10000, color: '#7B61FF' },
    // EPOCH 2+ only — dropped exclusively from original roster-boss kills
    bomb: { name: 'Pump Bomb', asset: 'assets/powerups/ecosystem/bomb.svg', duration: 0, color: '#26D926', instant: true },
    bomb2: { name: 'Meteora Dual', asset: 'assets/powerups/ecosystem/bomb2.svg', duration: 0, color: '#d8c5e1', instant: true }
  };
  const BEAR_HP_MULTIPLIER = 2;
  const BULL_BOSS_BASE_HP_MULTIPLIER = 2.2;
  // Final-roster boss damage matrix: default gun stays readable; powered artillery is
  // intentionally compressed so upgrades help without deleting the encounter.
  // Jito remains the strongest sustained artillery; SolFlares stays below it.
  const BULL_BOSS_DAMAGE = Object.freeze({ default: 1.25, rapid: .62, spread: .58, overdrive: .64, nova: .50, railgun: .72, plasma: .60, homing: .60, doubleTrinity: .60, triangle: .60, twin: .60, trinity: .60 });
  // ─── v6 EPOCH CAMPAIGN (config-driven, no 190 hand-written level scripts) ───
  // EPOCH 1 = the 19-level roster. EPOCH n≥2 reuses the same systems with multipliers.
  // Rail gun: NO general scaling. +25% only at EPOCH 5; +10% only at EPOCH 9 (stacking documented).
  const EPOCH_CONFIG = Object.freeze({
    max: 10,
    levelsPerEpoch: 19,
    // HP / damage multipliers relative to EPOCH 1 baseline (step = epochIndex - 1)
    bearHitsToKill: (epoch) => Math.max(2, epoch),               // P1/P2=2, then +1 hit each EPOCH
    memeBossHpMult: (epoch) => 1 + 0.25 * (epoch - 1),          // +25% per EPOCH step
    bullBossHpMult: (epoch) => 1 + 0.14 * (epoch - 1),          // +14% per EPOCH step
    playerArtilleryMult: (epoch) => 1 + 0.25 * (epoch - 1),     // +25% per EPOCH
    // Rail exceptions (only these apply; no general rail scaling)
    railDamageMult: (epoch) => {
      let m = 1;
      if (epoch >= 5) m *= 1.25; // +25% at EPOCH 5
      if (epoch >= 9) m *= 1.10; // +10% at EPOCH 9 (stacks)
      return m;
    },
    bombsEnabledFrom: 2, // bombs drop only from original roster-boss kills in EPOCH 2+
    shipUnlockOnClear: true // clearing EPOCH n unlocks generated ship n
  });
  function currentEpoch() {
    return Math.max(1, Math.min(EPOCH_CONFIG.max, Math.floor(Number(profile?.selectedEpoch) || 1)));
  }
  function epochMults() {
    const p = currentEpoch();
    return {
      epoch: p,
      bearHits: EPOCH_CONFIG.bearHitsToKill(p),
      memeHp: EPOCH_CONFIG.memeBossHpMult(p),
      bullHp: EPOCH_CONFIG.bullBossHpMult(p),
      artillery: EPOCH_CONFIG.playerArtilleryMult(p),
      rail: EPOCH_CONFIG.railDamageMult(p)
    };
  }
  // v6.3 projectile palette: only the unpowered default gun uses the Solana
  // gradient. Every named ecosystem power uses its mandatory brand-core color.
  // Map is documented for live-ops / future EPOCH scaling.
  const PROJECTILE_COLORS = Object.freeze({
    default: null,          // Solana gradient (special-cased in candle)
    railgun: '#b0d3c4',
    rapid: '#a8c9d5',
    spread: '#C7F284',
    shield: '#AB9FF2',
    overdrive: '#8B5CF6',
    magnet: '#2DD4BF',
    nova: '#FFD600',
    doubleTrinity: '#00FFA3',
    triangle: '#B8FF3C',
    twin: '#3B82F6',
    trinity: '#7C5CFF',
    plasma: '#FF3B81',
    homing: '#7B61FF',
    bomb: '#26D926',
    bomb2: '#d8c5e1',
    // formation upgrades do not change projectile color
  });
  const SOLANA_GRADIENT = Object.freeze(['#b0d3c4', '#a8c9d5', '#c4afcf']); // green → cyan → purple
  const POWER_COLORS = Object.freeze(Object.fromEntries(Object.entries(POWER).map(([id, definition]) => [id, definition.color])));
  const SOLANA_IMPACT_COLORS = Object.freeze(['#b0d3c4', '#a8c9d5', '#c4afcf', '#d6a0a8', '#e4d9e8', '#ba8792', '#8fb9aa']);
  const IMPACT_PALETTES = Object.freeze([
    Object.freeze(['#b0d3c4', '#a8c9d5', '#c4afcf', '#d6a0a8', '#e4d9e8']),
    Object.freeze(['#a8c9d5', '#8fb9aa', '#b0d3c4', '#c4afcf', '#ba8792']),
    Object.freeze(['#e4d9e8', '#ba8792', '#d6a0a8', '#c4afcf', '#a8c9d5']),
    Object.freeze(['#8fb9aa', '#b0d3c4', '#a8c9d5', '#d6a0a8', '#e4d9e8'])
  ]);
  // Supplementary v6.2 tuning. Pixi GPU bloom, atlases, pooling and the fixed
  // timestep remain the primary engine path; these smaller caps/radii simply
  // reduce overdraw on low-end Android hardware.
  const EFFECT_LIMITS = Object.freeze({ particles: 128, explosions: 12, rocketBursts: 5, rocketImpactClusters: 3, eyeShots: 6 });
  const SPECIAL_ABILITY_CONFIG = Object.freeze([
    Object.freeze({ shipId: 0, theme: 'Solana Lance', color: '#b0d3c4', secondary: '#c4afcf', shape: 'lance', trail: 'spray', impact: 'rings' }),
    Object.freeze({ shipId: 1, theme: 'Crown Shard', color: '#d8b4ff', secondary: '#ffe45e', shape: 'diamond', trail: 'sparks', impact: 'crown' }),
    Object.freeze({ shipId: 2, theme: 'Bone Comet', color: '#f4fbff', secondary: '#68d8ff', shape: 'bone', trail: 'wisps', impact: 'fracture' }),
    Object.freeze({ shipId: 3, theme: 'Cyan Pulse', color: '#45eaff', secondary: '#4b7cff', shape: 'orb', trail: 'pulse', impact: 'wave' }),
    Object.freeze({ shipId: 4, theme: 'X-Ray Bolt', color: '#5dff86', secondary: '#a8c9d5', shape: 'fork', trail: 'scan', impact: 'scanline' }),
    Object.freeze({ shipId: 5, theme: 'Ghost Wisp', color: '#c8f7ff', secondary: '#b677ff', shape: 'wisp', trail: 'echo', impact: 'phase' }),
    Object.freeze({ shipId: 6, theme: 'Gold Stampede', color: '#ffd84a', secondary: '#ff8c2f', shape: 'horn', trail: 'coins', impact: 'burst' }),
    Object.freeze({ shipId: 7, theme: 'Lava Core', color: '#ff4d24', secondary: '#ffd13d', shape: 'meteor', trail: 'magma', impact: 'melt' }),
    Object.freeze({ shipId: 8, theme: 'Silver Rail', color: '#edf7ff', secondary: '#7ea8ff', shape: 'needle', trail: 'shards', impact: 'shatter' }),
    Object.freeze({ shipId: 9, theme: 'Prism Howl', color: '#ff4fcf', secondary: '#56f3ff', shape: 'prism', trail: 'rainbow', impact: 'kaleidoscope' }),
    Object.freeze({ shipId: 10, theme: 'Thermal Flare', color: '#ff6b35', secondary: '#fff06b', shape: 'flare', trail: 'heat', impact: 'thermal' })
  ]);
  const powerImages = {};
  const bossImages = {};
  const playerImage = new Image();
  const bearImage = new Image();
  const levelBackgroundImages = Array.from({ length: 19 }, () => new Image());
  let runStartedAt = 0;
  let invaderLastSummary = null;
  let impactPaletteCursor = 0;
  let campaignAssetsReady = Promise.resolve();
  const state = {
    running: false, paused: false, over: false, level: 1, score: 0, lives: 3,
    mode: 'ranked', pendingRun: null, resultWon: false, recordingRequested: false,
    kills: 0, levelKills: 0, bossesDefeated: 0, difficulty: 1, elapsed: 0, lastShot: 0,
    wave: 1, wavesRequired: 1, extraLifeDropped: false,
    enemyDir: 1, enemyStep: 0, enemies: [], playerShots: [], enemyShots: [], eyeShots: [], specialRockets: [], particles: [], explosions: [], rocketBursts: [], pickups: [], stars: [],
    boss: null, bossStage: 'waves', transitioning: false, transitionUntil: 0, transitionAction: null,
    slot: null, slots: [], dropMisses: 0, upgradeDropMisses: 0, activePower: null, powerEnds: 0, shipTier: 1, rockets: 3, lastEyeShot: 0,
    useEngineV2: true, rendererFallbackReason: '', movementEnergy: 0, combo: 0, comboEnds: 0,
    flow: 'idle', inputLocked: false, flowToken: 0, nextEpoch: null,
    damageTaken: 0, continuesUsed: 0
  };
  const FLOW_STATES = Object.freeze({ IDLE: 'idle', PLAYING: 'playing', LEVEL_CLEAR: 'level-clear', EPOCH_VICTORY: 'epoch-victory', SHIP_UNLOCK: 'ship-unlock', BRIDGE: 'bridge', AUTO_START: 'auto-start', COMPLETE: 'complete', DEATH: 'death' });
  const pointer = { active: false, id: null, kind: null, fingerX: null, fingerY: null, lead: 96 };
  const keys = new Set();
  const player = { x: 0, y: 0, w: 72, h: 69, targetX: 0, targetY: 0, invulnerableUntil: 0 };
  let canvas, ctx, width = 1, height = 1, dpr = 1, raf = 0, lastTime = 0;
  let engineV2 = null, engineReady = Promise.resolve(false), fixedAccumulator = 0, simulationNow = 0;
  const FIXED_STEP = 1 / 60;
  const MAX_FIXED_STEPS = 5;
  const frameMetrics = { frames: 0, logicSteps: 0, frameMsTotal: 0, frameMsMax: 0, droppedFrames: 0, lastSampleAt: 0 };
  class LogicPool {
    constructor(size) { this.free = Array.from({ length: size }, () => ({})); this.capacity = size; this.createdAfterWarmup = 0; }
    acquire(values) {
      const object = this.free.pop() || (this.createdAfterWarmup++, {});
      return Object.assign(object, values);
    }
    release(object) {
      if (!object || this.free.length >= this.capacity) return;
      Object.keys(object).forEach(key => { delete object[key]; });
      this.free.push(object);
    }
  }
  const logicPools = {
    enemy: new LogicPool(40), playerShot: new LogicPool(420), enemyShot: new LogicPool(220),
    particle: new LogicPool(EFFECT_LIMITS.particles), explosion: new LogicPool(EFFECT_LIMITS.explosions)
  };
  function clearPooled(list, pool) { list.forEach(item => pool.release(item)); list.length = 0; }
  function compactPooled(list, pool, keep) {
    let write = 0;
    for (let read = 0; read < list.length; read += 1) {
      const item = list[read];
      if (keep(item)) list[write++] = item; else pool.release(item);
    }
    list.length = write;
  }
  function releaseLogicEntities() {
    clearPooled(state.enemies, logicPools.enemy); clearPooled(state.playerShots, logicPools.playerShot);
    clearPooled(state.enemyShots, logicPools.enemyShot); clearPooled(state.particles, logicPools.particle);
    clearPooled(state.explosions, logicPools.explosion);
  }

  const $ = id => document.getElementById(id);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const active = () => $('invadersGameView')?.classList.contains('active');
  const floorY = () => Math.max(8, height - player.h - 8);
  const ceilingY = () => Math.min(floorY(), height * 0.375 + 8);
  const playerHitbox = () => ({ x: player.x + player.w * .19, y: player.y + player.h * .14, w: player.w * .62, h: player.h * .7 });
  const PLAYER_VISUAL_SCALE = 1.10;
  // v6.2 formation order. Physics stays authoritative and pixel-identical to
  // v6.1; the 10% ship increase is render-only to protect Ranked parity.
  function formationForTier(tier = state.shipTier) {
    if (tier === 2) return [{ x: -.56, y: 0, scale: 1, kind: 'large' }, { x: .56, y: 0, scale: 1, kind: 'large' }];
    if (tier === 3) return [{ x: 0, y: -.58, scale: 1, kind: 'large' }, { x: -.56, y: .55, scale: 1, kind: 'large' }, { x: .56, y: .55, scale: 1, kind: 'large' }];
    if (tier === 4) return [{ x: -.48, y: 0, scale: .48, kind: 'mini' }, { x: .48, y: 0, scale: .48, kind: 'mini' }];
    if (tier === 5) return [{ x: 0, y: -.38, scale: .42, kind: 'mini' }, { x: -.48, y: .28, scale: .42, kind: 'mini' }, { x: .48, y: .28, scale: .42, kind: 'mini' }];
    return [{ x: 0, y: 0, scale: 1, kind: 'single' }];
  }
  // Regular artillery and special rockets use separate schedules. Every listed
  // barrel produces one real, visible object. Rockets remain available at all
  // tiers and launch once per visible craft.
  const projectilesPerCraftForTier = tier => tier >= 5 ? 9 : tier >= 4 ? 6 : 1;
  const rocketsPerCraftForTier = () => 1;
  function volleyBlueprint(tier, perCraft) {
    return formationForTier(tier).flatMap((craft, craftIndex) => Array.from({ length: perCraft }, (_, barrel) => ({
      craftIndex,
      barrel,
      x: craft.x + (barrel - (perCraft - 1) / 2) * Math.min(.12, .46 / Math.max(1, perCraft - 1)) * craft.scale,
      y: craft.y,
      scale: craft.scale
    })));
  }
  function projectileVolleyBlueprint(tier = state.shipTier) {
    return volleyBlueprint(tier, projectilesPerCraftForTier(tier));
  }
  const formationPowerForTier = tier => ({ 2: 'doubleTrinity', 3: 'triangle', 4: 'twin', 5: 'trinity' })[tier] || null;
  const maxPowerSlots = () => 4;
  const arcadeMode = () => state.mode === 'arcade';
  const reducedMotion = () => profile?.settings?.reducedMotion === true;
  const colorblindSafe = () => profile?.settings?.colorblindSafe === true;
  const COLORBLIND_POWER_COLORS = Object.freeze({ rapid: '#56B4E9', spread: '#E69F00', shield: '#CC79A7', overdrive: '#D55E00', magnet: '#009E73', nova: '#F0E442', doubleTrinity: '#0072B2', triangle: '#F5E663', twin: '#56B4E9', trinity: '#CC79A7', railgun: '#009E73', plasma: '#D55E00', homing: '#0072B2', bomb: '#009E73', bomb2: '#F0E442' });
  const projectileColor = id => colorblindSafe() ? (COLORBLIND_POWER_COLORS[id] || PROJECTILE_COLORS[id] || null) : (PROJECTILE_COLORS[id] ?? null);
  function setFlow(next) {
    state.flow = next;
    state.inputLocked = ![FLOW_STATES.IDLE, FLOW_STATES.PLAYING].includes(next);
    document.body.dataset.invaderFlow = next;
  }
  function wantsEngineV2() {
    try {
      const selected = new URLSearchParams(location.search).get('renderer');
      if (selected === 'canvas') return false;
      if (selected === 'webgl') return true;
      const saved = localStorage.getItem('abulls_invaders_engine_v2');
      return saved !== '0';
    } catch (_) { return true; }
  }
  function campaignMemeAsset(definition) {
    // One original, first-party roster is authoritative across all EPOCHS.
    // Difficulty, movement and palette variation stay data-driven, avoiding
    // nine duplicate image sets and preventing retired mascot art resurfacing.
    return definition.asset;
  }
  function selectedShip() {
    if (!V7_FEATURES.themedEpochShips) {
      return { ...SHIPS[0], name: 'Stampede One', tag: 'One craft. Every formation.', asset: V7_PLAYER_SHIP };
    }
    const unlocked = Array.isArray(profile?.unlockedShips) ? profile.unlockedShips : [0];
    const requested = Math.max(0, Math.min(10, Math.floor(Number(profile?.selectedShip) || 0)));
    return SHIPS[unlocked.includes(requested) ? requested : 0];
  }
  const shipTextureKey = shipId => `ship-${String(shipId).padStart(2, '0')}`;
  function shipVisualIdentity(tier = state.shipTier) {
    const ship = selectedShip();
    return { epoch: currentEpoch(), tier, shipId: ship.id, asset: ship.asset, textureKey: shipTextureKey(ship.id), liveryMint: '', livery: null };
  }
  function loadImage(image, source, fallback = '') {
    if (image.src.endsWith(source) && image.complete && image.naturalWidth) return Promise.resolve(image);
    image.decoding = 'async';
    return new Promise(resolve => {
      let usingFallback = false;
      image.onload = () => { image.onload = null; image.onerror = null; resolve(image); };
      image.onerror = () => {
        if (fallback && !usingFallback && source !== fallback) {
          usingFallback = true;
          image.src = fallback;
          return;
        }
        image.onload = null; image.onerror = null; resolve(image);
      };
      image.src = source;
      // Cached images can be complete before the event handlers run.
      if (image.complete && image.naturalWidth) image.onload();
    });
  }
  function preloadCampaignAssets() {
    const epoch = currentEpoch();
    const jobs = [];
    BOSSES.forEach((definition, index) => {
      const image = bossImages[definition.key] || new Image(); bossImages[definition.key] = image;
      jobs.push(loadImage(image, campaignMemeAsset(definition, index, epoch), definition.asset));
    });
    const ship = selectedShip();
    jobs.push(loadImage(playerImage, ship.asset, SHIPS[0].asset));
    campaignAssetsReady = Promise.allSettled(jobs);
    return campaignAssetsReady;
  }
  function ensureCanvasLevelBackground(level = 1) {
    const sources = V7_CONFIG.levelBackgrounds || [];
    const index = Math.max(0, Math.min(sources.length - 1, Math.floor(Number(level || 1)) - 1));
    const image = levelBackgroundImages[index], source = sources[index];
    if (image && source && !image.src) { image.decoding = 'async'; image.src = source; }
    return image;
  }
  function preloadAssets() {
    Object.entries(POWER).forEach(([id, def]) => { const image = new Image(); image.src = def.asset; powerImages[id] = image; });
    bearImage.decoding = 'async'; bearImage.src = V7_BEAR_SHIP;
    ensureCanvasLevelBackground(1);
    preloadCampaignAssets();
  }
  function initializeRendererV2() {
    state.useEngineV2 = wantsEngineV2();
    if (!state.useEngineV2 || !global.BBRInvadersRendererV2) {
      state.rendererFallbackReason = state.useEngineV2 ? 'Engine V2 module unavailable' : 'Canvas renderer selected by feature flag';
      console.info('[Bull Invaders renderer]', state.rendererFallbackReason);
      return Promise.resolve(false);
    }
    engineV2 = global.BBRInvadersRendererV2.create({
      canvas, width, height, dpr, epoch: currentEpoch(),
      onFallback(reason) { state.useEngineV2 = false; state.rendererFallbackReason = reason; }
    });
    return engineV2.init().then(ok => {
      state.useEngineV2 = ok === true;
      if (!ok) state.rendererFallbackReason = engineV2.reason || 'WebGL initialization failed';
      return ok;
    });
  }
  function renderCampaignControls() {
    const rankedMode = global.BBRRunMode?.mode?.() !== 'arcade';
    if (rankedMode && currentEpoch() !== 1) {
      profile.selectedEpoch = 1;
      save();
    }
    const epochSelect = $('epochSelect');
    const shipSelect = $('shipSelect');
    const unlockedEpochs = Array.isArray(profile?.unlockedEpochs) ? profile.unlockedEpochs : [1];
    const unlockedShips = Array.isArray(profile?.unlockedShips) ? profile.unlockedShips : [0];
    const cleared = Array.isArray(profile?.clearedEpochs) ? profile.clearedEpochs : [];
    if (epochSelect) {
      epochSelect.replaceChildren(...Array.from({ length: EPOCH_CONFIG.max }, (_, index) => {
        const id = index + 1, option = document.createElement('option');
        option.value = String(id); option.disabled = !unlockedEpochs.includes(id);
        option.textContent = `EPOCH ${id}${option.disabled ? ' · LOCKED' : ''}`;
        return option;
      }));
      epochSelect.value = String(currentEpoch());
    }
    if (shipSelect) {
      shipSelect.replaceChildren(...SHIPS.map(ship => {
        const option = document.createElement('option'); option.value = String(ship.id);
        option.disabled = !unlockedShips.includes(ship.id);
        option.textContent = `${ship.id === 0 ? 'STARTER' : `SHIP ${ship.id}`} · ${ship.name}${option.disabled ? ' · LOCKED' : ''}`;
        return option;
      }));
      shipSelect.value = String(selectedShip().id);
    }
    const preview = $('selectedShipPreview'); if (preview) { preview.src = selectedShip().asset; preview.alt = selectedShip().name; }
    const sector = EPOCH_SECTORS[currentEpoch() - 1];
    const sectorCard = $('epochSectorCard');
    if (sectorCard) {
      sectorCard.style.setProperty('--sector-a', sector.colors[0]); sectorCard.style.setProperty('--sector-b', sector.colors[1]);
      $('epochSectorCode').textContent = `EPOCH ${String(currentEpoch()).padStart(2, '0')}`;
      $('epochSectorName').textContent = sector.name; $('epochSectorTag').textContent = sector.tag;
    }
    const epochField = $('epochSelectField');
    if (epochField) epochField.hidden = rankedMode;
    const status = $('campaignStatus');
    if (status) status.textContent = `${cleared.length}/10 EPOCHS cleared`;
    const progress = $('epochUnlockProgress'); if (progress) progress.style.width = `${clamp(cleared.length / 10, 0, 1) * 100}%`;
    const next = $('campaignNextUnlock');
    if (next) next.textContent = V7_FEATURES.themedEpochShips
      ? (cleared.includes(currentEpoch()) ? `${SHIPS[currentEpoch()].name} secured` : `Clear EPOCH ${currentEpoch()} to unlock ${SHIPS[currentEpoch()].name}`)
      : (cleared.includes(currentEpoch()) ? `EPOCH ${currentEpoch()} secured` : `Clear EPOCH ${currentEpoch()}`);
  }
  async function selectEpoch(value) {
    if (global.BBRRunMode?.mode?.() !== 'arcade') return renderCampaignControls();
    const requested = Math.max(1, Math.min(10, Math.floor(Number(value) || 1)));
    if (!(profile.unlockedEpochs || [1]).includes(requested)) return renderCampaignControls();
    profile.selectedEpoch = requested; save(); renderCampaignControls(); await preloadCampaignAssets();
    if (state.useEngineV2 && engineV2?.ready) await engineV2.setCampaign(requested);
  }
  async function selectShip(value) {
    const requested = Math.max(0, Math.min(10, Math.floor(Number(value) || 0)));
    if (!(profile.unlockedShips || [0]).includes(requested)) return renderCampaignControls();
    profile.selectedShip = requested; save(); renderCampaignControls(); await preloadCampaignAssets();
  }
  function resize() {
    const area = $('invadersArea');
    if (!area || !canvas) return;
    const oldWidth = width, oldHeight = height;
    width = Math.max(1, area.clientWidth); height = Math.max(1, area.clientHeight);
    player.w = clamp(width * .19, 62, 78);
    player.h = player.w * (738 / 768);
    // A 1.5 DPR render ceiling is visually sharp at this phone-sized viewport
    // and cuts fill-rate/recording cost substantially on Android GPUs.
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    engineV2?.resize(width, height, dpr);
    const scaleX = oldWidth > 1 ? width / oldWidth : 1;
    const scaleY = oldHeight > 1 ? height / oldHeight : 1;
    player.x = clamp((player.x || width / 2) * scaleX, 4, width - player.w - 4);
    player.y = clamp((player.y || floorY()) * scaleY, ceilingY(), floorY());
    player.targetX = player.x; player.targetY = player.y;
    if (!state.stars.length) state.stars = Array.from({ length: 84 }, () => ({ x: Math.random() * width, y: Math.random() * height, s: Math.random() * 1.8 + .4, a: Math.random() * .7 + .2 }));
  }
  function reset() {
    releaseLogicEntities();
    Object.assign(state, {
      running: true, paused: false, over: false, level: 1, score: 0, lives: 3,
      bullsCapturedSession: 0, captureFx: null,
    mode: (function(){
      try {
        const forced = sessionStorage.getItem('bbr_run_mode');
        // EPOCH 2+ changes weapon/HP rules, so it is intentionally Arcade-only.
        // This keeps the original EPOCH 1 Ranked physics and leaderboard hash fair.
        if (currentEpoch() > 1) return 'arcade';
        if (forced === 'arcade' || global.BBRRunMode?.mode?.() === 'arcade') return 'arcade';
      } catch (_) {}
      return global.BBRRunMode?.mode?.() === 'arcade' ? 'arcade' : 'ranked';
    })(), pendingRun: null, resultWon: false, recordingRequested: false,
      kills: 0, levelKills: 0, bossesDefeated: 0, difficulty: 1, elapsed: 0, lastShot: 0,
      wave: 1, wavesRequired: 1, extraLifeDropped: false,
      enemyDir: 1, enemyStep: 0, enemies: [], playerShots: [], enemyShots: [], eyeShots: [], specialRockets: [], particles: [], explosions: [], rocketBursts: [], pickups: [],
      boss: null, bossStage: 'waves', transitioning: false, transitionUntil: 0, transitionAction: null,
      slot: null, slots: [], dropMisses: 0, upgradeDropMisses: 0, activePower: null, powerEnds: 0, shipTier: 1, rockets: 3, lastEyeShot: 0,
      movementEnergy: 0, combo: 0, comboEnds: 0, flow: FLOW_STATES.PLAYING, inputLocked: false, nextEpoch: null,
      damageTaken: 0, continuesUsed: 0
    });
    pointer.active = false; pointer.id = null; pointer.kind = null; pointer.fingerX = null; pointer.fingerY = null;
    player.x = width / 2 - player.w / 2; player.y = floorY();
    player.targetX = player.x; player.targetY = player.y; player.invulnerableUntil = 0;
    $('invadersOver')?.classList.remove('show');
    setFlow(FLOW_STATES.PLAYING);
    runStartedAt = performance.now(); invaderLastSummary = null;
    startLevel(); updatePowerSlot(); updateRocketButton(); updateHud();
  }
  function startLevel() {
    setFlow(FLOW_STATES.PLAYING);
    state.transitioning = false;
    state.transitionUntil = 0; state.transitionAction = null; state.bossStage = 'waves';
    state.wave = 1;
    state.wavesRequired = state.level;
    state.levelKills = 0;
    state.extraLifeDropped = false;
    ensureCanvasLevelBackground(state.level);
    clearPooled(state.enemyShots, logicPools.enemyShot); clearPooled(state.playerShots, logicPools.playerShot); state.eyeShots.length = 0; state.specialRockets.length = 0;
    player.x = width / 2 - player.w / 2; player.y = floorY(); player.targetX = player.x; player.targetY = player.y;
    spawnWave();
  }
  function spawnWave() {
    clearPooled(state.enemies, logicPools.enemy);
    const cols = width < 380 ? 6 : 7;
    const enemyW = clamp((width - 42) / cols * .78, 31, 38);
    const enemyH = enemyW;
    const spacingX = Math.min(49, (width - enemyW - 18) / Math.max(1, cols - 1));
    const startX = (width - (cols - 1) * spacingX - enemyW) / 2;
    const entryPatterns = ['left', 'right', 'rain', 'split', 'spiral', 'pinwheel', 'stagger', 'diagonal', 'crossfire'];
    const patternSeed = currentEpoch() * 1009 + state.level * 97 + state.wave * 31;
    const pattern = entryPatterns[patternSeed % entryPatterns.length];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < cols; col++) {
        const targetX = startX + col * spacingX;
        const targetY = 62 + row * Math.min(42, Math.max(30, height * .052));
        const index = row * cols + col;
        let start = { x: targetX, y: -enemyH - index * 6 };
        if (pattern === 'left') start = { x: -enemyW - index * 5, y: 30 + (index % 6) * 24 };
        if (pattern === 'right') start = { x: width + index * 5, y: 30 + (index % 6) * 24 };
        if (pattern === 'split') start = { x: col < cols / 2 ? -enemyW - index * 3 : width + index * 3, y: 34 + row * 28 };
        if (pattern === 'spiral') { const angle = index * .7; start = { x: width / 2 + Math.cos(angle) * width * .72, y: height * .23 + Math.sin(angle) * height * .22 }; }
        if (pattern === 'pinwheel') { const angle = index * .92 + row * .45; start = { x: width / 2 + Math.cos(angle) * width * (.42 + row * .08), y: height * .24 + Math.sin(angle) * height * (.18 + row * .035) }; }
        if (pattern === 'stagger') start = { x: targetX + (row % 2 ? width * .38 : -width * .38), y: -enemyH - row * 72 - col * 13 };
        if (pattern === 'diagonal') start = { x: -enemyW - index * 13, y: -enemyH + index * 18 };
        if (pattern === 'crossfire') start = { x: index % 2 ? width + index * 7 : -enemyW - index * 7, y: -enemyH + (index % cols) * 22 };
        const m = epochMults();
        state.enemies.push(logicPools.enemy.acquire({
          x: start.x, y: start.y, startX: start.x, startY: start.y, baseX: targetX, baseY: targetY, entryT: -index * .018,
          w: enemyW, h: enemyH, row, col, variant: (row + state.level) % 4,
          hp: (state.difficulty >= 1.34 && row === 0 ? 2 : 1) * Math.max(BEAR_HP_MULTIPLIER, m.bearHits)
        }));
      }
    }
    state.enemyDir = 1; state.enemyStep = 0;
    AudioManager?.sfx.bearEntry?.(pattern);
  }
  function spawnMemeBoss() {
    const def = BOSSES[state.level - 1];
    const m = epochMults();
    const hp = Math.max(1, Math.round(144 * state.difficulty * m.memeHp));
    const size = clamp(width * .25, 80, 103);
    state.bossStage = 'meme';
    state.boss = { kind: 'meme', x: width / 2 - size / 2, y: 58, w: size, h: size, hp, maxHp: hp, dir: 1, def, cooldown: 0, phase: Math.random() * Math.PI * 2, shotSide: 0, recoil: 0 };
    AudioManager?.sfx.bossPhase?.('meme');
  }
  function spawnBullBoss() {
    const original = BOSSES[(state.level - 1) % BOSSES.length];
    const size = clamp(width * .31, 100, 130);
    const m = epochMults();
    const hp = Math.round((210 + state.level * 34) * BULL_BOSS_BASE_HP_MULTIPLIER * state.difficulty * m.bullHp);
    const def = { ...original, finalBoss: true };
    state.bossStage = 'bull';
    state.boss = { kind: 'bull', x: width / 2 - size / 2, y: 54, w: size, h: size * 1.08, hp, maxHp: hp, dir: 1, def, cooldown: 0, phase: Math.random() * Math.PI * 2, shotSide: 0, recoil: 0, dash: 0, hitsTaken: 0, milestoneRewardDropped: false, phaseLocks: new Set(), invulnerableUntil: 0 };
    AudioManager?.sfx.bossPhase?.('bull');
  }
  function shoot(now = performance.now()) {
    if (!state.running || state.paused || state.over || state.inputLocked) return;
    const rate = state.activePower === 'rapid' ? 72 : state.activePower === 'overdrive' ? 105 : state.activePower === 'nova' ? 145 : 175;
    if (now - state.lastShot < rate) return;
    state.lastShot = now;
    const center = player.x + player.w / 2, y = player.y - 8;
    // Every entry is a physical, visible barrel. Tiers 1-3 use one projectile
    // per craft, Tier 4 uses six, and Tier 5 uses nine (3 × 9 = 27 total).
    const barrels = projectileVolleyBlueprint();
    const powerKey = state.activePower || formationPowerForTier(state.shipTier) || 'default';
    const shotColor = projectileColor(powerKey); // null → Solana gradient
    const m = epochMults();
    const art = m.artillery;
    const railM = m.rail;
    const make = (baseX, baseY, vx, vy, w = 7, h = 21, damage = 1, pierce = false, homing = false, color = shotColor, scaleWithArtillery = true) =>
      logicPools.playerShot.acquire({ x: baseX - w / 2, y: baseY, w, h, vx, vy, damage: damage * (scaleWithArtillery ? art : 1), pierce, homing, power: damage > 1 || pierce || homing, color, powerId: powerKey, tier: state.shipTier, player: true });
    barrels.forEach(barrel => {
      const x = center + player.w * barrel.x;
      const muzzleY = y + player.h * barrel.y;
      if (state.activePower === 'spread') [-180, -90, 0, 90, 180].forEach(vx => state.playerShots.push(make(x, muzzleY, vx, -560 + Math.abs(vx) * .12, 7, 22, 1, false, false, projectileColor('spread'))));
      else if (state.activePower === 'overdrive') state.playerShots.push(make(x, muzzleY, 0, -700, 14, 38, 3, true, false, projectileColor('overdrive')));
      else if (state.activePower === 'nova') [-58, 58].forEach(vx => state.playerShots.push(make(x, muzzleY, vx, -650, 11, 34, .9, false, false, projectileColor('nova'))));
      else if (state.activePower === 'railgun') state.playerShots.push(make(x, muzzleY, 0, -820, 8, 52, 5 * railM, true, false, projectileColor('railgun'), false)); // Jito color + rail exceptions only; no general artillery multiplier
      else if (state.activePower === 'plasma') [-115, 0, 115].forEach(vx => state.playerShots.push(make(x, muzzleY, vx, -640, 11, 30, 2, false, false, projectileColor('plasma'))));
      else if (state.activePower === 'homing') state.playerShots.push(make(x, muzzleY, 0, -590, 10, 25, 2, false, true, projectileColor('homing')));
      else state.playerShots.push(make(x, muzzleY, 0, state.activePower === 'rapid' ? -660 : -540, state.activePower === 'rapid' ? 8 : 7, state.activePower === 'rapid' ? 28 : 21, state.shipTier >= 3 ? 2 : 1, false, false, shotColor));
    });
    if (powerKey !== 'default') addBurst(center, y + 8, projectileColor(powerKey) || POWER[powerKey]?.color || '#b0d3c4', reducedMotion() ? 2 : 4, 72);
    AudioManager?.sfx.pew();
  }
  function enemyShoot(source, speed = 210) {
    const fromBoss = source === state.boss;
    const pattern = fromBoss && source.kind === 'bull' ? (source.def.projectile || 'spread') : 'spread';
    const count = !fromBoss ? 1 : source.kind === 'bull'
      ? ({ spread: 5, burst: 3, spiral: 4, seeker: 3, cross: 5 }[pattern] || 4)
      : Math.min(4, 2 + Math.floor((state.difficulty - 1) / .12));
    for (let i = 0; i < count; i++) {
      let spread = count === 1 ? 0 : (i - (count - 1) / 2) * .13;
      if (pattern === 'spiral') spread = state.elapsed * 1.9 + i * Math.PI * .5;
      if (pattern === 'cross') spread = (i - 2) * .3;
      if (pattern === 'burst') spread *= .42;
      const hand = fromBoss ? source.def.hands[(source.shotSide + i) % source.def.hands.length] : [.2,.63];
      const muzzleX = source.x + source.w * hand[0], muzzleY = source.y + source.h * hand[1];
      const targetX = player.x + player.w / 2, targetY = player.y + player.h * .4;
      const angle = pattern === 'spiral' ? spread : Math.atan2(targetY - muzzleY, targetX - muzzleX) + spread;
      const velocity = speed * state.difficulty;
      state.enemyShots.push(logicPools.enemyShot.acquire({
        x: muzzleX - 3, y: muzzleY, w: pattern === 'burst' ? 9 : 7, h: pattern === 'cross' ? 27 : 20,
        vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        seeker: pattern === 'seeker', color: fromBoss ? source.def.colors[1] : '#ff2444', player: false
      }));
      if (fromBoss) addBurst(muzzleX, muzzleY, source.def.colors[1], 5, 95);
    }
    if (fromBoss) { source.shotSide = (source.shotSide + count) % source.def.hands.length; source.recoil = 1; }
  }
  function fireEyeDefense(now) {
    if (now - state.lastEyeShot < 420 || state.eyeShots.length >= EFFECT_LIMITS.eyeShots) return;
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h * .52;
    const rearThreatY = player.y + player.h * .38;
    const target = state.enemyShots
      .filter(shot => shot.seeker && !shot.dead && !shot.eyeTargeted && shot.y + shot.h / 2 >= rearThreatY)
      .map(shot => ({ shot, distance: Math.hypot(shot.x + shot.w / 2 - centerX, shot.y + shot.h / 2 - centerY) }))
      .filter(candidate => candidate.distance <= Math.max(220, height * .34))
      .sort((a, b) => a.distance - b.distance)[0]?.shot;
    if (!target) return;
    target.eyeTargeted = true;
    state.lastEyeShot = now;
    const targetX = target.x + target.w / 2, targetY = target.y + target.h / 2;
    [-.105, .105].forEach(offset => {
      const x = centerX + player.w * offset, y = player.y + player.h * .39;
      const angle = Math.atan2(targetY - y, targetX - x);
      state.eyeShots.push({ x, y, w: 5, h: 13, vx: Math.cos(angle) * 760, vy: Math.sin(angle) * 760, target, life: .42, angle, color: '#b0d3c4', player: true });
    });
    addBurst(centerX, player.y + player.h * .39, '#b0d3c4', 8, 95);
    AudioManager?.sfx.pew?.();
  }
  function updateEyeDefense(dt, now) {
    fireEyeDefense(now);
    state.eyeShots.forEach(shot => {
      const target = shot.target;
      if (!target || target.dead) { shot.dead = true; return; }
      const targetX = target.x + target.w / 2, targetY = target.y + target.h / 2;
      const desired = Math.atan2(targetY - shot.y, targetX - shot.x);
      shot.angle += Math.atan2(Math.sin(desired - shot.angle), Math.cos(desired - shot.angle)) * Math.min(1, dt * 14);
      const speed = 760;
      shot.vx = Math.cos(shot.angle) * speed; shot.vy = Math.sin(shot.angle) * speed;
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
      if (hit(shot, target) || Math.hypot(targetX - shot.x, targetY - shot.y) < 13) {
        target.dead = true; shot.dead = true; state.score += 12;
        addExplosion(targetX, targetY, '#b0d3c4', .7);
        AudioManager?.sfx.projectileClash?.();
        if (profile.settings?.vibration) navigator.vibrate?.(6);
      } else if (shot.life <= 0) {
        shot.dead = true; target.eyeTargeted = false;
      }
    });
    state.eyeShots = state.eyeShots.filter(shot => !shot.dead && shot.life > 0);
  }
  function drawEyeShot(shot) {
    ctx.save(); ctx.translate(shot.x, shot.y); ctx.rotate(shot.angle + Math.PI / 2);
    ctx.shadowColor = shot.color; ctx.shadowBlur = 14; ctx.fillStyle = '#efffe9';
    ctx.fillRect(-1.5, -shot.h / 2, 3, shot.h);
    ctx.globalAlpha = .72; ctx.fillStyle = shot.color; ctx.fillRect(-3.5, -shot.h / 2, 7, shot.h);
    ctx.restore();
  }
  function verifyEyeDefense() {
    const previous = {
      enemyShots: state.enemyShots, eyeShots: state.eyeShots, particles: state.particles,
      explosions: state.explosions, lastEyeShot: state.lastEyeShot, score: state.score
    };
    const target = {
      x: player.x + player.w / 2 - 5, y: player.y + player.h * .57,
      w: 10, h: 20, vx: 0, vy: 0, seeker: true, color: '#ff2444'
    };
    state.enemyShots = [target]; state.eyeShots = []; state.particles = []; state.explosions = [];
    state.lastEyeShot = -1e9;
    const started = performance.now();
    fireEyeDefense(started);
    const emitted = state.eyeShots.length;
    for (let step = 1; step <= 24 && !target.dead; step += 1) updateEyeDefense(.016, started + step * 16);
    const result = { emitted, destroyed: target.dead === true, twinEyeBeams: emitted === 2 };
    Object.assign(state, previous);
    console.info('[Bull Invaders eye-defense check]', result);
    return result;
  }
  function addBurst(x, y, color, count = 10, speed = 240) {
    const motionScale = reducedMotion() ? .38 : 1;
    const amount = Math.min(EFFECT_LIMITS.particles, Math.max(0, Math.round(count * motionScale)));
    const overflow = state.particles.length + amount - EFFECT_LIMITS.particles;
    if (overflow > 0) state.particles.splice(0, overflow).forEach(item => logicPools.particle.release(item));
    for (let i = 0; i < amount; i++) state.particles.push(logicPools.particle.acquire({ x, y, vx: (Math.random() - .5) * speed, vy: (Math.random() - .5) * speed, life: .75, color, s: Math.random() * 5 + 2 }));
  }
  function addExplosion(x, y, color, scale = 1) {
    // v6 richer VFX: multi-ring + seeded palette particles. Damage radii / gameplay numbers unchanged.
    if (state.explosions.length >= EFFECT_LIMITS.explosions) state.explosions.splice(0, state.explosions.length - EFFECT_LIMITS.explosions + 1).forEach(item => logicPools.explosion.release(item));
    const seed = (x * 13 + y * 7) | 0;
    const palette = IMPACT_PALETTES[Math.abs(seed) % IMPACT_PALETTES.length];
    const primary = color || palette[0];
    state.explosions.push(logicPools.explosion.acquire({ x, y, color: primary, palette, life: reducedMotion() ? .38 : .68, maxLife: reducedMotion() ? .38 : .68, radius: 6, scale: scale * .78, rings: reducedMotion() ? 1 : 2 }));
    addBurst(x, y, primary, Math.round(14 * scale), 285 * scale);
    addBurst(x, y, palette[1] || '#fff7d1', Math.round(6 * scale), 170 * scale);
    addBurst(x, y, '#ffffff', Math.round(3 * scale), 115 * scale);
  }
  function addSolanaImpact(x, y, scale = 1) {
    const palette = IMPACT_PALETTES[impactPaletteCursor++ % IMPACT_PALETTES.length];
    if (state.explosions.length >= EFFECT_LIMITS.explosions) state.explosions.splice(0, state.explosions.length - EFFECT_LIMITS.explosions + 1).forEach(item => logicPools.explosion.release(item));
    state.explosions.push(logicPools.explosion.acquire({ x, y, color: palette[0], palette, life: .62, maxLife: .62, radius: 5, scale: scale * .8 }));
    palette.slice(0, 3).forEach((color, index) => addBurst(x, y, color, Math.round((4 + index) * scale), (195 + index * 34) * scale));
    addBurst(x, y, '#ffffff', Math.max(2, Math.round(3 * scale)), 125 * scale);
  }
  function dropPower(x, y, forcedId = null) {
    const ids = Object.keys(POWER).filter(id => !['twin', 'trinity', 'doubleTrinity', 'triangle', 'bomb', 'bomb2'].includes(id));
    if (!forcedId && !ids.length) return;
    const id = forcedId || ids[Math.floor(Math.random() * ids.length)];
    state.pickups.push({ x, y, w: 40, h: 40, id, vy: 82, phase: Math.random() * 6 });
  }
  function maybeDropPower(x, y) {
    // All four formation upgrades are standalone and automatic. Their drop
    // schedule is independent of the four-slot magazine, so full inventory can
    // never hide or block the next strictly sequential ship tier.
    const upgradeId = state.shipTier === 1 ? 'doubleTrinity'
      : state.shipTier === 2 ? 'triangle'
        : state.shipTier === 3 ? 'twin'
          : state.shipTier === 4 ? 'trinity' : null;
    const upgradeAlreadyFalling = upgradeId && state.pickups.some(pickup => !pickup.dead && pickup.id === upgradeId);
    if (upgradeId && !upgradeAlreadyFalling) {
      const upgradeChance = Math.min(.72, .15 + state.upgradeDropMisses * .065);
      if (state.upgradeDropMisses >= 8 || Math.random() < upgradeChance) {
        state.upgradeDropMisses = 0; dropPower(x, y, upgradeId);
      } else state.upgradeDropMisses++;
    }
    if (state.slots.length >= maxPowerSlots()) return;
    const chance = Math.min(.52, .12 + state.dropMisses * .055);
    if (state.dropMisses < 7 && Math.random() >= chance) { state.dropMisses++; return; }
    state.dropMisses = 0; dropPower(x, y);
  }
  function syncSlot() { state.slot = state.slots[0] || null; }
  function setShipTier(tier, reason) {
    const before = playerHitbox();
    const beforeSize = { w: player.w, h: player.h };
    state.shipTier = clamp(Math.round(tier), 1, 5);
    updateRocketButton();
    const after = playerHitbox();
    if (before.w !== after.w || before.h !== after.h || beforeSize.w !== player.w || beforeSize.h !== player.h) {
      console.warn('[formation] hitbox changed', { reason, before, after, beforeSize, w: player.w, h: player.h });
    } else {
      console.log('[formation] tier', tier, reason, 'hitbox unchanged', after);
    }
    console.info('[Bull Invaders ship hitbox check]', { reason, before, after, pixelIdentical: JSON.stringify(before) === JSON.stringify(after) });
  }
  function verifyAllShipHitboxes() {
    const originalTier = state.shipTier;
    const baseline = { size: { w: player.w, h: player.h }, box: playerHitbox() };
    const tiers = [1, 2, 3, 4, 5].map(tier => {
      state.shipTier = tier;
      const size = { w: player.w, h: player.h }, box = playerHitbox();
      return { tier, size, box, pixelIdentical: JSON.stringify(size) === JSON.stringify(baseline.size) && JSON.stringify(box) === JSON.stringify(baseline.box) };
    });
    state.shipTier = originalTier;
    const result = { baseline, tiers, passed: tiers.every(item => item.pixelIdentical) };
    console.info('[Bull Invaders all-tier hitbox parity]', result);
    return result;
  }
  function verifyActualProjectileSpawn(tier) {
    const original = {
      tier: state.shipTier, running: state.running, paused: state.paused, over: state.over,
      activePower: state.activePower, lastShot: state.lastShot, shots: state.playerShots
    };
    state.shipTier = clamp(Math.round(tier), 1, 5); state.running = true; state.paused = false; state.over = false;
    state.activePower = null; state.lastShot = -Infinity; state.playerShots = [];
    shoot(performance.now());
    const result = { tier: state.shipTier, count: state.playerShots.length, objects: state.playerShots.map(shot => ({ x: shot.x, y: shot.y, tier: shot.tier, player: shot.player })) };
    clearPooled(state.playerShots, logicPools.playerShot);
    state.shipTier = original.tier; state.running = original.running; state.paused = original.paused; state.over = original.over;
    state.activePower = original.activePower; state.lastShot = original.lastShot; state.playerShots = original.shots;
    return result;
  }
  function verifyActualRocketSpawn(tier) {
    const original = {
      tier: state.shipTier, running: state.running, paused: state.paused, over: state.over,
      transitioning: state.transitioning, rockets: state.rockets, list: state.specialRockets
    };
    state.shipTier = clamp(Math.round(tier), 1, 5); state.running = true; state.paused = false; state.over = false;
    state.transitioning = false; state.rockets = 1; state.specialRockets = [];
    fireRocket();
    const result = { tier: state.shipTier, count: state.specialRockets.length, themes: state.specialRockets.map(rocket => rocket.ability?.theme || '') };
    state.shipTier = original.tier; state.running = original.running; state.paused = original.paused; state.over = original.over;
    state.transitioning = original.transitioning; state.rockets = original.rockets; state.specialRockets = original.list;
    return result;
  }
  function verifySelectedShipAcrossEpochs(shipId) {
    const previousShip = profile.selectedShip;
    const previousEpoch = profile.selectedEpoch;
    profile.selectedShip = Math.max(0, Math.min(10, Math.floor(Number(shipId) || 0)));
    const matrix = Array.from({ length: EPOCH_CONFIG.max }, (_, index) => {
      profile.selectedEpoch = index + 1;
      return {
        epoch: index + 1,
        tiers: Array.from({ length: 5 }, (_, tierIndex) => shipVisualIdentity(tierIndex + 1))
      };
    });
    profile.selectedShip = previousShip;
    profile.selectedEpoch = previousEpoch;
    return matrix;
  }
  function specialAbility() {
    return SPECIAL_ABILITY_CONFIG[selectedShip().id] || SPECIAL_ABILITY_CONFIG[0];
  }
  function rocketVolleyBlueprint(tier = state.shipTier) {
    return volleyBlueprint(tier, rocketsPerCraftForTier(tier));
  }
  function detonateRocket(rocket) {
    if (rocket.dead) return;
    rocket.dead = true;
    const x = rocket.x, y = rocket.y, radius = rocket.radius;
    if (state.rocketBursts.length >= EFFECT_LIMITS.rocketBursts) state.rocketBursts.shift();
    state.rocketBursts.push({ x, y, color: rocket.ability.color, secondary: rocket.ability.secondary, style: rocket.ability.impact, radius: 8, maxRadius: radius, life: .62, maxLife: .62 });
    state.enemyShots.forEach(shot => { if (Math.hypot(shot.x - x, shot.y - y) < radius) shot.dead = true; });
    let destroyed = 0;
    state.enemies.forEach(enemy => {
      if (!enemy.dead && Math.hypot(enemy.x + enemy.w / 2 - x, enemy.y + enemy.h / 2 - y) < radius) {
        enemy.dead = true; state.kills++; state.levelKills++; state.score += Math.round(120 * state.difficulty);
        if (destroyed < EFFECT_LIMITS.rocketImpactClusters) {
          addBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, rocket.ability.secondary, 8, 220);
        }
        destroyed++;
      }
    });
    if (state.boss && Math.hypot(state.boss.x + state.boss.w / 2 - x, state.boss.y + state.boss.h / 2 - y) < radius * 1.35) {
      state.boss.hp -= rocket.damage;
      if (state.boss.hp <= 0) defeatBoss();
    }
    addBurst(x, y, rocket.ability.color, 12, 265);
    addBurst(x, y, rocket.ability.secondary, 7, 190);
    addExplosion(x, y, rocket.ability.color, 1.15);
    AudioManager?.sfx.bossKill?.();
  }
  function updateSpecialRockets(dt) {
    state.specialRockets.forEach(rocket => {
      const target = rocket.target && !rocket.target.dead ? rocket.target : state.boss;
      const tx = target ? target.x + target.w / 2 : rocket.targetX;
      const ty = target ? target.y + target.h / 2 : rocket.targetY;
      const angle = Math.atan2(ty - rocket.y, tx - rocket.x);
      rocket.angle += Math.atan2(Math.sin(angle - rocket.angle), Math.cos(angle - rocket.angle)) * Math.min(1, dt * 7);
      rocket.vx = Math.cos(rocket.angle) * rocket.speed; rocket.vy = Math.sin(rocket.angle) * rocket.speed;
      rocket.x += rocket.vx * dt; rocket.y += rocket.vy * dt; rocket.life -= dt; rocket.trailClock -= dt;
      if (rocket.trailClock <= 0) {
        rocket.trailClock = .035;
        addBurst(rocket.x - Math.cos(rocket.angle) * 10, rocket.y - Math.sin(rocket.angle) * 10, rocket.ability.secondary, 2, 52);
      }
      if (Math.hypot(tx - rocket.x, ty - rocket.y) < 22 || rocket.life <= 0 || rocket.y < -36) detonateRocket(rocket);
    });
    state.specialRockets = state.specialRockets.filter(rocket => !rocket.dead);
  }
  function fireRocket(event) {
    event?.preventDefault(); event?.stopPropagation();
    if (!state.running || state.paused || state.over || state.transitioning || state.inputLocked || state.rockets <= 0) return;
    state.rockets--;
    const live = state.enemies.filter(enemy => !enemy.dead);
    const ability = specialAbility();
    const volley = rocketVolleyBlueprint();
    volley.forEach((barrel, index) => {
      const target = live.length ? live[index % live.length] : state.boss || null;
      const targetX = target ? target.x + target.w / 2 : width * (.25 + .5 * ((index + 1) / (volley.length + 1)));
      const targetY = target ? target.y + target.h / 2 : height * .2;
      const x = player.x + player.w / 2 + player.w * barrel.x;
      const y = player.y + player.h / 2 + player.h * barrel.y - player.h * .46 * barrel.scale;
      state.specialRockets.push({ x, y, w: 12, h: 28, angle: -Math.PI / 2, vx: 0, vy: -620, speed: 620, target, targetX, targetY, life: 1.7,
        radius: Math.max(92, width * .25), damage: 28, ability, dead: false, trailClock: 0 });
    });
    updateRocketButton();
    AudioManager?.sfx.pew?.();
    if (profile.settings?.vibration) navigator.vibrate?.(18);
  }
  function updateRocketButton() {
    const button = $('invaderRocketButton'), count = $('invaderRocketCount');
    if (count) count.textContent = String(state.rockets);
    if (button) {
      button.disabled = state.rockets <= 0 || state.transitioning || !state.running;
      button.title = 'Launch one rocket per visible ship';
    }
  }
  function dropExtraLife(x, y) {
    if (state.extraLifeDropped) return;
    state.extraLifeDropped = true;
    state.pickups.push({ x, y, w: 42, h: 42, id: 'life', type: 'life', vy: 72, phase: Math.random() * 6 });
  }
  function dropBossMilestoneRewards(boss) {
    const center = clamp(boss.x + boss.w / 2, 52, width - 52);
    const y = clamp(boss.y + boss.h * .62, 80, height * .55);
    state.pickups.push({ x: center - 48, y, w: 42, h: 42, id: 'life', type: 'life', vy: 72, phase: Math.random() * 6 });
    dropPower(center + 6, y);
    addBurst(center, y + 20, '#c4afcf', 36, 320);
    AudioManager?.sfx.success?.();
  }
  function activatePower(event) {
    event?.preventDefault(); event?.stopPropagation();
    if (!state.slots.length || state.inputLocked) return;
    const pendingId = state.slots[0];
    if (state.activePower && pendingId !== 'shield') return;
    const id = state.slots.shift(), def = POWER[id]; syncSlot();
    if (id === 'shield') {
      firePhantomMissile();
      player.invulnerableUntil = Math.max(player.invulnerableUntil, performance.now() + 1200);
    } else {
      state.activePower = id;
      state.powerEnds = performance.now() + def.duration;
      if (id === 'nova') addBurst(player.x + player.w / 2, player.y, def.color, 32, 300);
    }
    updatePowerSlot(); AudioManager?.sfx.power?.(id, 'activate'); if (profile.settings?.vibration) navigator.vibrate?.([18, 26, 18]);
  }
  function firePhantomMissile() {
    const color = projectileColor('shield') || POWER.shield.color;
    const w = 24, h = 58;
    state.playerShots.push(logicPools.playerShot.acquire({
      x: player.x + player.w / 2 - w / 2, y: player.y - h * .78, w, h, vx: 0, vy: -510,
      damage: 125, pierce: true, homing: false, power: true, color, powerId: 'shield',
      phantomMissile: true, trailClock: 0, tier: state.shipTier, player: true
    }));
    addBurst(player.x + player.w / 2, player.y, color, 24, 250);
  }
  function updatePowerSlot() {
    const button = $('invaderPowerSlot'), image = $('invaderPowerAsset'), label = $('invaderPowerLabel');
    if (!button) return;
    syncSlot();
    const def = state.slot ? POWER[state.slot] : null;
    button.disabled = !def; button.className = 'power-slot ' + (def ? 'power-slot--ready' : 'power-slot--empty') + ' power-magazine';
    const maximum = maxPowerSlots();
    if (def) { image.src = def.asset; image.alt = def.name; image.hidden = false; label.textContent = `${def.name} · ${state.slots.length}/${maximum}`; }
    else { image.hidden = true; image.removeAttribute('src'); label.textContent = `EMPTY · 0/${maximum}`; }
    const cellRoot = $('invaderPowerCells');
    while (cellRoot && cellRoot.children.length < maximum) cellRoot.append(document.createElement('i'));
    while (cellRoot && cellRoot.children.length > maximum) cellRoot.lastElementChild.remove();
    const cells = [...(cellRoot?.children || [])];
    cells.forEach((cell, index) => {
      const stored = POWER[state.slots[index]]; cell.classList.toggle('filled', Boolean(stored));
      cell.style.backgroundImage = stored ? `url("${stored.asset}")` : '';
      cell.title = stored?.name || 'Empty power slot';
    });
  }
  function registerCombo(now) {
    state.combo = now <= state.comboEnds ? state.combo + 1 : 1;
    state.comboEnds = now + 1450;
    if ([5, 10, 20].includes(state.combo)) {
      state.score += state.combo * 10;
      AudioManager?.sfx.combo?.(state.combo);
    }
  }
  function damagePlayer() {
    const now = performance.now();
    if (now < player.invulnerableUntil || state.activePower) {
      addBurst(player.x + player.w / 2, player.y + player.h / 2, state.activePower ? POWER[state.activePower].color : '#c4afcf', 12, 210);
      return;
    }
    state.damageTaken = Math.max(0, Number(state.damageTaken || 0)) + 1;
    state.lives -= 1;
    setShipTier(1, 'player damage'); player.invulnerableUntil = now + 1800;
    addBurst(player.x + player.w / 2, player.y + 18, '#ff344f', 28); AudioManager?.sfx.hit(); if (profile.settings?.vibration) navigator.vibrate?.([25, 30, 25]);
    if (state.lives <= 0) end(false);
  }
  function defeatBoss() {
    const defeated = state.boss;
    if (!defeated) return;
    state.score += Math.round((defeated.kind === 'bull' ? 2500 : 1200) * state.difficulty);
    addSolanaImpact(defeated.x + defeated.w / 2, defeated.y + defeated.h / 2, 3.1);
    state.boss = null; state.transitioning = true;
    AudioManager?.sfx.bossKill?.(); if (profile.settings?.vibration) navigator.vibrate?.([35, 35, 55, 35, 90]);
    clearPooled(state.enemyShots, logicPools.enemyShot); state.eyeShots.length = 0;
    if (defeated.kind === 'meme') {
      // EPOCH 2+: bombs drop ONLY from original roster-boss kills
      if (currentEpoch() >= EPOCH_CONFIG.bombsEnabledFrom) {
        const bombId = Math.random() < .5 ? 'bomb' : 'bomb2';
        dropPower(defeated.x + defeated.w / 2 - 21, defeated.y + defeated.h / 2, bombId);
      }
      state.transitionAction = 'bull';
      state.transitionUntil = performance.now() + 900;
      return;
    }
    state.bossesDefeated++;
    // Capture tracking (visual + stats; no Ranked power change)
    state.bullsCapturedSession = (state.bullsCapturedSession || 0) + 1;
    try {
      profile.stats = profile.stats || {};
      profile.stats.bullsCapturedTotal = Math.max(0, Math.floor(Number(profile.stats.bullsCapturedTotal || 0))) + 1;
      if (typeof save === 'function') save();
    } catch (_) {}
    state.captureFx = {
      until: performance.now() + 900,
      x: defeated.x + defeated.w / 2,
      y: defeated.y + defeated.h / 2,
      name: defeated.def?.visual?.name || defeated.def?.id || 'BULL'
    };
    AudioManager?.sfx.capture?.();
    state.difficulty = Number((state.difficulty * 1.06).toFixed(6));
    if (state.slots.length < maxPowerSlots()) dropPower(width / 2 - 20, 100);
    state.rockets = Math.min(5, state.rockets + 1); updateRocketButton();
    if (state.level >= BOSSES.length) return end(true);
    state.level++;
    setFlow(FLOW_STATES.LEVEL_CLEAR);
    state.transitionAction = 'level';
    state.transitionUntil = performance.now() + 3900;
  }
  function update(dt, now) {
    state.elapsed += dt;
    if (state.transitioning) {
      state.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= .98; p.vy *= .98; });
      compactPooled(state.particles, logicPools.particle, p => p.life > 0);
      state.explosions.forEach(explosion => { explosion.life -= dt; explosion.radius += dt * 155 * explosion.scale; });
      compactPooled(state.explosions, logicPools.explosion, explosion => explosion.life > 0);
      if (now >= state.transitionUntil) {
        const action = state.transitionAction;
        state.transitioning = false; state.transitionAction = null;
        if (action === 'bull') spawnBullBoss();
        else startLevel();
        updateRocketButton(); return;
      }
      updateHud(); return;
    }
    const keyboardSpeed = 280 * (state.activePower === 'overdrive' ? 1.3 : 1);
    if (keys.has('ArrowLeft') || keys.has('KeyA')) player.targetX -= keyboardSpeed * dt;
    if (keys.has('ArrowRight') || keys.has('KeyD')) player.targetX += keyboardSpeed * dt;
    if (keys.has('ArrowUp') || keys.has('KeyW')) player.targetY -= keyboardSpeed * dt;
    if (keys.has('ArrowDown') || keys.has('KeyS')) player.targetY += keyboardSpeed * dt;
    const follow = 1 - Math.exp(-dt * 24);
    player.targetX = clamp(player.targetX, 4, width - player.w - 4); player.targetY = clamp(player.targetY, ceilingY(), floorY());
    player.x += (player.targetX - player.x) * follow; player.y += (player.targetY - player.y) * follow;
    const movementEnergy = clamp(Math.hypot(player.targetX - player.x, player.targetY - player.y) / Math.max(18, player.w) + (pointer.active ? .12 : 0), .05, 1);
    state.movementEnergy = movementEnergy;
    AudioManager?.sfx.shipMove?.(movementEnergy);
    if (pointer.active || keys.has('Space') || state.activePower === 'nova') shoot(now);
    if (state.activePower && now >= state.powerEnds) { state.activePower = null; state.powerEnds = 0; AudioManager?.sfx.warn(); }

    state.stars.forEach(s => { s.y += (12 + s.s * 10) * dt; if (s.y > height) { s.y = 0; s.x = Math.random() * width; } });
    state.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= .98; p.vy *= .98; });
    compactPooled(state.particles, logicPools.particle, p => p.life > 0);
    state.explosions.forEach(explosion => { explosion.life -= dt; explosion.radius += dt * 155 * explosion.scale; });
    compactPooled(state.explosions, logicPools.explosion, explosion => explosion.life > 0);
    updateSpecialRockets(dt);
    state.rocketBursts.forEach(burst => { burst.life -= dt; burst.radius = Math.min(burst.maxRadius, burst.radius + dt * burst.maxRadius * 2.8); });
    state.rocketBursts = state.rocketBursts.filter(burst => burst.life > 0);
    if (state.enemies.length) {
      const entering = state.enemies.some(enemy => enemy.entryT < 1);
      if (entering) {
        state.enemies.forEach(enemy => {
          enemy.entryT = Math.min(1, enemy.entryT + dt * .92);
          const p = clamp(enemy.entryT, 0, 1), eased = 1 - Math.pow(1 - p, 3);
          const arc = Math.sin(p * Math.PI) * (enemy.row % 2 ? -22 : 22);
          enemy.x = enemy.startX + (enemy.baseX - enemy.startX) * eased + arc;
          enemy.y = enemy.startY + (enemy.baseY - enemy.startY) * eased;
        });
      } else {
        state.enemyStep += dt * 48 * state.difficulty * state.enemyDir;
        const extents = state.enemies.reduce((acc, enemy) => [Math.min(acc[0], enemy.baseX + state.enemyStep), Math.max(acc[1], enemy.baseX + state.enemyStep + enemy.w)], [Infinity, -Infinity]);
        if (extents[0] < 8 || extents[1] > width - 8) { state.enemyDir *= -1; state.enemyStep += 12 * state.enemyDir; }
        state.enemies.forEach(enemy => {
          enemy.x = enemy.baseX + state.enemyStep;
          enemy.y = Math.min(height * .48 - enemy.h, enemy.baseY + Math.sin(state.elapsed * 2.7 + enemy.row * .9 + enemy.baseX * .02) * 12);
        });
        if (Math.random() < dt * 1.65 * state.difficulty) enemyShoot(state.enemies[Math.floor(Math.random() * state.enemies.length)], 235);
      }
    } else if (!state.boss && !state.transitioning) {
      if (state.wave < state.wavesRequired) {
        state.wave++;
        spawnWave();
      } else {
        spawnMemeBoss();
      }
    }
    if (state.boss) {
      const boss = state.boss, movement = boss.kind === 'bull' ? (boss.def.movement || 'sweep') : 'sweep';
      const bossMaxX = Math.max(8, width - boss.w - 8);
      if (!Number.isFinite(boss.x)) { boss.x = width / 2 - boss.w / 2; boss.dir = 1; }
      const bossRange = Math.max(10, height * .47 - boss.h - 52);
      const centerX = (bossMaxX + 8) / 2, amplitude = Math.max(8, (bossMaxX - 8) / 2);
      if (movement === 'weave') {
        boss.x = centerX + Math.sin(state.elapsed * 2.15 + boss.phase) * amplitude;
        boss.y = 52 + (Math.sin(state.elapsed * 4.1 + boss.phase) * .5 + .5) * bossRange;
      } else if (movement === 'orbit') {
        boss.x = centerX + Math.sin(state.elapsed * 1.8 + boss.phase) * amplitude;
        boss.y = 52 + (Math.cos(state.elapsed * 2.4 + boss.phase) * .5 + .5) * bossRange;
      } else if (movement === 'rush') {
        const sweep = Math.sin(state.elapsed * 1.35 + boss.phase);
        boss.x = centerX + Math.sign(sweep) * Math.pow(Math.abs(sweep), .42) * amplitude;
        boss.y = 52 + (Math.sin(state.elapsed * 3.2 + boss.phase) * .5 + .5) * bossRange;
      } else if (movement === 'zigzag') {
        boss.x = centerX + Math.sin(state.elapsed * 3.15 + boss.phase) * amplitude;
        boss.y = 52 + (Math.sin(state.elapsed * 1.55 + boss.phase) * .5 + .5) * bossRange;
      } else {
        boss.x += boss.dir * 112 * state.difficulty * dt;
        if (boss.x <= 8) { boss.x = 8; boss.dir = 1; }
        else if (boss.x >= bossMaxX) { boss.x = bossMaxX; boss.dir = -1; }
        boss.y = 52 + (Math.sin(state.elapsed * 2.15 + boss.phase) * .5 + .5) * bossRange;
      }
      boss.x = clamp(boss.x, 8, bossMaxX);
      boss.cooldown -= dt; boss.recoil = Math.max(0, boss.recoil - dt * 5.5);
      if (boss.cooldown <= 0) {
        enemyShoot(boss, boss.kind === 'bull' ? 250 + state.level * 4 : 225);
        boss.cooldown = Math.max(.28, (boss.kind === 'bull' ? .95 : 1.16) / state.difficulty);
      }
    }
    state.playerShots.forEach(shot => {
      if (shot.homing) {
        const targets = state.boss ? [state.boss] : state.enemies.filter(enemy => !enemy.dead);
        const target = targets.reduce((best, candidate) => !best || Math.abs(candidate.x - shot.x) < Math.abs(best.x - shot.x) ? candidate : best, null);
        if (target) { const desired = clamp((target.x + target.w / 2 - shot.x) * 2.8, -260, 260); shot.vx += (desired - shot.vx) * Math.min(1, dt * 7); }
      }
      shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      if (shot.phantomMissile) {
        shot.trailClock -= dt;
        if (shot.trailClock <= 0) { shot.trailClock = .045; addBurst(shot.x + shot.w / 2, shot.y + shot.h, shot.color, 2, 64); }
      }
    });
    state.enemyShots.forEach(shot => {
      if (shot.seeker) {
        const angle = Math.atan2(player.y + player.h * .4 - shot.y, player.x + player.w / 2 - shot.x);
        const speed = Math.max(180, Math.hypot(shot.vx, shot.vy));
        shot.vx += (Math.cos(angle) * speed - shot.vx) * Math.min(1, dt * 1.6);
        shot.vy += (Math.sin(angle) * speed - shot.vy) * Math.min(1, dt * 1.6);
      }
      shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      if (!shot.nearMissed && shot.y > player.y - 28 && shot.y < player.y + player.h + 18) {
        const box = playerHitbox();
        const separation = Math.min(Math.abs(shot.x - box.x), Math.abs(shot.x - (box.x + box.w)));
        if (!hit(shot, box) && separation < 22) {
          shot.nearMissed = true; state.score += 6; AudioManager?.sfx.nearMiss?.();
        }
      }
    });
    updateEyeDefense(dt, now);
    state.pickups.forEach(pickup => {
      if (state.activePower === 'magnet') {
        const dx = player.x + player.w / 2 - (pickup.x + pickup.w / 2), dy = player.y + player.h / 2 - (pickup.y + pickup.h / 2);
        const length = Math.max(1, Math.hypot(dx, dy)); pickup.x += dx / length * 260 * dt; pickup.y += dy / length * 260 * dt;
      } else pickup.y += pickup.vy * dt;
      pickup.phase += dt * 5;
    });
    for (const green of state.playerShots) for (const red of state.enemyShots) {
      if (!green.dead && !red.dead && hit(green, red)) {
        red.dead = true; if (!green.pierce) green.dead = true; state.score += 8;
        addExplosion(red.x, red.y, '#c4afcf', .45); AudioManager?.sfx.projectileClash?.();
      }
    }
    for (const shot of state.playerShots) {
      if (shot.dead) continue;
      for (const enemy of state.enemies) {
        if (!enemy.dead && hit(shot, enemy)) {
          if (!shot.pierce) shot.dead = true;
          enemy.hp -= shot.phantomMissile ? enemy.hp : shot.damage;
          if (enemy.hp <= 0) {
            enemy.dead = true; state.kills++; state.levelKills++; state.score += Math.round(120 * state.difficulty); registerCombo(now);
            if (shot.phantomMissile) addExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, shot.color, 1.08);
            else addSolanaImpact(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 1.08);
            AudioManager?.sfx.enemyKill?.(); if (profile.settings?.vibration) navigator.vibrate?.(7);
            maybeDropPower(enemy.x - 5, enemy.y - 5);
            // A rising per-level chance makes the pickup feel random while still
            // making it increasingly likely to appear. The guard enforces one drop.
            const lifeChance = Math.min(.34, .065 + state.levelKills * .012);
            if (!state.extraLifeDropped && Math.random() < lifeChance) dropExtraLife(enemy.x - 6, enemy.y - 7);
          } else { if (shot.phantomMissile) addExplosion(shot.x + shot.w / 2, shot.y, shot.color, .52); else addSolanaImpact(shot.x + shot.w / 2, shot.y, .42); AudioManager?.sfx.enemyImpact?.(); }
          break;
        }
      }
      if (!shot.dead && state.boss && hit(shot, state.boss)) {
        if (shot.phantomMissile && shot.bossHit) continue;
        if (!shot.pierce) shot.dead = true;
        const boss = state.boss;
        if (now < (boss.invulnerableUntil || 0) && !shot.phantomMissile) {
          addBurst(shot.x, shot.y, boss.def?.colors?.[1] || '#b0d3c4', 4, 90);
          continue;
        }
        const beforeRatio = boss.hp / boss.maxHp;
        const powerId = shot.powerId || 'default';
        const coefficient = boss.kind === 'bull' ? (BULL_BOSS_DAMAGE[powerId] ?? .62) : 1;
        const appliedDamage = shot.phantomMissile
          ? (boss.kind === 'bull' ? boss.hp : 125)
          : shot.damage * coefficient;
        if (shot.phantomMissile) shot.bossHit = true;
        boss.hp -= appliedDamage; boss.hitsTaken = (boss.hitsTaken || 0) + 1; state.score += 25;
        if (boss.kind === 'bull' && !shot.phantomMissile) {
          [.66, .33].forEach(threshold => {
            const key = String(threshold);
            if (beforeRatio > threshold && boss.hp / boss.maxHp <= threshold && !boss.phaseLocks.has(key)) {
              boss.phaseLocks.add(key); boss.invulnerableUntil = now + 420;
              addBurst(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.def.colors[1], 22, 260);
              AudioManager?.sfx.bossPhase?.('bull');
            }
          });
        }
        if (state.boss.kind === 'bull' && state.level > 5 && state.boss.hitsTaken >= 25 && !state.boss.milestoneRewardDropped) {
          state.boss.milestoneRewardDropped = true;
          dropBossMilestoneRewards(state.boss);
        }
        if (shot.phantomMissile) addExplosion(shot.x, shot.y, shot.color, .8); else addSolanaImpact(shot.x, shot.y, .44); AudioManager?.sfx.bossImpact?.();
        if (state.boss.hp <= 0) defeatBoss();
      }
    }
    compactPooled(state.enemies, logicPools.enemy, enemy => !enemy.dead);
    if (state.boss && state.boss.hp <= 0) defeatBoss();
    const playerBox = playerHitbox();
    for (const red of state.enemyShots) if (!red.dead && hit(red, playerBox)) { red.dead = true; damagePlayer(); }
    for (const pickup of state.pickups) if (!pickup.dead && hit(pickup, playerBox)) {
      if (pickup.type === 'life') {
        state.lives = Math.min(9, state.lives + 1);
        pickup.dead = true;
        addBurst(pickup.x + 21, pickup.y + 21, '#b0d3c4', 34, 300);
        AudioManager?.sfx.extraLife(); if (profile.settings?.vibration) navigator.vibrate?.([16, 20, 16]);
      } else if (pickup.id === 'doubleTrinity' && state.shipTier === 1) {
        setShipTier(2, 'automatic dual-drift pickup'); pickup.dead = true; AudioManager?.sfx.power?.('doubleTrinity', 'activate');
        addBurst(pickup.x + 20, pickup.y + 20, POWER.doubleTrinity.color, 30, 300);
      } else if (pickup.id === 'triangle' && state.shipTier === 2) {
        setShipTier(3, 'automatic tensor-frame pickup'); pickup.dead = true; AudioManager?.sfx.power?.('triangle', 'activate');
        addBurst(pickup.x + 20, pickup.y + 20, POWER.triangle.color, 36, 320);
      } else if (pickup.id === 'twin' && state.shipTier === 3) {
        setShipTier(4, 'automatic orca-pod pickup'); pickup.dead = true; AudioManager?.sfx.power?.('twin', 'activate');
        addBurst(pickup.x + 20, pickup.y + 20, POWER.twin.color, 42, 340);
      } else if (pickup.id === 'trinity' && state.shipTier === 4) {
        setShipTier(5, 'automatic kamino-tri pickup'); pickup.dead = true; AudioManager?.sfx.power?.('trinity', 'activate');
        addBurst(pickup.x + 20, pickup.y + 20, POWER.trinity.color, 48, 360);
      } else if (pickup.id === 'bomb' || pickup.id === 'bomb2') {
        // Instant bomb (EPOCH 2+ only). Damage radii intentionally match rocket scale; no Ranked physics change.
        pickup.dead = true;
        const cx = pickup.x + 21, cy = pickup.y + 21;
        const radius = Math.max(120, width * .34) * (pickup.id === 'bomb2' ? 1.25 : 1);
        state.enemies.forEach(e => { if (!e.dead && Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < radius) { e.hp = 0; e.dead = true; state.kills++; state.score += 40; } });
        if (state.boss && Math.hypot(state.boss.x + state.boss.w / 2 - cx, state.boss.y + state.boss.h / 2 - cy) < radius) {
          state.boss.hp -= pickup.id === 'bomb2' ? 90 : 55;
        }
        state.enemyShots.forEach(s => { if (Math.hypot(s.x - cx, s.y - cy) < radius) s.dead = true; });
        addExplosion(cx, cy, POWER[pickup.id].color, pickup.id === 'bomb2' ? 2.6 : 2.1);
        addSolanaImpact(cx, cy, 1.8);
        AudioManager?.sfx.power?.(pickup.id, 'activate');
      } else if (state.slots.length < maxPowerSlots() && !['twin', 'trinity', 'doubleTrinity', 'triangle', 'bomb', 'bomb2'].includes(pickup.id)) {
        state.slots.push(pickup.id); syncSlot(); pickup.dead = true; updatePowerSlot(); AudioManager?.sfx.power?.(pickup.id, 'pickup');
      }
    }
    compactPooled(state.playerShots, logicPools.playerShot, shot => !shot.dead && shot.y + shot.h > -40 && shot.x > -40 && shot.x < width + 40);
    compactPooled(state.enemyShots, logicPools.enemyShot, shot => !shot.dead && shot.y < height + 40 && shot.x > -40 && shot.x < width + 40);
    state.eyeShots = state.eyeShots.filter(shot => !shot.dead && shot.life > 0 && shot.y > -60 && shot.y < height + 60 && shot.x > -60 && shot.x < width + 60);
    state.pickups = state.pickups.filter(pickup => !pickup.dead && pickup.y < height + 60);
    updateHud();
  }

  function candle(context, shot, isPlayer) {
    context.save();
    // Player shots: null color → Solana gradient (default gun only). Fixed color otherwise.
    // Enemy shots keep red palette.
    const useSolana = isPlayer && (shot.color == null);
    let candleColor, strokeHi, fillLo;
    if (!isPlayer) {
      candleColor = shot.color || '#ff2444'; strokeHi = '#ff9cab'; fillLo = '#7e071a';
    } else if (useSolana) {
      // Solana gradient: green → cyan → purple along the beam
      candleColor = SOLANA_GRADIENT[1]; strokeHi = '#eaffef'; fillLo = SOLANA_GRADIENT[2];
    } else {
      candleColor = shot.color || '#c4afcf'; strokeHi = '#ffffff'; fillLo = candleColor;
    }
    const tierIntensity = isPlayer ? Math.max(0, Number(shot.tier || 1) - 1) : 0;
    context.shadowColor = candleColor; context.shadowBlur = (shot.power ? 22 : 12) + tierIntensity * 2.5;
    context.strokeStyle = strokeHi; context.lineWidth = shot.power ? 3.2 : 1.6;
    context.beginPath(); context.moveTo(shot.x + shot.w / 2, shot.y - 5); context.lineTo(shot.x + shot.w / 2, shot.y + shot.h + 5); context.stroke();
    const gradient = context.createLinearGradient(shot.x, shot.y, shot.x + shot.w, shot.y + shot.h);
    if (useSolana) {
      gradient.addColorStop(0, SOLANA_GRADIENT[0]);
      gradient.addColorStop(.45, SOLANA_GRADIENT[1]);
      gradient.addColorStop(1, SOLANA_GRADIENT[2]);
    } else {
      gradient.addColorStop(0, strokeHi); gradient.addColorStop(.35, candleColor); gradient.addColorStop(1, fillLo);
    }
    context.fillStyle = gradient; context.fillRect(shot.x, shot.y + 3, shot.w, Math.max(7, shot.h - 6)); context.restore();
  }
  function drawBear(enemy) {
    // v6: pattern-based hue shifts so every level / row feels distinct while reusing one sprite.
    // Patterns cycle by level + row + col for visual variety without new art assets.
    const bob = Math.sin(state.elapsed * 5 + enemy.x * .03) * 1.6;
    const pulse = .5 + Math.sin(state.elapsed * 7 + enemy.row) * .5;
    const hue = ((currentEpoch() * 41 + state.level * 37 + (enemy.row || 0) * 53 + (enemy.col || 0) * 17) % 360);
    const satBoost = 1.15 + ((enemy.row || 0) % 3) * .12;
    ctx.save();
    ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2 + bob);
    ctx.rotate(Math.sin(state.elapsed * 2.4 + enemy.x * .015) * .035);
    ctx.scale(1 + pulse * .018, 1 - pulse * .012);
    ctx.shadowColor = `hsl(${hue} 90% 55%)`; ctx.shadowBlur = 12 + pulse * 7;
    if (bearImage.complete && bearImage.naturalWidth) {
      ctx.filter = `hue-rotate(${hue}deg) saturate(${satBoost}) brightness(1.05)`;
      ctx.drawImage(bearImage, -enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = `hsl(${hue} 70% 28%)`; ctx.beginPath(); ctx.roundRect(-enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h, 7); ctx.fill();
    }
    ctx.restore();
  }
  function drawBull() {
    const x = player.x, y = player.y, now = performance.now(), flicker = now < player.invulnerableUntil && Math.floor(now / 80) % 2;
    if (flicker) return;
    const pulse = .5 + Math.sin(now / 95) * .5;
    const bank = clamp((player.targetX - player.x) * .0045, -.16, .16);
    const hover = Math.sin(now / 150) * 1.6;
    ctx.save(); ctx.translate(x + player.w / 2, y + player.h / 2 + hover); ctx.rotate(bank);
    if (state.activePower) {
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, player.w * .72);
      glow.addColorStop(0, 'rgba(196,175,207,.22)'); glow.addColorStop(1, 'rgba(196,175,207,0)');
      ctx.globalAlpha = .58 + Math.sin(now / 90) * .14; ctx.fillStyle = glow;
      ctx.fillRect(-player.w * .75, -player.h * .75, player.w * 1.5, player.h * 1.5); ctx.globalAlpha = 1;
    }
    // Transparent craft art is drawn directly: no clip, hull fill, tint, stroke,
    // rectangle, decal, or livery can obstruct the spacecraft. Player size
    // and playerHitbox() remain unchanged across all five visual tiers.
    // v6.2.1 hotfix: the selected ship remains authoritative at every tier.
    // Formation is positional only; it must never substitute shared/default art.
    const baseImage = playerImage;
    // Tier 1, Tier 2 and Tier 3 use the exact same individual craft size.
    // Tier 2 has a clear lateral gap; Tier 3 is a forward/back triangle with
    // clear gaps on both axes. Tier 4 and Tier 5 retain the live 5.9.2 setup.
    // playerHitbox() / player.w / player.h never change with tier.
    const formation = formationForTier().map(craft => ({ x: player.w * craft.x, y: player.h * craft.y, scale: craft.scale * PLAYER_VISUAL_SCALE }));
    formation.forEach(craft => {
      const imageRatio = baseImage.naturalWidth && baseImage.naturalHeight ? baseImage.naturalWidth / baseImage.naturalHeight : player.w / player.h;
      let drawW = player.w * craft.scale, drawH = drawW / imageRatio;
      if (drawH > player.h * craft.scale) { drawH = player.h * craft.scale; drawW = drawH * imageRatio; }
      const flame = player.h * craft.scale * (.12 + pulse * .08);
      const engine = ctx.createLinearGradient(0, craft.y + drawH * .22, 0, craft.y + drawH * .52);
      engine.addColorStop(0, '#ffffff'); engine.addColorStop(.28, '#c4afcf'); engine.addColorStop(1, 'rgba(176,211,196,0)');
      ctx.fillStyle = engine; ctx.shadowColor = '#b0d3c4'; ctx.shadowBlur = 12;
      [-.2, .2].forEach(offset => {
        const ex = craft.x + drawW * offset, ey = craft.y + drawH * .31;
        ctx.beginPath(); ctx.moveTo(ex - 2.5, ey); ctx.lineTo(ex, ey + flame); ctx.lineTo(ex + 2.5, ey); ctx.closePath(); ctx.fill();
      });
      ctx.shadowColor = '#b0d3c4'; ctx.shadowBlur = state.shipTier > 1 ? 24 : 14;
      if (baseImage.complete && baseImage.naturalWidth) {
        // CSS canvas filters preserve the transparent spacecraft silhouette: no
        // rectangle, outline, background, or alternate collision path is added.
        ctx.save();
        ctx.drawImage(baseImage, craft.x - drawW / 2, craft.y - drawH / 2, drawW, drawH);
        ctx.restore();
      }
    });
    ctx.restore();
  }
  function drawCaptureFx(now) {
    const fx = state.captureFx;
    if (!fx) return;
    if (now >= fx.until) { state.captureFx = null; return; }
    const duration = 900;
    const progress = clamp(1 - (fx.until - now) / duration, 0, 1);
    const fade = Math.sin(progress * Math.PI);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(fx.x, fx.y);
    ctx.strokeStyle = '#b0d3c4'; ctx.shadowColor = '#b0d3c4'; ctx.shadowBlur = 18;
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 18 + progress * 72, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#c4afcf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 8 + progress * 48, -progress * Math.PI, progress * Math.PI * 1.5); ctx.stroke();
    ctx.restore();
  }
  function drawImagePiece(image, source, target, angle = 0, scaleX = 1) {
    const [sx, sy, sw, sh] = source, [dx, dy, dw, dh, pivotX = .5, pivotY = .2] = target;
    ctx.save(); ctx.translate(dx + dw * pivotX, dy + dh * pivotY); ctx.rotate(angle); ctx.scale(scaleX, 1);
    ctx.drawImage(image, sx, sy, sw, sh, -dw * pivotX, -dh * pivotY, dw, dh); ctx.restore();
  }
  function drawArticulatedBoss(image, drawW, drawH, boss, headless = false) {
    if (!image?.complete || !image.naturalWidth) return false;
    const sourceW = image.naturalWidth, sourceH = image.naturalHeight;
    const gait = Math.sin(state.elapsed * 6.5 + boss.phase) * .12;
    const attack = Math.sin(state.elapsed * 5.4 + boss.phase) * .16 + boss.recoil * .34;
    const aim = clamp((player.x + player.w / 2 - (boss.x + boss.w / 2)) / Math.max(1, width * .42), -1, 1);
    const leftLeg = [sourceW * .12, sourceH * .53, sourceW * .42, sourceH * .47];
    const rightLeg = [sourceW * .46, sourceH * .53, sourceW * .42, sourceH * .47];
    drawImagePiece(image, leftLeg, [-drawW * .39, drawH * .04, drawW * .47, drawH * .54, .55, .08], gait);
    drawImagePiece(image, rightLeg, [-drawW * .08, drawH * .04, drawW * .47, drawH * .54, .45, .08], -gait);
    if (!headless) {
      drawImagePiece(image, [0, sourceH * .15, sourceW * .43, sourceH * .67], [-drawW * .58, -drawH * .27, drawW * .56, drawH * .65, .78, .18], -attack);
      drawImagePiece(image, [sourceW * .57, sourceH * .15, sourceW * .43, sourceH * .67], [drawW * .02, -drawH * .27, drawW * .56, drawH * .65, .22, .18], attack);
    }
    if (headless) {
      drawImagePiece(image, [sourceW * .19, 0, sourceW * .62, sourceH * .76], [-drawW * .36, -drawH * .43, drawW * .72, drawH * .73, .5, .28], boss.recoil * -.035);
    } else {
      drawImagePiece(image, [sourceW * .20, sourceH * .26, sourceW * .60, sourceH * .51], [-drawW * .36, -drawH * .20, drawW * .72, drawH * .54, .5, .3], boss.recoil * -.035);
      const turnScale = 1 - Math.abs(aim) * .09;
      drawImagePiece(image, [sourceW * .16, 0, sourceW * .68, sourceH * .60], [-drawW * .41 + aim * drawW * .035, -drawH * .5, drawW * .82, drawH * .64, .5, .72], aim * .07 - boss.recoil * .025, turnScale);
    }
    return true;
  }
  function drawBoss(boss) {
    const { colors, key } = boss.def, { w, h } = boss;
    const image = bossImages[key], hover = Math.sin(state.elapsed * 3 + boss.phase) * 4, pulse = .5 + Math.sin(state.elapsed * 4) * .5;
    const breathe = 1 + Math.sin(state.elapsed * 4.6 + boss.phase) * .025;
    ctx.save(); ctx.translate(boss.x + w / 2, boss.y + h / 2 + hover - boss.recoil * 4); ctx.rotate(Math.sin(state.elapsed * 1.7 + boss.phase) * .035); ctx.scale(breathe + boss.recoil * .035, 1 / breathe - boss.recoil * .025);
    // Boss art is rendered cleanly with no circular aura, outline, or fallback ring.
    drawArticulatedBoss(image, w, h, boss, false);
    boss.def.hands.forEach((hand, index) => {
      const x = (hand[0] - .5) * w, y = (hand[1] - .5) * h;
      ctx.globalAlpha = .35 + pulse * .45 + (boss.recoil && index === boss.shotSide ? .2 : 0);
      ctx.fillStyle = colors[1]; ctx.shadowColor = colors[1]; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(x, y, 2.6 + pulse * 1.8, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.restore();
  }
  function drawCanvas() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const media = $('invadersImageBackground'), video = $('invadersVideoBackground'), stream = $('invadersMediaScene');
    const mediaOn = !!(media && !media.hidden && media.src) || !!(video && !video.hidden && (video.currentSrc || video.src)) || !!(stream && !stream.hidden);
    ctx.clearRect(0, 0, width, height);
    if (!mediaOn) {
      const levelImage = levelBackgroundImages[(state.level - 1) % levelBackgroundImages.length];
      if (levelImage?.complete && levelImage.naturalWidth) {
        const scale = Math.max(width / levelImage.naturalWidth, height / levelImage.naturalHeight);
        const drawW = levelImage.naturalWidth * scale, drawH = levelImage.naturalHeight * scale;
        ctx.drawImage(levelImage, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
        ctx.fillStyle = 'rgba(2,4,3,.26)'; ctx.fillRect(0, 0, width, height);
      } else {
        const sky = ctx.createRadialGradient(width * .5, height * .2, 20, width * .5, height * .5, height); sky.addColorStop(0, '#173027'); sky.addColorStop(.38, '#07130f'); sky.addColorStop(1, '#010302'); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      }
    } else { ctx.fillStyle = 'rgba(0,5,2,.36)'; ctx.fillRect(0, 0, width, height); }
    const nebula = ctx.createRadialGradient(width * .18, height * .3, 8, width * .18, height * .3, width * .6);
    nebula.addColorStop(0, 'rgba(176,211,196,.13)'); nebula.addColorStop(.42, 'rgba(80,20,125,.08)'); nebula.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nebula; ctx.fillRect(0, 0, width, height);
    state.stars.forEach(star => {
      ctx.globalAlpha = star.a; ctx.fillStyle = star.s > 1.4 ? '#e8e2eb' : '#a8c9d5'; ctx.shadowColor = '#c4afcf'; ctx.shadowBlur = star.s > 1.4 ? 6 : 0;
      ctx.beginPath(); ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2); ctx.fill();
    }); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(176,211,196,.035)'; ctx.fillRect(0, height * .375, width, height * .625);
    ctx.strokeStyle = 'rgba(176,211,196,.15)'; ctx.setLineDash([5, 8]); ctx.beginPath(); ctx.moveTo(0, height * .375); ctx.lineTo(width, height * .375); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(176,211,196,.12)'; ctx.lineWidth = 1;
    for (let y = height * .56; y < height; y += 27) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    for (let x = 0; x < width; x += 38) { ctx.beginPath(); ctx.moveTo(width / 2 + (x - width / 2) * .25, height * .56); ctx.lineTo(x, height); ctx.stroke(); }
    state.enemies.forEach(drawBear);
    if (state.boss) {
      drawBoss(state.boss); const ratio = Math.max(0, state.boss.hp / state.boss.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(30, 49, width - 60, 10); ctx.fillStyle = state.boss.def.colors[1]; ctx.fillRect(31, 50, (width - 62) * ratio, 8);
    }
    state.playerShots.forEach(shot => candle(ctx, shot, true)); state.enemyShots.forEach(shot => candle(ctx, shot, false)); state.eyeShots.forEach(drawEyeShot);
    state.specialRockets.forEach(rocket => {
      ctx.save(); ctx.translate(rocket.x, rocket.y); ctx.rotate(rocket.angle + Math.PI / 2);
      const gradient = ctx.createLinearGradient(0, -rocket.h / 2, 0, rocket.h / 2);
      gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.32, rocket.ability.color); gradient.addColorStop(1, rocket.ability.secondary);
      ctx.shadowColor = rocket.ability.color; ctx.shadowBlur = 16; ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.moveTo(0, -rocket.h / 2); ctx.lineTo(rocket.w / 2, rocket.h * .32); ctx.lineTo(0, rocket.h / 2); ctx.lineTo(-rocket.w / 2, rocket.h * .32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rocket.ability.secondary; ctx.globalAlpha = .8; ctx.fillRect(-2, rocket.h * .35, 4, 13); ctx.restore();
    });
    state.pickups.forEach(pickup => {
      const isLife = pickup.type === 'life', def = isLife ? { color: '#b0d3c4' } : POWER[pickup.id], image = isLife ? null : powerImages[pickup.id];
      ctx.save(); ctx.shadowColor = def.color; ctx.shadowBlur = 18 + Math.sin(pickup.phase) * 7;
      ctx.strokeStyle = def.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, 23 + Math.sin(pickup.phase) * 2, 0, Math.PI * 2); ctx.stroke();
      if (isLife) {
        const cx = pickup.x + 21, cy = pickup.y + 21; ctx.fillStyle = '#072b18'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#eaffef'; ctx.beginPath(); ctx.roundRect(cx - 4, cy - 12, 8, 24, 3); ctx.roundRect(cx - 12, cy - 4, 24, 8, 3); ctx.fill();
      } else if (image?.complete && image.naturalWidth) ctx.drawImage(image, pickup.x, pickup.y, pickup.w, pickup.h);
      else { ctx.fillStyle = def.color; ctx.fillRect(pickup.x, pickup.y, pickup.w, pickup.h); }
      ctx.restore();
    });
    const denseEffects = state.particles.length > 150 || state.explosions.length > 14;
    state.particles.forEach(p => {
      const ratio = Math.max(0, p.life / .75); ctx.globalAlpha = ratio; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      if (denseEffects) { ctx.shadowBlur = 0; ctx.fillRect(p.x - p.s * .3, p.y - p.s * .3, p.s * .6, p.s * .9); }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(-p.s * .25, -p.s * .7, p.s * .5, p.s * 1.4); ctx.restore(); }
    });
    state.explosions.forEach(explosion => {
      const ratio = explosion.life / explosion.maxLife; ctx.globalAlpha = Math.max(0, ratio);
      const flare = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, explosion.radius);
      if (explosion.palette) {
        flare.addColorStop(0, '#ffffff');
        explosion.palette.forEach((color, index) => flare.addColorStop(.14 + index * (.72 / Math.max(1, explosion.palette.length - 1)), color));
        flare.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        flare.addColorStop(0, '#ffffff'); flare.addColorStop(.18, '#fff16a'); flare.addColorStop(.48, explosion.color); flare.addColorStop(1, 'rgba(0,0,0,0)');
      }
      ctx.fillStyle = flare; ctx.beginPath(); ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2); ctx.fill();
      if (explosion.palette) {
        (denseEffects ? explosion.palette.slice(0, 3) : explosion.palette).forEach((color, index) => {
          ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, (5 - index) * ratio); ctx.beginPath();
          ctx.arc(explosion.x, explosion.y, explosion.radius * (1.04 + index * .13), state.elapsed * (index + 1), state.elapsed * (index + 1) + Math.PI * 1.28); ctx.stroke();
        });
      } else {
        // Projectile-on-projectile clashes intentionally remain green.
        ctx.strokeStyle = explosion.color; ctx.lineWidth = Math.max(1, 5 * ratio); ctx.beginPath(); ctx.arc(explosion.x, explosion.y, explosion.radius * 1.18, 0, Math.PI * 2); ctx.stroke();
      }
    });
    state.rocketBursts.forEach(burst => {
      const ratio = burst.life / burst.maxLife; const primary = burst.color || '#b0d3c4', secondary = burst.secondary || '#c4afcf';
      ctx.globalAlpha = Math.max(0, ratio * .85); ctx.strokeStyle = primary; ctx.lineWidth = 8 * ratio + 1; ctx.shadowColor = primary; ctx.shadowBlur = denseEffects ? 12 : 28;
      ctx.beginPath(); ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2); ctx.stroke();
      for (let ray = 0; ray < 8; ray++) { const angle = ray * Math.PI / 4; ctx.strokeStyle = ray % 2 ? secondary : primary; ctx.beginPath(); ctx.moveTo(burst.x + Math.cos(angle) * burst.radius * .25, burst.y + Math.sin(angle) * burst.radius * .25); ctx.lineTo(burst.x + Math.cos(angle) * burst.radius, burst.y + Math.sin(angle) * burst.radius); ctx.stroke(); }
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; drawBull(); drawCaptureFx(performance.now());
    // Pointer tracking remains active, but no touch/finger indicator is rendered.
  }
  function updateHud() {
    if ($('invaderScore')) $('invaderScore').textContent = state.score.toLocaleString();
    if ($('invaderLevel')) $('invaderLevel').textContent = `${state.level}/${BOSSES.length} · W${state.wave}/${state.wavesRequired}`;
    if ($('invaderLives')) $('invaderLives').textContent = '♥'.repeat(Math.max(0, state.lives));
    if ($('invaderModeHud')) $('invaderModeHud').textContent = state.mode.toUpperCase();
    if ($('invaderBossName')) $('invaderBossName').textContent = state.boss
      ? (state.boss.kind === 'bull' ? 'FINAL ROSTER BOSS' : 'ROSTER BOSS')
      : `BEAR WAVE ${state.wave}/${state.wavesRequired}`;
  }
  function rendererModel(now) {
    const media = $('invadersImageBackground'), video = $('invadersVideoBackground'), stream = $('invadersMediaScene');
    const mediaOn = !!(media && !media.hidden && media.src) || !!(video && !video.hidden && (video.currentSrc || video.src)) || !!(stream && !stream.hidden);
    return {
      now, width, height, dpr, mediaOn, elapsed: state.elapsed, level: state.level, epoch: currentEpoch(),
      stars: state.stars, enemies: state.enemies, boss: state.boss,
      playerShots: state.playerShots, enemyShots: state.enemyShots, eyeShots: state.eyeShots, specialRockets: state.specialRockets,
      particles: state.particles, explosions: state.explosions, rocketBursts: state.rocketBursts, pickups: state.pickups,
      powerColors: colorblindSafe() ? Object.fromEntries(Object.keys(POWER).map(id => [id, COLORBLIND_POWER_COLORS[id] || POWER_COLORS[id]])) : POWER_COLORS,
      player, shipTier: state.shipTier, shipId: selectedShip().id, shipLivery: null, movementEnergy: state.movementEnergy, visualScale: PLAYER_VISUAL_SCALE,
      captureFx: state.captureFx, reducedMotion: reducedMotion(), colorblindSafe: colorblindSafe()
    };
  }
  function draw(interpolation = 0, now = performance.now()) {
    if (state.useEngineV2 && engineV2?.ready) {
      try {
        if (engineV2.render(rendererModel(now), interpolation)) return;
      } catch (error) {
        engineV2.fallback?.(error?.message || String(error));
        state.useEngineV2 = false; state.rendererFallbackReason = error?.message || String(error);
      }
    }
    drawCanvas();
  }
  function frameLoop(now) {
    raf = requestAnimationFrame(frameLoop);
    if (!state.running || state.paused || !active() || document.hidden) {
      lastTime = now; simulationNow = now; fixedAccumulator = 0; return;
    }
    const frameStarted = performance.now();
    const frameDelta = Math.min(.1, Math.max(0, (now - (lastTime || now)) / 1000));
    lastTime = now; fixedAccumulator += frameDelta;
    let steps = 0;
    while (fixedAccumulator >= FIXED_STEP && steps < MAX_FIXED_STEPS) {
      simulationNow += FIXED_STEP * 1000;
      update(FIXED_STEP, simulationNow);
      fixedAccumulator -= FIXED_STEP; steps += 1;
    }
    if (fixedAccumulator >= FIXED_STEP) { fixedAccumulator %= FIXED_STEP; frameMetrics.droppedFrames += 1; }
    draw(fixedAccumulator / FIXED_STEP, now);
    const cost = performance.now() - frameStarted;
    frameMetrics.frames += 1; frameMetrics.logicSteps += steps; frameMetrics.frameMsTotal += cost; frameMetrics.frameMsMax = Math.max(frameMetrics.frameMsMax, cost);
  }
  async function start() {
    showView('invadersGame'); resize(); await preloadCampaignAssets();
    await BackgroundManager?.applyGame(profile, 'invaders'); await BackgroundManager?.onRunStart(profile, 'invaders');
    await engineReady; reset();
    if (state.mode === 'ranked') {
      state.paused = true;
      try { await global.BBRLeaderboard?.beginRun?.(state.mode, 'bull-invaders'); }
      catch (_) { toast('Server screening is unavailable; this run will remain local.'); }
      state.paused = false;
    }
    lastTime = performance.now(); simulationNow = lastTime; fixedAccumulator = 0; AudioManager?.sfx.shipMove?.(.12);
    const pauseButton = $('pauseInvaders'); if (pauseButton) { pauseButton.textContent = 'PAUSE'; pauseButton.setAttribute('aria-pressed', 'false'); }
    setRecordingResult('');
    state.recordingRequested = global.BBRRunRecorder?.isArmed?.() === true;
    let recordingResult = { started: false, reason: 'not-armed' };
    if (state.recordingRequested) {
      const sourceCanvas = $('invadersEngineCanvas') || canvas;
      recordingResult = await global.BBRRunRecorder.start({
        enabled: true,
        canvas: sourceCanvas,
        metadata: { game: 'bull-invaders', epoch: currentEpoch(), shipId: selectedShip().id, startedAt: Date.now() }
      });
    } else {
      // Starting a new unrecorded run clears the previous one without ever
      // entering captureStream() or MediaRecorder.
      await global.BBRRunRecorder?.discard?.('unarmed-run');
    }
    const recordingToggle = $('recordRunToggle'); if (recordingToggle) recordingToggle.checked = false;
    if ($('invaderRecordingLive')) $('invaderRecordingLive').hidden = !recordingResult?.started;
    if (state.recordingRequested && !recordingResult?.started) toast('Recording is not available in this browser');
    if (!raf) raf = requestAnimationFrame(frameLoop);
  }
  function pause() { state.paused = true; releasePointer({}); AudioManager?.sfx.shipStop?.(); BackgroundManager?.onRunPause('invaders'); }
  function togglePause() {
    if (!state.running || state.over) return;
    state.paused = !state.paused; releasePointer({}); lastTime = performance.now();
    const button = $('pauseInvaders'); if (button) { button.textContent = state.paused ? 'RESUME' : 'PAUSE'; button.setAttribute('aria-pressed', String(state.paused)); }
    if (state.paused) { AudioManager?.sfx.shipStop?.(); BackgroundManager?.onRunPause('invaders'); }
    else { AudioManager?.sfx.shipMove?.(.12); BackgroundManager?.onRunResume(profile, 'invaders'); }
    AudioManager?.sfx[state.paused ? 'warn' : 'start']?.(); if (profile.settings?.vibration) navigator.vibrate?.(10);
  }
  function stop() { state.running = false; state.paused = true; state.flowToken += 1; setFlow(FLOW_STATES.IDLE); releasePointer({}); if ($('invaderRecordingLive')) $('invaderRecordingLive').hidden = true; AudioManager?.sfx.shipStop?.(); clearPooled(state.playerShots, logicPools.playerShot); clearPooled(state.enemyShots, logicPools.enemyShot); state.eyeShots.length = 0; }
  function recordRun(completedRun) {
    if (!completedRun) return;
    profile.gameRuns = profile.gameRuns || {}; profile.gameRuns['bull-invaders'] = profile.gameRuns['bull-invaders'] || [];
    profile.gameRuns['bull-invaders'].push(completedRun);
    profile.gameRuns['bull-invaders'] = profile.gameRuns['bull-invaders'].slice(-300); save();
    renderAll?.();
  }
  function finalizePendingRun() {
    if (!state.pendingRun) return;
    const run = state.pendingRun; state.pendingRun = null; recordRun(run);
  }
  const formatRunTime = milliseconds => {
    const total = Math.max(0, Math.round(milliseconds / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  const runGrade = won => won ? (state.lives >= 3 ? 'S' : state.lives >= 2 ? 'A' : 'B') : state.level >= 15 ? 'B' : state.level >= 8 ? 'C' : 'D';
  function grantEpochClear(epoch) {
    profile.unlockedEpochs = Array.isArray(profile.unlockedEpochs) ? profile.unlockedEpochs : [1];
    profile.clearedEpochs = Array.isArray(profile.clearedEpochs) ? profile.clearedEpochs : [];
    profile.unlockedShips = Array.isArray(profile.unlockedShips) ? profile.unlockedShips : [0];
    const nextEpoch = epoch < EPOCH_CONFIG.max ? epoch + 1 : null;
    if (!profile.clearedEpochs.includes(epoch)) profile.clearedEpochs.push(epoch);
    if (nextEpoch && !profile.unlockedEpochs.includes(nextEpoch)) profile.unlockedEpochs.push(nextEpoch);
    if (!profile.unlockedShips.includes(epoch)) profile.unlockedShips.push(epoch);
    profile.clearedEpochs = [...new Set(profile.clearedEpochs)].sort((a, b) => a - b);
    profile.unlockedEpochs = [...new Set(profile.unlockedEpochs)].sort((a, b) => a - b);
    profile.unlockedShips = [...new Set(profile.unlockedShips)].sort((a, b) => a - b);
    profile.selectedShip = V7_FEATURES.themedEpochShips ? epoch : 0;
    if (nextEpoch) profile.selectedEpoch = nextEpoch;
    save(); // Persist before any reveal/CTA so refresh cannot lose the reward.
    renderCampaignControls();
    return { epoch, nextEpoch, ship: V7_FEATURES.themedEpochShips ? SHIPS[epoch] : selectedShip(), nextSector: nextEpoch ? EPOCH_SECTORS[nextEpoch - 1] : null };
  }
  function scheduleFlowAdvance(expected, delay) {
    const token = ++state.flowToken;
    setTimeout(() => { if (state.flowToken === token && state.flow === expected) advanceVictoryFlow(); }, delay);
  }
  function renderResultOverlay(won, completedRun) {
    $('invaderFinalScore').textContent = state.score.toLocaleString();
    $('invaderFinalTime').textContent = formatRunTime(completedRun.elapsedMs);
    $('invaderFinalGrade').textContent = runGrade(won);
    $('invaderFinalKills').textContent = String(state.kills);
    $('invaderFinalLevel').textContent = `${state.level}/${BOSSES.length}`;
    $('shipUnlockStage').hidden = true; $('epochBridgeStage').hidden = true;
    $('invadersOverEyebrow').textContent = won ? 'EPOCH VICTORY' : 'RUN ENDED';
    $('invadersOverTitle').textContent = won ? 'EPOCH CONTAINED' : "YOU'RE REKT";
    $('invaderAgain').textContent = won ? (V7_FEATURES.themedEpochShips ? 'REVEAL NEW SHIP' : 'SYNC CRAFT') : 'RUN IT BACK';
    $('invaderSecondaryAction').hidden = !won;
    if (won) $('invaderSecondaryAction').textContent = state.nextEpoch ? `SKIP TO EPOCH ${state.nextEpoch}` : 'RETURN HOME';
    $('invadersOver')?.classList.toggle('is-victory', won);
    $('invadersOver')?.classList.add('show');
  }
  function beginVictoryFlow(reward) {
    state.nextEpoch = reward.nextEpoch;
    state.unlockReward = reward;
    setFlow(FLOW_STATES.EPOCH_VICTORY);
    AudioManager?.sfx.epochVictory?.();
    scheduleFlowAdvance(FLOW_STATES.EPOCH_VICTORY, reducedMotion() ? 450 : 1250);
  }
  async function autoStartNextEpoch() {
    const next = state.nextEpoch;
    if (!next) return returnHome();
    state.flowToken += 1; setFlow(FLOW_STATES.AUTO_START);
    if (global.BBRRunMode?.mode?.() !== 'arcade') global.BBRRunMode?.setMode?.('arcade');
    profile.selectedEpoch = next; profile.selectedShip = state.unlockReward.ship.id; save();
    await preloadCampaignAssets();
    if (state.useEngineV2 && engineV2?.ready) await engineV2.setCampaign(next);
    await start();
  }
  function advanceVictoryFlow() {
    const reward = state.unlockReward;
    if (!reward) return;
    if (state.flow === FLOW_STATES.EPOCH_VICTORY) {
      setFlow(FLOW_STATES.SHIP_UNLOCK);
      $('invadersOverEyebrow').textContent = `EPOCH ${reward.epoch} SECURED`;
      $('invadersOverTitle').textContent = V7_FEATURES.themedEpochShips ? 'NEW SHIP ONLINE' : 'CRAFT SYNCED';
      $('shipUnlockStage').hidden = false; $('shipUnlockImage').src = reward.ship.asset;
      $('shipUnlockName').textContent = reward.ship.name; $('shipUnlockTag').textContent = reward.ship.tag;
      $('invaderAgain').textContent = reward.nextEpoch ? 'OPEN BRIDGE' : 'COMPLETE THE CAMPAIGN';
      AudioManager?.sfx.shipUnlock?.();
      scheduleFlowAdvance(FLOW_STATES.SHIP_UNLOCK, reducedMotion() ? 550 : 1700);
      return;
    }
    if (state.flow === FLOW_STATES.SHIP_UNLOCK) {
      if (!reward.nextEpoch) {
        setFlow(FLOW_STATES.COMPLETE); $('invadersOverEyebrow').textContent = 'ALL SECTORS CLEARED';
        $('invadersOverTitle').textContent = 'ALL EPOCHS CONTAINED'; $('invaderAgain').textContent = 'RETURN HOME';
        $('invaderSecondaryAction').hidden = true; return;
      }
      setFlow(FLOW_STATES.BRIDGE); $('shipUnlockStage').hidden = true; $('epochBridgeStage').hidden = false;
      $('invadersOverEyebrow').textContent = 'BRIDGE SEQUENCE'; $('invadersOverTitle').textContent = `ENTER EPOCH ${reward.nextEpoch}`;
      $('epochBridgeCode').textContent = `DESTINATION · EPOCH ${String(reward.nextEpoch).padStart(2, '0')}`;
      $('epochBridgeName').textContent = reward.nextSector.name; $('epochBridgeTag').textContent = reward.nextSector.tag;
      $('invaderAgain').textContent = 'START NEXT EPOCH';
      scheduleFlowAdvance(FLOW_STATES.BRIDGE, reducedMotion() ? 650 : 1900);
      return;
    }
    if (state.flow === FLOW_STATES.BRIDGE) autoStartNextEpoch();
    else if (state.flow === FLOW_STATES.COMPLETE) returnHome();
  }
  async function returnHome() {
    state.flowToken += 1; finalizePendingRun();
    await global.BBRRunRecorder?.discard?.('campaign-complete');
    await BBRPlatform.leaveGame('bull-invaders'); BackgroundManager?.stopPlayback?.('invaders');
    showView('home', { fromHistory: true });
  }
  function end(won) {
    if (state.over) return;
    state.running = false; state.over = true; releasePointer({}); if ($('invaderRecordingLive')) $('invaderRecordingLive').hidden = true; AudioManager?.sfx.shipStop?.(); BackgroundManager?.onRunEnd('invaders'); AudioManager?.stopMusic();
    state.resultWon = won;
    const epoch = currentEpoch();
    const reward = won ? grantEpochClear(epoch) : null;
    const completedRun = { ts: Date.now(), score: state.score, level: state.level, won, mode: state.mode, kills: state.kills, bossesDefeated: state.bossesDefeated, elapsedMs: Math.max(1000, Math.round(performance.now() - runStartedAt)), epoch, damageTaken: state.damageTaken, continuesUsed: state.continuesUsed };
    if (state.recordingRequested) {
      global.BBRRunRecorder?.stop?.({ reason: 'run-ended', metadata: completedRun }).then(file => {
        if (file) setRecordingResult('Your game session is ready to share. It is not saved and will be erased when you replay or leave.', true);
        else setRecordingResult('No playable recording was produced by this browser.', false);
      });
    }
    invaderLastSummary = { game: 'bull-invaders', title: won ? `EPOCH ${epoch} CONTAINED` : 'BULL INVADERS RUN', stats: [
      { label: 'Score', value: state.score.toLocaleString() }, { label: 'Bears', value: state.kills }, { label: 'Bosses', value: `${state.bossesDefeated}/${BOSSES.length}` }, { label: 'EPOCH', value: epoch }
    ], footer: `LEVEL ${state.level}/${BOSSES.length} · EPOCH ${epoch} · ${won ? 'SECTOR CLEARED' : "YOU'RE REKT"}` };
    state.pendingRun = null;
    recordRun(completedRun);
    if (reward) state.nextEpoch = reward.nextEpoch;
    renderResultOverlay(won, completedRun);
    if (won) beginVictoryFlow(reward);
    else { setFlow(FLOW_STATES.DEATH); AudioManager?.sfx.gameOver?.(); }
  }
  async function handlePrimaryResult() {
    if ([FLOW_STATES.EPOCH_VICTORY, FLOW_STATES.SHIP_UNLOCK, FLOW_STATES.BRIDGE, FLOW_STATES.COMPLETE].includes(state.flow)) return advanceVictoryFlow();
    finalizePendingRun(); await global.BBRRunRecorder?.discard?.('replay'); BBRPlatform.launch('bull-invaders');
  }
  async function handleSecondaryResult() {
    if (state.resultWon && state.nextEpoch) return autoStartNextEpoch();
    if (state.resultWon) return returnHome();
  }
  function pointerMove(event) {
    if (!state.running || state.inputLocked || !active()) return;
    const rect = canvas.getBoundingClientRect();
    const fingerX = (event.clientX - rect.left) * (width / rect.width);
    const fingerY = (event.clientY - rect.top) * (height / rect.height);
    pointer.lead = clamp(height * 0.14, 76, 124);
    pointer.fingerX = fingerX;
    pointer.fingerY = fingerY;
    player.targetX = fingerX - player.w / 2;
    player.targetY = fingerY - player.h / 2 - pointer.lead;
    player.targetX = clamp(player.targetX, 4, width - player.w - 4); player.targetY = clamp(player.targetY, ceilingY(), floorY());
  }
  function releasePointer(event) {
    const eventId = event.pointerId ?? event.changedTouches?.[0]?.identifier ?? null;
    if (pointer.id !== null && eventId !== null && eventId !== pointer.id) return;
    pointer.active = false; pointer.id = null; pointer.kind = null; pointer.fingerX = null; pointer.fingerY = null;
  }
  function isGameControl(target) {
    return !!target?.closest?.('button, .overlay, input, textarea, select, a');
  }
  function beginPointer(clientX, clientY, id, kind) {
    if (!state.running || state.inputLocked || !active()) return false;
    pointer.active = true; pointer.id = id; pointer.kind = kind;
    pointerMove({ clientX, clientY });
    BackgroundManager?.armFromGesture?.(profile, 'invaders');
    return true;
  }
  function setRecordingResult(message, ready = false) {
    const actions = $('invaderRecordingActions'), label = $('invaderRecordingStatus');
    if (actions) actions.hidden = !ready;
    if (label) { label.hidden = !message; label.textContent = message || ''; }
  }
  async function shareRecordedSession() {
    const result = await global.BBRRunRecorder?.share?.();
    if (!result) return;
    if (result.shared) {
      setRecordingResult(result.method === 'download' ? 'Recording downloaded and cleared from memory.' : 'Recording shared and cleared from memory.', false);
      toast(result.method === 'download' ? 'Session downloaded' : 'Session shared');
    } else {
      setRecordingResult(result.cancelled ? 'Share cancelled. Your recording is still ready.' : 'Share failed. Try again or use Save Video.', true);
      toast(result.cancelled ? 'Share cancelled' : 'Use Save Video');
    }
  }
  async function saveRecordedSession() {
    const result = await global.BBRRunRecorder?.download?.();
    if (result?.saved) {
      setRecordingResult('Recording saved and cleared from memory.', false);
      toast('Video saved');
    } else {
      setRecordingResult(result?.cancelled ? 'Save cancelled. Your recording is still ready.' : 'Could not save. Your recording is still ready.', true);
      toast(result?.cancelled ? 'Save cancelled' : 'Could not save video');
    }
  }
  async function returnToLanding(continueYoutube = true) {
    state.flowToken += 1; setFlow(FLOW_STATES.IDLE);
    finalizePendingRun();
    await global.BBRRunRecorder?.discard?.('leave-game');
    setRecordingResult('');
    await BBRPlatform.leaveGame('bull-invaders');
    if (continueYoutube && profile.bg?.gameType === BackgroundManager?.TYPES?.YOUTUBE) {
      await BackgroundManager?.resumeOnLanding?.(profile, 'invaders');
    } else BackgroundManager?.stopPlayback?.('invaders');
    showView('home', { fromHistory: true });
  }
  async function keepListening() {
    await returnToLanding(true);
  }
  function init() {
    canvas = $('invadersCanvas'); const surface = $('invadersArea'); if (!canvas || !surface) return; ctx = canvas.getContext('2d', { alpha: true }); preloadAssets(); renderCampaignControls(); resize();
    engineReady = initializeRendererV2();
    window.addEventListener('resize', resize);
    surface.addEventListener('pointerdown', event => {
      if (isGameControl(event.target)) return;
      if (!beginPointer(event.clientX, event.clientY, event.pointerId, 'pointer')) return;
      event.preventDefault(); surface.setPointerCapture?.(event.pointerId);
    });
    surface.addEventListener('pointermove', event => { if (pointer.active && pointer.kind === 'pointer' && event.pointerId === pointer.id) { event.preventDefault(); pointerMove(event); } });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => surface.addEventListener(type, releasePointer));
    // Android WebViews that do not deliver reliable Pointer Events get an explicit touch path.
    if (!global.PointerEvent) {
      surface.addEventListener('touchstart', event => {
        if (isGameControl(event.target)) return;
        const touch = event.changedTouches?.[0];
        if (!touch || !beginPointer(touch.clientX, touch.clientY, touch.identifier, 'touch')) return;
        event.preventDefault();
      }, { passive: false });
      surface.addEventListener('touchmove', event => {
        if (!pointer.active || pointer.kind !== 'touch') return;
        const touch = [...(event.touches || [])].find(item => item.identifier === pointer.id);
        if (!touch) return;
        event.preventDefault(); pointerMove(touch);
      }, { passive: false });
      ['touchend', 'touchcancel'].forEach(type => surface.addEventListener(type, releasePointer, { passive: false }));
    }
    window.addEventListener('blur', () => releasePointer({}));
    $('invaderPowerSlot')?.addEventListener('pointerdown', activatePower);
    $('invaderRocketButton')?.addEventListener('pointerdown', fireRocket);
    $('epochSelect')?.addEventListener('change', event => selectEpoch(event.target.value));
    $('shipSelect')?.addEventListener('change', event => selectShip(event.target.value));
    $('pauseInvaders')?.addEventListener('click', togglePause);
    $('invaderAgain')?.addEventListener('click', handlePrimaryResult);
    $('invaderSecondaryAction')?.addEventListener('click', handleSecondaryResult);
    $('invaderListen')?.addEventListener('click', keepListening);
    $('invaderShareSession')?.addEventListener('click', shareRecordedSession);
    $('invaderSaveSession')?.addEventListener('click', saveRecordedSession);
    window.addEventListener('bbrs:run-mode-change', async event => {
      if (event.detail?.mode === 'ranked' && currentEpoch() !== 1) {
        profile.selectedEpoch = 1;
        save();
        await preloadCampaignAssets();
        if (state.useEngineV2 && engineV2?.ready) await engineV2.setCampaign(1);
      }
      renderCampaignControls();
    });
    $('exitInvaders')?.addEventListener('click', async () => {
      const youtube = profile.bg?.gameType === BackgroundManager?.TYPES?.YOUTUBE;
      if (state.running && !confirm(youtube ? 'Exit mission and continue YouTube on the landing page?' : 'End this mission?')) return;
      await returnToLanding(youtube);
    });
    $('invaderShareCard')?.addEventListener('click', () => invaderLastSummary && global.BBRShareCard?.export(invaderLastSummary));
    document.addEventListener('keydown', event => { if (!active()) return; if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space'].includes(event.code)) { event.preventDefault(); keys.add(event.code); } });
    document.addEventListener('keyup', event => keys.delete(event.code));
    BBRPlatform.games.register({ id: 'bull-invaders', title: 'Bull Invaders', start, pause, stop });
  }

  global.BullInvaders = {
    getSessionCaptures: () => state.bullsCapturedSession || 0,
    
    init, start, pause, stop, bosses: BOSSES, powers: POWER, ships: SHIPS, campaignConfig: EPOCH_CONFIG, flowStates: FLOW_STATES,
    verifyShipHitbox: tier => setShipTier(tier, 'verification'),
    verifyEyeDefense, verifyAllShipHitboxes, verifyActualProjectileSpawn, verifyActualRocketSpawn, verifySelectedShipAcrossEpochs,
    verifyProjectileVolley: tier => ({
      tier,
      craftCount: formationForTier(tier).length,
      perCraft: projectilesPerCraftForTier(tier),
      projectileCount: projectileVolleyBlueprint(tier).length,
      rocketPerCraft: rocketsPerCraftForTier(tier),
      rocketCount: rocketVolleyBlueprint(tier).length
    }),
    verifyRocketVolley: tier => ({
      tier,
      craftCount: formationForTier(tier).length,
      perCraft: rocketsPerCraftForTier(tier),
      rocketCount: rocketVolleyBlueprint(tier).length,
      expected: formationForTier(tier).length * rocketsPerCraftForTier(tier)
    }),
    specialAbilities: SPECIAL_ABILITY_CONFIG, shipVisualIdentity,
    verifyPowerSpec: () => ({
      uniqueIcons: new Set(Object.values(POWER).map(definition => definition.asset)).size === Object.keys(POWER).length,
      powers: Object.fromEntries(Object.entries(POWER).map(([id, definition]) => [id, { name: definition.name, color: definition.color, duration: definition.duration, asset: definition.asset }])),
      solFlares: { continuous: true, duration: POWER.nova.duration, pattern: 'dual yellow flare', bossCoefficient: BULL_BOSS_DAMAGE.nova },
      phantomMissile: { instant: POWER.shield.instant === true, duration: POWER.shield.duration, pierces: true, finalBullOneHit: true },
      bossBalance: { baseHpMultiplier: BULL_BOSS_BASE_HP_MULTIPLIER, perEpochHpStep: .14, damageCoefficients: { ...BULL_BOSS_DAMAGE } }
    }),
    verifySolFlaresVolley: () => {
      const original = {
        tier: state.shipTier, running: state.running, paused: state.paused, over: state.over,
        flow: state.flow, locked: state.inputLocked, activePower: state.activePower,
        lastShot: state.lastShot, shots: state.playerShots
      };
      state.shipTier = 1; state.running = true; state.paused = false; state.over = false;
      state.flow = FLOW_STATES.PLAYING; state.inputLocked = false; state.activePower = 'nova';
      state.lastShot = -Infinity; state.playerShots = [];
      shoot(performance.now());
      const result = {
        count: state.playerShots.length,
        colors: [...new Set(state.playerShots.map(shot => shot.color))],
        visible: state.playerShots.every(shot => shot.w > 0 && shot.h > 0 && shot.vy < 0),
        duration: POWER.nova.duration,
        damagePerShot: state.playerShots[0]?.damage || 0,
        bossCoefficient: BULL_BOSS_DAMAGE.nova,
        weakerThanJito: (.9 * 2 / 145) * BULL_BOSS_DAMAGE.nova < (5 / 175) * BULL_BOSS_DAMAGE.railgun
      };
      clearPooled(state.playerShots, logicPools.playerShot);
      state.shipTier = original.tier; state.running = original.running; state.paused = original.paused; state.over = original.over;
      state.flow = original.flow; state.inputLocked = original.locked; state.activePower = original.activePower;
      state.lastShot = original.lastShot; state.playerShots = original.shots;
      return result;
    },
    verifyPhantomMissile: () => {
      const original = { slots: state.slots, slot: state.slot, activePower: state.activePower, shots: state.playerShots, locked: state.inputLocked };
      state.slots = ['shield']; state.slot = 'shield'; state.activePower = null; state.playerShots = []; state.inputLocked = false;
      activatePower();
      const shot = state.playerShots[0];
      const result = { count: state.playerShots.length, powerId: shot?.powerId, pierce: shot?.pierce === true, color: shot?.color, instant: state.activePower == null };
      clearPooled(state.playerShots, logicPools.playerShot);
      state.slots = original.slots; state.slot = original.slot; state.activePower = original.activePower; state.playerShots = original.shots; state.inputLocked = original.locked;
      return result;
    },
    setRendererV2(enabled) { localStorage.setItem('abulls_invaders_engine_v2', enabled ? '1' : '0'); return enabled; },
    resetPerformanceMetrics() {
      frameMetrics.frames = 0; frameMetrics.logicSteps = 0; frameMetrics.frameMsTotal = 0; frameMetrics.frameMsMax = 0; frameMetrics.droppedFrames = 0;
      engineV2?.resetMetrics?.();
    },
    performanceSnapshot: () => ({
      renderer: state.useEngineV2 ? 'engine-v2' : 'canvas2d', fallbackReason: state.rendererFallbackReason,
      fixedStepHz: 60, frames: frameMetrics.frames, logicSteps: frameMetrics.logicSteps,
      averageFrameWorkMs: frameMetrics.frames ? frameMetrics.frameMsTotal / frameMetrics.frames : 0,
      maxFrameWorkMs: frameMetrics.frameMsMax, droppedCatchupFrames: frameMetrics.droppedFrames,
      engine: engineV2?.snapshot?.() || null,
      logicPools: Object.fromEntries(Object.entries(logicPools).map(([name, pool]) => [name, { capacity: pool.capacity, free: pool.free.length, createdAfterWarmup: pool.createdAfterWarmup }]))
    }),
    snapshot: () => ({
      player: { x: player.x, y: player.y, w: player.w, h: player.h, hitbox: playerHitbox(), targetX: player.targetX, targetY: player.targetY },
      bounds: { width, height, ceiling: ceilingY(), floor: floorY() },
      pointerActive: pointer.active,
      pointer: { fingerX: pointer.fingerX, fingerY: pointer.fingerY, lead: pointer.lead },
      shots: state.playerShots.length, eyeShots: state.eyeShots.length, lastShot: state.lastShot,
      difficulty: state.difficulty, bossesDefeated: state.bossesDefeated, level: state.level,
      mode: state.mode, leaderboardEligible: state.mode === 'ranked', maxPowerSlots: maxPowerSlots(),
      wave: state.wave, wavesRequired: state.wavesRequired, extraLifeDropped: state.extraLifeDropped,
      activePower: state.activePower, storedPower: state.slot, storedPowers: [...state.slots], rockets: state.rockets, transitioning: state.transitioning, shipTier: state.shipTier, bossCount: BOSSES.length,
      campaign: { epoch: currentEpoch(), selectedShip: selectedShip().id, unlockedEpochs: [...(profile.unlockedEpochs || [1])], unlockedShips: [...(profile.unlockedShips || [0])] },
      effects: { particles: state.particles.length, explosions: state.explosions.length, rocketBursts: state.rocketBursts.length, specialRockets: state.specialRockets.length, eyeShots: state.eyeShots.length, limits: { ...EFFECT_LIMITS } },
      renderer: { useEngineV2: state.useEngineV2, fallbackReason: state.rendererFallbackReason, fixedStepHz: 60 },
      flow: { state: state.flow, inputLocked: state.inputLocked, nextEpoch: state.nextEpoch }
    })
  };
})(window);
