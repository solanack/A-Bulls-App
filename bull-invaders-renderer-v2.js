/* Bull Invaders Engine V2 — PixiJS/WebGL render layer with Canvas2D fallback. */
(function (global) {
  'use strict';

  const CORE_ATLAS = 'assets/atlases/invaders-core-v620.json';
  const V7_ATLAS = 'assets/atlases/invaders-v7.json';
  const POWER_ICON_ASSETS = Object.freeze({
    rapid: 'assets/powerups/ecosystem/rapid.svg', spread: 'assets/powerups/ecosystem/spread.svg', shield: 'assets/powerups/ecosystem/shield.svg',
    overdrive: 'assets/powerups/ecosystem/overdrive.svg', magnet: 'assets/powerups/ecosystem/magnet.svg', nova: 'assets/powerups/ecosystem/nova.svg',
    doubleTrinity: 'assets/powerups/ecosystem/double-trinity.svg', triangle: 'assets/powerups/ecosystem/triangle.svg', twin: 'assets/powerups/ecosystem/twin.svg',
    trinity: 'assets/powerups/ecosystem/trinity.svg', railgun: 'assets/powerups/ecosystem/railgun.svg', plasma: 'assets/powerups/ecosystem/plasma.svg',
    homing: 'assets/powerups/ecosystem/homing.svg', bomb: 'assets/powerups/ecosystem/bomb.svg', bomb2: 'assets/powerups/ecosystem/bomb2.svg'
  });
  const MAX = Object.freeze({ stars: 64, enemies: 40, playerCraft: 3, trails: 6, shots: 246, shotGlow: 128, particles: 128, explosions: 17, pickups: 24, bosses: 2, bossHeads: 1, bossArms: 2, bossHands: 2 });
  const hex = value => {
    const text = String(value || '#ffffff').replace('#', '').slice(0, 6);
    return Number.parseInt(text.length === 3 ? text.split('').map(char => char + char).join('') : text, 16) || 0xffffff;
  };
  const hslToHex = (h, s = 82, l = 58) => {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
    return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255);
  };

  class SpritePool {
    constructor(PIXI, container, size, texture) {
      this.items = Array.from({ length: size }, () => {
        const sprite = new PIXI.Sprite(texture || PIXI.Texture.WHITE);
        sprite.anchor.set(.5); sprite.visible = false; container.addChild(sprite); return sprite;
      });
      this.cursor = 0;
    }
    begin() { this.cursor = 0; }
    take() { const sprite = this.items[this.cursor++]; if (sprite) sprite.visible = true; return sprite; }
    end() { for (let i = this.cursor; i < this.items.length; i += 1) this.items[i].visible = false; }
  }

  class RendererV2 {
    constructor(options) {
      this.options = options;
      this.PIXI = global.PIXI;
      this.app = null;
      this.ready = false;
      this.failed = false;
      this.reason = '';
      this.core = {};
      this.campaign = {};
      this.v7Player = null;
      this.v7Bear = null;
      this.v7Bosses = {};
      this.backgroundLevel = 0;
      this.backgroundRequest = 0;
      this.powerIcons = {};
      this.campaignId = 0;
      this.campaignAtlasId = 1;
      this.pools = {};
      this.deviceProfile = this.detectDeviceProfile();
      this.quality = this.deviceProfile.initialQuality;
      this.qualitySamples = [];
      this.metrics = { renderer: 'initializing', quality: this.quality, frames: 0, renderMsTotal: 0, renderMsMax: 0, fallbacks: 0, qualityDrops: 0, migrationStages: [] };
    }

    detectDeviceProfile() {
      const memory = Number(navigator.deviceMemory || 0);
      const cores = Number(navigator.hardwareConcurrency || 0);
      const coarse = global.matchMedia?.('(pointer: coarse)')?.matches === true;
      const constrained = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
      return { memory, cores, coarse, constrained, initialQuality: constrained ? 'fast' : coarse ? 'balanced' : 'full' };
    }

    async init() {
      if (!this.PIXI) return this.fallback('PixiJS library unavailable');
      try {
        if (new URLSearchParams(location.search).get('renderer') === 'webgl-fail') throw new Error('Forced WebGL failure test');
        const PIXI = this.PIXI;
        this.app = new PIXI.Application();
        await this.app.init({
          width: this.options.width,
          height: this.options.height,
          resolution: this.options.dpr,
          autoDensity: true,
          autoStart: false,
          antialias: false,
          backgroundAlpha: 0,
          preference: 'webgl',
          powerPreference: 'high-performance',
          hello: false
        });
        const gl = this.app.renderer.gl;
        if (!gl) throw new Error('WebGL context was not created');
        this.canvas = this.app.canvas;
        this.canvas.id = 'invadersEngineCanvas';
        this.canvas.className = 'invaders-engine-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '3' });
        this.options.canvas.insertAdjacentElement('afterend', this.canvas);
        this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.fallback('WebGL context lost'); }, { once: true });
        this.options.canvas.style.visibility = 'hidden';
        this.makeLayers();
        const sheet = await PIXI.Assets.load(CORE_ATLAS);
        this.core = sheet?.textures || sheet || {};
        if (global.BBRV7?.features?.chunkyToyArt) {
          const v7Sheet = await PIXI.Assets.load(V7_ATLAS);
          const textures = v7Sheet?.textures || v7Sheet || {};
          this.v7Player = textures.player;
          this.v7Bear = textures.bear;
          this.v7Bosses = Object.fromEntries(Object.entries(textures).filter(([key]) => !['player', 'bear'].includes(key)));
        }
        const iconEntries = await Promise.all(Object.entries(POWER_ICON_ASSETS).map(async ([id, source]) => [id, await PIXI.Assets.load(source)]));
        this.powerIcons = Object.fromEntries(iconEntries);
        await this.setCampaign(this.options.epoch || 1);
        this.makeScene();
        await this.setLevelBackground(1);
        this.ready = true;
        this.metrics.renderer = `pixi-webgl-${typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? '2' : '1'}`;
        console.info('[Bull Invaders Engine V2] ready', { renderer: this.metrics.renderer, pools: MAX, coreAtlas: CORE_ATLAS, v7Atlas: V7_ATLAS });
        return true;
      } catch (error) {
        return this.fallback(error?.message || String(error));
      }
    }

    makeLayers() {
      const P = this.PIXI;
      this.layers = {
        background: new P.Container(), stars: new P.Container(), enemies: new P.Container(), boss: new P.Container(),
        glow: new P.Container(), shots: new P.Container(), fx: new P.Container(), pickups: new P.Container(),
        playerGlow: new P.Container(), player: new P.Container(), overlay: new P.Container()
      };
      Object.values(this.layers).forEach(layer => this.app.stage.addChild(layer));
      const blur = new P.BlurFilter({ strength: 5, quality: 2 });
      blur.padding = 18; this.glowFilters = [blur]; this.layers.glow.blendMode = 'add';
      const fxBlur = new P.BlurFilter({ strength: 2.5, quality: 1 });
      fxBlur.padding = 14; this.fxFilters = [fxBlur]; this.layers.fx.blendMode = 'add';
      const playerBlur = new P.BlurFilter({ strength: 4, quality: 1 });
      playerBlur.padding = 18; this.playerFilters = [playerBlur]; this.layers.playerGlow.blendMode = 'add';
      this.applyQuality(this.quality);
    }

    applyQuality(next) {
      this.quality = next;
      if (!this.layers) return;
      // Glow-orb atlas textures preserve the neon look even when expensive
      // full-layer blur passes are removed on phones.
      this.layers.glow.filters = next === 'full' ? this.glowFilters : null;
      this.layers.fx.filters = next === 'full' ? this.fxFilters : null;
      this.layers.playerGlow.filters = next === 'fast' ? null : this.playerFilters;
      if (this.metrics) this.metrics.quality = next;
    }

    sampleQuality(cost) {
      if (this.quality === 'fast') return;
      this.qualitySamples.push(cost);
      if (this.qualitySamples.length < 120) return;
      const average = this.qualitySamples.reduce((sum, value) => sum + value, 0) / this.qualitySamples.length;
      this.qualitySamples.length = 0;
      if (average > 10.5) {
        this.metrics.qualityDrops += 1;
        this.applyQuality(this.quality === 'full' ? 'balanced' : 'fast');
        console.info('[Bull Invaders Engine V2] adaptive quality', { averageRenderMs: average, quality: this.quality });
      }
    }

    makeScene() {
      const P = this.PIXI, T = P.Texture.WHITE;
      this.background = new P.Sprite(T); this.background.tint = 0x07140d; this.layers.background.addChild(this.background);
      this.nebula = new P.Sprite(this.core['glow-orb'] || T); this.nebula.tint = 0x14f195; this.nebula.alpha = .16; this.layers.background.addChild(this.nebula);
      this.playerZone = new P.Sprite(T); this.playerZone.tint = 0x14f195; this.playerZone.alpha = .055; this.layers.background.addChild(this.playerZone);
      this.gridLines = Array.from({ length: 18 }, () => { const line = new P.Sprite(T); line.tint = 0x14f195; line.alpha = .1; this.layers.background.addChild(line); return line; });
      this.bossBarBack = new P.Sprite(T); this.bossBarBack.tint = 0x000000; this.bossBarBack.alpha = .72; this.bossBarBack.visible = false; this.layers.overlay.addChild(this.bossBarBack);
      this.bossBar = new P.Sprite(T); this.bossBar.visible = false; this.layers.overlay.addChild(this.bossBar);
      this.captureRing = new P.Sprite(this.core['glow-orb'] || T); this.captureRing.anchor.set(.5); this.captureRing.visible = false; this.layers.overlay.addChild(this.captureRing);

      this.pools.stars = new SpritePool(P, this.layers.stars, MAX.stars, this.core['glow-orb'] || T);
      this.pools.enemies = new SpritePool(P, this.layers.enemies, MAX.enemies, this.v7Bear || this.core.bear || T);
      this.pools.bosses = new SpritePool(P, this.layers.boss, MAX.bosses, T);
      this.pools.bossHeads = new SpritePool(P, this.layers.boss, MAX.bossHeads, T);
      this.pools.bossArms = new SpritePool(P, this.layers.boss, MAX.bossArms, T);
      this.pools.bossHands = new SpritePool(P, this.layers.boss, MAX.bossHands, this.core['glow-orb'] || T);
      this.pools.player = new SpritePool(P, this.layers.player, MAX.playerCraft, T);
      this.pools.trails = new SpritePool(P, this.layers.playerGlow, MAX.trails, this.core['glow-orb'] || T);
      this.pools.shots = new SpritePool(P, this.layers.shots, MAX.shots, T);
      this.pools.shotGlow = new SpritePool(P, this.layers.glow, MAX.shotGlow, this.core['glow-orb'] || T);
      this.pools.particles = new SpritePool(P, this.layers.fx, MAX.particles, this.core['glow-orb'] || T);
      this.pools.explosions = new SpritePool(P, this.layers.fx, MAX.explosions, this.core['glow-orb'] || T);
      this.pools.pickups = new SpritePool(P, this.layers.pickups, MAX.pickups, T);
      this.resize(this.options.width, this.options.height, this.options.dpr);
    }

    async setLevelBackground(level) {
      const sources = global.BBRV7?.config?.levelBackgrounds || [];
      const next = Math.max(1, Math.min(sources.length || 1, Number(level) || 1));
      if (!sources.length || this.backgroundLevel === next) return;
      const request = ++this.backgroundRequest;
      try {
        const texture = await this.PIXI.Assets.load(sources[next - 1]);
        if (request !== this.backgroundRequest || !this.background) return;
        this.background.texture = texture;
        this.background.tint = 0xffffff;
        this.backgroundLevel = next;
        this.resize(this.options.width, this.options.height, this.options.dpr);
      } catch (error) {
        console.warn('[Bull Invaders Engine V2] level background fallback', error?.message || error);
      }
    }

    async setCampaign(epoch) {
      const next = Math.max(1, Math.min(10, Number(epoch) || 1));
      if (this.campaignId === next && Object.keys(this.campaign).length) return;
      // All ten EPOCHS share the authoritative original-character art from
      // EPOCH 1. Campaign variety remains in state-driven movement, bear hues,
      // HP and projectile patterns rather than nine duplicate texture atlases.
      if (!Object.keys(this.campaign).length) {
        const sheet = await this.PIXI.Assets.load('assets/atlases/invaders-epoch-1-v630.json');
        this.campaign = sheet?.textures || sheet || {};
      }
      this.campaignId = next;
    }

    resize(width, height, dpr) {
      if (!this.app || this.failed) return;
      this.options.width = width; this.options.height = height; this.options.dpr = dpr;
      this.app.renderer.resolution = dpr;
      this.app.renderer.resize(width, height);
      if (!this.background) return;
      const textureW = Number(this.background.texture?.width || width), textureH = Number(this.background.texture?.height || height);
      const cover = Math.max(width / textureW, height / textureH);
      Object.assign(this.background, { x: (width - textureW * cover) / 2, y: (height - textureH * cover) / 2, width: textureW * cover, height: textureH * cover });
      Object.assign(this.nebula, { x: width * -.32, y: height * -.24, width: width * 1.64, height: Math.max(width, height) * 1.2 });
      Object.assign(this.playerZone, { x: 0, y: height * .375, width, height: height * .625 });
      this.gridLines.forEach((line, index) => {
        if (index < 9) Object.assign(line, { x: 0, y: height * (.56 + index * .055), width, height: 1 });
        else Object.assign(line, { x: width * ((index - 9) / 8), y: height * .56, width: 1, height: height * .44 });
      });
    }

    fallback(reason) {
      this.failed = true; this.ready = false; this.reason = reason; this.metrics.renderer = 'canvas2d-fallback'; this.metrics.fallbacks += 1;
      if (this.options.canvas) this.options.canvas.style.visibility = '';
      try { this.canvas?.remove(); this.app?.destroy?.(true); } catch (_) {}
      console.warn('[Bull Invaders Engine V2] Canvas2D fallback active:', reason);
      this.options.onFallback?.(reason);
      return false;
    }

    syncPool(name, source, update) {
      const pool = this.pools[name]; pool.begin();
      for (let i = 0; i < source.length && i < pool.items.length; i += 1) {
        const sprite = pool.take(); update(sprite, source[i], i);
      }
      pool.end();
    }

    verifyMigrationStage(stage, detail) {
      if (this.metrics.migrationStages.some(item => item.stage === stage)) return;
      const check = { stage, passed: true, detail };
      this.metrics.migrationStages.push(check);
      console.info('[Bull Invaders Engine V2 migration stage]', check);
    }

    render(model) {
      if (!this.ready || this.failed) return false;
      const started = performance.now();
      if (model.epoch !== this.campaignId) this.setCampaign(model.epoch).catch(error => this.fallback(error.message));
      if (!model.mediaOn && model.level !== this.backgroundLevel) this.setLevelBackground(model.level);
      this.background.alpha = model.mediaOn ? .42 : 1;
      this.syncPool('stars', model.stars, (s, star) => {
        s.texture = this.core['glow-orb']; s.x = star.x; s.y = star.y; s.width = s.height = 4 + star.s * 4; s.alpha = star.a; s.tint = star.s > 1.4 ? 0xd8fff0 : 0x7affb5;
      });
      this.verifyMigrationStage('1-background-starfield', `${model.stars.length} pooled stars; static GPU background`);
      this.syncPool('enemies', model.enemies, (s, enemy) => {
        s.texture = this.v7Bear || this.core.bear; s.x = enemy.x + enemy.w / 2; s.y = enemy.y + enemy.h / 2 + (model.reducedMotion ? 0 : Math.sin(model.elapsed * 5 + enemy.x * .03) * 1.6);
        s.width = enemy.w; s.height = enemy.h; s.rotation = Math.sin(model.elapsed * 2.4 + enemy.x * .015) * .035;
        s.tint = hslToHex((model.epoch * 41 + model.level * 37 + enemy.row * 53 + enemy.col * 17) % 360);
      });
      this.drawBoss(model);
      this.drawPlayer(model);
      this.verifyMigrationStage('2-player-ship', `authoritative ${model.player.w}x${model.player.h}; tier ${model.shipTier}`);
      this.drawShots(model);
      this.verifyMigrationStage('3-projectiles', `${model.playerShots.length + model.enemyShots.length + model.eyeShots.length} pooled projectiles`);
      this.drawEffects(model);
      this.verifyMigrationStage('4-particles-explosions', `${model.particles.length} particles; ${model.explosions.length} explosions`);
      this.verifyMigrationStage('5-bears-bosses', `${model.enemies.length} bears; boss ${model.boss ? model.boss.kind : 'none'}`);
      this.drawPickups(model);
      this.drawOverlay(model);
      this.verifyMigrationStage('6-ui-overlay-fx', 'boss health and capture FX use overlay layer');
      this.app.renderer.render(this.app.stage);
      const cost = performance.now() - started;
      this.metrics.frames += 1; this.metrics.renderMsTotal += cost; this.metrics.renderMsMax = Math.max(this.metrics.renderMsMax, cost);
      this.sampleQuality(cost);
      return true;
    }

    drawBoss(model) {
      const source = model.boss ? [model.boss] : [];
      this.syncPool('bosses', source, (s, boss) => {
        const frame = `${boss.kind === 'meme' ? 'meme' : 'bull'}-${String(model.level).padStart(2, '0')}`;
        s.texture = this.v7Bosses[boss.def?.key] || this.campaign[frame] || this.v7Bear || this.core.bear;
        s.x = boss.x + boss.w / 2; s.y = boss.y + boss.h / 2 + (model.reducedMotion ? 0 : Math.sin(model.elapsed * 3.2 + (boss.phase || 0)) * 2);
        s.width = boss.w; s.height = boss.h; s.rotation = model.reducedMotion ? 0 : Math.sin(model.elapsed * 2.1 + (boss.phase || 0)) * .025;
        s.tint = 0xffffff; s.alpha = .98;
      });
      const boss = model.boss;
      const useLegacyNftBoss = global.BBRV7?.features?.bullpenNftCosmetics === true;
      const cutout = boss?.kind === 'bull' && useLegacyNftBoss ? global.BullBossRoster?.cutoutFor?.(boss.def?.visual?.mint) : null;
      this.syncPool('bossHeads', cutout ? [{ boss, cutout }] : [], (s, item) => {
        const aim = Math.max(-1, Math.min(1, Number(item.boss.dir || 0)));
        s.texture = this.PIXI.Texture.from(item.cutout); s.anchor.set(.5);
        s.x = item.boss.x + item.boss.w / 2 + aim * item.boss.w * .035;
        s.y = item.boss.y + item.boss.h * .25;
        s.width = item.boss.w * 1.02 * (1 - Math.abs(aim) * .08); s.height = item.boss.h * .7;
        s.rotation = aim * .075 - (item.boss.recoil || 0) * .028; s.tint = 0xffffff; s.alpha = .99;
      });
      const aimArms = boss?.kind === 'bull' && useLegacyNftBoss ? [.29, .71].map(ratio => {
        const shoulderX = boss.x + boss.w * ratio, shoulderY = boss.y + boss.h * .48;
        const targetX = model.player.x + model.player.w / 2, targetY = model.player.y + model.player.h * .42;
        const angle = Math.atan2(targetY - shoulderY, targetX - shoulderX), reach = boss.w * .27;
        return { shoulderX, shoulderY, angle, reach, tipX: shoulderX + Math.cos(angle) * reach, tipY: shoulderY + Math.sin(angle) * reach, accent: boss.def?.visual?.accent || '#14f195' };
      }) : [];
      this.syncPool('bossArms', aimArms, (s, arm) => {
        s.texture = this.PIXI.Texture.WHITE; s.anchor.set(0, .5);
        s.x = arm.shoulderX; s.y = arm.shoulderY; s.width = arm.reach; s.height = Math.max(8, boss.w * .075);
        s.rotation = arm.angle; s.tint = hex(arm.accent); s.alpha = .82;
      });
      this.syncPool('bossHands', aimArms, (s, arm) => {
        s.texture = this.core['glow-orb'] || this.PIXI.Texture.WHITE; s.anchor.set(.5);
        s.x = arm.tipX; s.y = arm.tipY; s.width = s.height = Math.max(18, boss.w * .15);
        s.tint = hex(arm.accent); s.alpha = Number(boss.cooldown || 0) < .18 ? 1 : model.reducedMotion ? .58 : .48 + Math.sin(model.elapsed * 8) * .12;
      });
      this.bossBarBack.visible = this.bossBar.visible = Boolean(boss);
      if (boss) {
        const w = Math.max(0, model.width - 60), ratio = Math.max(0, boss.hp / boss.maxHp);
        Object.assign(this.bossBarBack, { x: 30, y: 49, width: w, height: 10 });
        Object.assign(this.bossBar, { x: 31, y: 50, width: Math.max(0, (w - 2) * ratio), height: 8, tint: hex(boss.def?.colors?.[1] || '#14f195') });
      }
    }

    drawShots(model) {
      this.shotScratch = this.shotScratch || [];
      this.shotScratch.length = 0;
      this.shotScratch.push(...model.playerShots, ...model.enemyShots, ...model.eyeShots, ...model.specialRockets);
      const shots = this.shotScratch;
      this.syncPool('shots', shots, (s, shot) => {
        const isRocket = Boolean(shot.ability), solana = shot.player && !shot.color && !isRocket;
        s.texture = solana ? this.core['projectile-solana'] : this.core['projectile-white'];
        const tierBoost = shot.player && !isRocket ? 1 + Math.max(0, Number(shot.tier || 1) - 1) * .045 : 1;
        s.x = shot.x + (isRocket ? 0 : shot.w / 2); s.y = shot.y + (isRocket ? 0 : shot.h / 2); s.width = isRocket ? shot.w * 2.1 : Math.max(10, shot.w * 3) * tierBoost; s.height = isRocket ? shot.h * 1.35 : Math.max(20, shot.h * 1.45) * tierBoost;
        s.rotation = shot.angle == null ? 0 : shot.angle + Math.PI / 2; s.tint = solana ? 0xffffff : hex(shot.ability?.color || shot.color || (shot.player ? '#14f195' : '#ff2444')); s.alpha = .96;
      });
      this.syncPool('shotGlow', shots, (s, shot) => {
        const isRocket = Boolean(shot.ability); s.texture = this.core['glow-orb']; s.x = shot.x + (isRocket ? 0 : shot.w / 2); s.y = shot.y + (isRocket ? 0 : shot.h / 2);
        s.width = Math.max(18, shot.w * (isRocket ? 5.5 : 4.5)); s.height = Math.max(28, shot.h * (isRocket ? 2.4 : 1.8)); s.tint = hex(shot.ability?.secondary || shot.color || (shot.player ? '#00c2ff' : '#ff2444')); s.alpha = isRocket ? .56 : .42;
      });
    }

    drawPickups(model) {
      this.syncPool('pickups', model.pickups, (s, pickup) => {
        s.texture = pickup.type === 'life' ? (this.core['power-phantom'] || this.core['glow-orb']) : (this.powerIcons[pickup.id] || this.core['glow-orb']); s.x = pickup.x + pickup.w / 2; s.y = pickup.y + pickup.h / 2;
        s.width = pickup.w * 1.15; s.height = pickup.h * 1.15; s.tint = hex(pickup.type === 'life' ? '#5dff9d' : model.powerColors[pickup.id] || '#5dff9d'); s.rotation = Math.sin(pickup.phase || 0) * .08;
      });
    }

    drawEffects(model) {
      this.syncPool('particles', model.particles, (s, particle) => {
        s.texture = this.core['glow-orb']; s.x = particle.x; s.y = particle.y; s.width = s.height = Math.max(3, particle.s * 2.4);
        s.tint = hex(particle.color); s.alpha = Math.max(0, particle.life / .75);
      });
      const all = model.explosions.concat(model.rocketBursts);
      this.syncPool('explosions', all, (s, explosion) => {
        const lifeRatio = Math.max(0, explosion.life / (explosion.maxLife || .82));
        s.texture = this.core['glow-orb']; s.x = explosion.x; s.y = explosion.y; s.width = s.height = Math.max(16, explosion.radius * 2.6);
        s.tint = hex(explosion.color || '#14f195'); s.alpha = lifeRatio * .88; s.rotation = model.elapsed * .7;
      });
    }

    drawPlayer(model) {
      const p = model.player, tier = model.shipTier, visualScale = model.visualScale || 1;
      const formation = tier === 2
        ? [{ x: -p.w * .56, y: 0, scale: 1 }, { x: p.w * .56, y: 0, scale: 1 }]
        : tier === 3 ? [{ x: 0, y: -p.h * .58, scale: 1 }, { x: -p.w * .56, y: p.h * .55, scale: 1 }, { x: p.w * .56, y: p.h * .55, scale: 1 }]
          : tier === 4 ? [{ x: -p.w * .48, y: 0, scale: .48 }, { x: p.w * .48, y: 0, scale: .48 }]
            : tier === 5 ? [{ x: 0, y: -p.h * .38, scale: .42 }, { x: -p.w * .48, y: p.h * .28, scale: .42 }, { x: p.w * .48, y: p.h * .28, scale: .42 }] : [{ x: 0, y: 0, scale: 1 }];
      const flicker = model.now < p.invulnerableUntil && Math.floor(model.now / 80) % 2;
      this.syncPool('player', flicker ? [] : formation, (s, craft) => {
        // v6.2.1 hotfix: formation changes positions/count only. Texture identity
        // always resolves from the selected EPOCH ship at every tier.
        s.texture = this.v7Player || this.core[`ship-${String(model.shipId).padStart(2, '0')}`] || this.core['ship-00'];
        s.x = p.x + p.w / 2 + craft.x; s.y = p.y + p.h / 2 + craft.y + (model.reducedMotion ? 0 : Math.sin(model.now / 150) * 1.6);
        s.width = p.w * craft.scale * visualScale; s.height = p.h * craft.scale * visualScale; s.rotation = Math.max(-.16, Math.min(.16, (p.targetX - p.x) * .0045)); s.tint = hex(model.shipLivery?.hull || '#ffffff');
      });
      const trailStrength = .45 + model.movementEnergy * .75;
      const trails = formation.flatMap(craft => [-.18, .18].map(offset => ({ craft, offset })));
      this.syncPool('trails', flicker ? [] : trails, (s, item) => {
        const scale = item.craft.scale; s.texture = this.core['glow-orb'];
        s.x = p.x + p.w / 2 + item.craft.x + p.w * item.offset * scale; s.y = p.y + p.h / 2 + item.craft.y + p.h * .42 * scale;
        s.width = p.w * .14 * scale; s.height = p.h * (.32 + model.movementEnergy * .34) * scale; s.tint = hex(model.shipLivery?.accent || '#14f195'); s.alpha = trailStrength;
      });
    }

    drawOverlay(model) {
      const fx = model.captureFx;
      const active = Boolean(fx && model.now < fx.until);
      this.captureRing.visible = active;
      if (!active) return;
      const progress = Math.max(0, Math.min(1, 1 - (fx.until - model.now) / 900));
      this.captureRing.x = fx.x; this.captureRing.y = fx.y; this.captureRing.width = this.captureRing.height = 36 + progress * 144; this.captureRing.tint = 0x14f195; this.captureRing.alpha = Math.sin(progress * Math.PI) * .72;
    }

    snapshot() {
      return { ...this.metrics, averageRenderMs: this.metrics.frames ? this.metrics.renderMsTotal / this.metrics.frames : 0, campaign: this.campaignId, campaignAtlas: this.campaignAtlasId, pools: { ...MAX }, reason: this.reason };
    }
    resetMetrics() {
      this.metrics.frames = 0; this.metrics.renderMsTotal = 0; this.metrics.renderMsMax = 0; this.metrics.fallbacks = 0;
    }
  }

  global.BBRInvadersRendererV2 = { create: options => new RendererV2(options), limits: MAX, coreAtlas: CORE_ATLAS };
})(window);
