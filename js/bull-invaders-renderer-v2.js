/* Bull Invaders Engine V2 — PixiJS/WebGL render layer with Canvas2D fallback. */
(function (global) {
  'use strict';

  const MAX = Object.freeze({ stars: 64, enemies: 40, playerCraft: 3, trails: 6, shots: 246, shotGlow: 128, particles: 128, explosions: 17, explosionRings: 24, pickups: 24, bosses: 2 });
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
      this.playerTexture = null;
      this.shipTextures = {};
      this.bearTexture = null;
      this.bossTextures = {};
      this.backgroundLevel = 0;
      this.backgroundRequest = 0;
      this.campaignId = 0;
      this.pools = {};
      this.deviceProfile = this.detectDeviceProfile();
      this.quality = this.deviceProfile.initialQuality;
      this.qualitySamples = [];
      this.frameSamples = [];
      this.lastModelNow = 0;
      this.stableWindows = 0;
      this.lastQualityChangeAt = 0;
      this.metrics = { renderer: 'initializing', quality: this.quality, frames: 0, renderMsTotal: 0, renderMsMax: 0, fallbacks: 0, qualityDrops: 0, hitchFrames: 0, severeHitches: 0, p95FrameMs: 0, p99FrameMs: 0, migrationStages: [] };
    }

    detectDeviceProfile() {
      const memory = Number(navigator.deviceMemory || 0);
      const cores = Number(navigator.hardwareConcurrency || 0);
      const coarse = global.matchMedia?.('(pointer: coarse)')?.matches === true;
      const reducedMotion = global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
      const saveData = navigator.connection?.saveData === true;
      const highDpr = Number(global.devicePixelRatio || 1) > 2.25;
      const constrained = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
      const initialQuality = (constrained || saveData || reducedMotion) ? 'fast' : (coarse || highDpr) ? 'balanced' : 'full';
      return { memory, cores, coarse, constrained, reducedMotion, saveData, highDpr, initialQuality };
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
        const manifest = global.BBRV7?.config;
        if (!manifest?.playerShip || !manifest?.bearShip || !manifest?.bossAssets) throw new Error('Authoritative v8 art manifest unavailable');
        [this.playerTexture, this.bearTexture] = await Promise.all([
          PIXI.Assets.load(manifest.playerShip),
          PIXI.Assets.load(manifest.bearShip)
        ]);
        const shipSources = Array.isArray(manifest.shipAssets) && manifest.shipAssets.length ? manifest.shipAssets : [manifest.playerShip];
        const shipEntries = await Promise.all(shipSources.map(async (source, id) => {
          try { return [id, await PIXI.Assets.load(source)]; }
          catch (_) { return [id, this.playerTexture]; }
        }));
        this.shipTextures = Object.fromEntries(shipEntries);
        const bossEntries = await Promise.all(Object.entries(manifest.bossAssets).map(async ([key, source]) => [key, await PIXI.Assets.load(source)]));
        this.bossTextures = Object.fromEntries(bossEntries);
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = glowCanvas.height = 64;
        const glowCtx = glowCanvas.getContext('2d');
        const glow = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        glow.addColorStop(0, 'rgba(255,255,255,1)');
        glow.addColorStop(.22, 'rgba(255,255,255,.95)');
        glow.addColorStop(.58, 'rgba(255,255,255,.34)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        glowCtx.fillStyle = glow; glowCtx.fillRect(0, 0, 64, 64);
        const ringCanvas = document.createElement('canvas');
        ringCanvas.width = ringCanvas.height = 64;
        const ringCtx = ringCanvas.getContext('2d');
        ringCtx.strokeStyle = '#fff'; ringCtx.lineWidth = 5;
        ringCtx.beginPath(); ringCtx.arc(32, 32, 25, 0, Math.PI * 2); ringCtx.stroke();
        this.core = {
          'glow-orb': PIXI.Texture.from(glowCanvas),
          'shock-ring': PIXI.Texture.from(ringCanvas),
          'projectile-solana': PIXI.Texture.WHITE,
          'projectile-white': PIXI.Texture.WHITE,
          bear: this.bearTexture,
          'ship-00': this.playerTexture
        };
        await this.setCampaign(this.options.epoch || 1);
        this.makeScene();
        await this.setLevelBackground(1);
        this.prewarmGpu();
        this.ready = true;
        this.metrics.renderer = `pixi-webgl-${typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? '2' : '1'}`;
        console.info('[Bull Invaders Engine V2] ready', { renderer: this.metrics.renderer, pools: MAX, bossAssets: Object.keys(this.bossTextures).length, resolver: 'resolveBossTexture' });
        return true;
      } catch (error) {
        return this.fallback(error?.message || String(error));
      }
    }

    prewarmGpu() {
      if (!this.app?.stage) return;
      try {
        const priorAlpha = this.app.stage.alpha;
        this.app.stage.alpha = .001;
        // Force shader/program creation before the first live combat frame.
        for (let i = 0; i < 2; i++) this.app.renderer.render(this.app.stage);
        this.app.stage.alpha = priorAlpha;
        this.metrics.migrationStages.push({ stage: '0-gpu-prewarm', passed: true, detail: 'Two hidden warm-up renders completed' });
      } catch (error) {
        console.info('[Bull Invaders Engine V2] GPU prewarm skipped', error?.message || error);
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
      // Glow-orb atlas textures preserve readable projectile silhouettes when expensive
      // full-layer blur passes are removed on phones.
      this.layers.glow.filters = next === 'full' ? this.glowFilters : null;
      this.layers.fx.filters = next === 'full' ? this.fxFilters : null;
      this.layers.playerGlow.filters = next === 'fast' ? null : this.playerFilters;
      if (this.metrics) this.metrics.quality = next;
    }

    sampleQuality(cost, frameDelta) {
      this.qualitySamples.push(cost);
      if (Number.isFinite(frameDelta) && frameDelta > 0 && frameDelta < 500) {
        this.frameSamples.push(frameDelta);
        if (frameDelta >= 50) this.metrics.hitchFrames += 1;
        if (frameDelta >= 100) this.metrics.severeHitches += 1;
      }
      if (this.qualitySamples.length < 120 || this.frameSamples.length < 120) return;
      const average = this.qualitySamples.reduce((sum, value) => sum + value, 0) / this.qualitySamples.length;
      const sorted = [...this.frameSamples].sort((a, b) => a - b);
      const percentile = p => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))] || 0;
      const p95 = percentile(.95), p99 = percentile(.99);
      this.metrics.p95FrameMs = p95; this.metrics.p99FrameMs = p99;
      this.qualitySamples.length = 0; this.frameSamples.length = 0;
      const rank = { fast: 0, balanced: 1, full: 2 };
      const now = performance.now();
      let target = this.quality;
      if (p99 > 75 || this.metrics.severeHitches >= 3 || average > 13.5) {
        target = 'fast'; this.stableWindows = 0;
      } else if (p95 > 24 || p99 > 45 || average > 9.5) {
        target = this.quality === 'full' ? 'balanced' : this.quality; this.stableWindows = 0;
      } else if (p95 < 19 && p99 < 29 && average < 6.2) {
        this.stableWindows += 1;
        if (this.stableWindows >= 4 && now - this.lastQualityChangeAt > 12000) {
          target = this.quality === 'fast' ? 'balanced' : this.quality === 'balanced' && !this.deviceProfile.constrained ? 'full' : this.quality;
          this.stableWindows = 0;
        }
      } else {
        this.stableWindows = Math.max(0, this.stableWindows - 1);
      }
      if (target !== this.quality) {
        if ((rank[target] ?? 2) < (rank[this.quality] ?? 2)) this.metrics.qualityDrops += 1;
        this.applyQuality(target);
        this.lastQualityChangeAt = now;
        console.info('[Bull Invaders Engine V2] adaptive quality', { averageRenderMs: average, p95FrameMs: p95, p99FrameMs: p99, quality: this.quality });
      }
    }

    visualSlice(source, balancedCap, fastCap) {
      if (!Array.isArray(source) || this.quality === 'full') return source || [];
      const cap = this.quality === 'fast' ? fastCap : balancedCap;
      return source.length > cap ? source.slice(source.length - cap) : source;
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
      this.pools.enemies = new SpritePool(P, this.layers.enemies, MAX.enemies, this.bearTexture || T);
      this.pools.bosses = new SpritePool(P, this.layers.boss, MAX.bosses, T);
      this.pools.player = new SpritePool(P, this.layers.player, MAX.playerCraft, T);
      this.pools.trails = new SpritePool(P, this.layers.playerGlow, MAX.trails, this.core['glow-orb'] || T);
      this.pools.shots = new SpritePool(P, this.layers.shots, MAX.shots, T);
      this.pools.shotGlow = new SpritePool(P, this.layers.glow, MAX.shotGlow, this.core['glow-orb'] || T);
      this.pools.particles = new SpritePool(P, this.layers.fx, MAX.particles, this.core['glow-orb'] || T);
      this.pools.explosions = new SpritePool(P, this.layers.fx, MAX.explosions, this.core['glow-orb'] || T);
      this.pools.explosionRings = new SpritePool(P, this.layers.fx, MAX.explosionRings, this.core['shock-ring'] || T);
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
      const frameDelta = this.lastModelNow ? Math.max(0, Number(model.now || 0) - this.lastModelNow) : 16.7;
      this.lastModelNow = Number(model.now || 0);
      if (model.epoch !== this.campaignId) this.setCampaign(model.epoch).catch(error => this.fallback(error.message));
      if (!model.mediaOn && model.level !== this.backgroundLevel) this.setLevelBackground(model.level);
      this.background.alpha = model.mediaOn ? .42 : 1;
      this.syncPool('stars', this.visualSlice(model.stars, 52, 40), (s, star) => {
        s.texture = this.core['glow-orb']; s.x = star.x; s.y = star.y; s.width = s.height = 4 + star.s * 4; s.alpha = star.a; s.tint = star.s > 1.4 ? 0xd8fff0 : 0x7affb5;
      });
      this.verifyMigrationStage('1-background-starfield', `${model.stars.length} pooled stars; static GPU background`);
      this.syncPool('enemies', model.enemies, (s, enemy) => {
        s.texture = this.bearTexture; s.x = enemy.x + enemy.w / 2; s.y = enemy.y + enemy.h / 2 + (model.reducedMotion ? 0 : Math.sin(model.elapsed * 5 + enemy.x * .03) * 1.6);
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
      this.sampleQuality(cost, frameDelta);
      return true;
    }

    resolveBossTexture(boss) {
      const key = String(boss?.def?.key || '');
      const texture = this.bossTextures[key];
      if (!texture) throw new Error(`Missing boss texture for key: ${key || '(empty)'}`);
      return texture;
    }

    drawBoss(model) {
      const source = model.boss ? [model.boss] : [];
      this.syncPool('bosses', source, (s, boss) => {
        s.texture = this.resolveBossTexture(boss);
        s.x = boss.x + boss.w / 2; s.y = boss.y + boss.h / 2 + (model.reducedMotion ? 0 : Math.sin(model.elapsed * 3.2 + (boss.phase || 0)) * 2);
        s.width = boss.w; s.height = boss.h; s.rotation = model.reducedMotion ? 0 : Math.sin(model.elapsed * 2.1 + (boss.phase || 0)) * .025;
        s.tint = 0xffffff; s.alpha = .98;
      });
      const boss = model.boss;
      this.bossBarBack.visible = this.bossBar.visible = Boolean(boss);
      if (boss) {
        const w = Math.max(0, model.width - 60), ratio = Math.max(0, boss.hp / boss.maxHp);
        Object.assign(this.bossBarBack, { x: 30, y: 49, width: w, height: 10 });
        Object.assign(this.bossBar, { x: 31, y: 50, width: Math.max(0, (w - 2) * ratio), height: 8, tint: hex(boss.def?.colors?.[1] || '#b0d3c4') });
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
        s.rotation = shot.angle == null ? 0 : shot.angle + Math.PI / 2; s.tint = solana ? 0xffffff : hex(shot.ability?.color || shot.color || (shot.player ? '#b0d3c4' : '#ff2444')); s.alpha = .96;
      });
      this.syncPool('shotGlow', this.visualSlice(shots, 104, 72), (s, shot) => {
        const isRocket = Boolean(shot.ability); s.texture = this.core['glow-orb']; s.x = shot.x + (isRocket ? 0 : shot.w / 2); s.y = shot.y + (isRocket ? 0 : shot.h / 2);
        s.width = Math.max(18, shot.w * (isRocket ? 5.5 : 4.5)); s.height = Math.max(28, shot.h * (isRocket ? 2.4 : 1.8)); s.tint = hex(shot.ability?.secondary || shot.color || (shot.player ? '#a8c9d5' : '#ff2444')); s.alpha = isRocket ? .56 : .42;
      });
    }

    drawPickups(model) {
      this.syncPool('pickups', model.pickups, (s, pickup) => {
        s.texture = this.core['glow-orb']; s.x = pickup.x + pickup.w / 2; s.y = pickup.y + pickup.h / 2;
        s.width = pickup.w * 1.15; s.height = pickup.h * 1.15; s.tint = hex(pickup.type === 'life' ? '#b0d3c4' : model.powerColors[pickup.id] || '#b0d3c4'); s.rotation = Math.sin(pickup.phase || 0) * .08;
      });
    }

    drawEffects(model) {
      const particles = this.visualSlice(model.particles, 96, 64);
      this.syncPool('particles', particles, (s, particle) => {
        s.texture = this.core['glow-orb']; s.x = particle.x; s.y = particle.y; s.width = s.height = Math.max(4, particle.s * 3.2);
        s.tint = hex(particle.color); s.alpha = Math.max(0, particle.life / .75) * .9;
      });
      const all = this.visualSlice(model.explosions.concat(model.rocketBursts), 12, 8);
      this.syncPool('explosions', all, (s, explosion) => {
        const lifeRatio = Math.max(0, explosion.life / (explosion.maxLife || .82));
        const palette = Array.isArray(explosion.palette) ? explosion.palette : null;
        s.texture = this.core['glow-orb']; s.x = explosion.x; s.y = explosion.y; s.width = s.height = Math.max(18, explosion.radius * 2.9);
        s.tint = hex(palette?.[0] || explosion.color || '#b0d3c4'); s.alpha = lifeRatio * .9; s.rotation = model.elapsed * .7;
      });
      const rings = this.quality === 'fast' ? [] : all;
      this.syncPool('explosionRings', rings, (s, explosion, index) => {
        const lifeRatio = Math.max(0, explosion.life / (explosion.maxLife || .82));
        const palette = Array.isArray(explosion.palette) ? explosion.palette : null;
        s.texture = this.core['shock-ring']; s.x = explosion.x; s.y = explosion.y; s.width = s.height = Math.max(24, explosion.radius * (this.quality === 'full' ? 3.35 : 3.0));
        s.tint = hex(palette?.[1] || explosion.secondary || explosion.color || '#c4afcf'); s.alpha = lifeRatio * (this.quality === 'full' ? .72 : .48); s.rotation = model.elapsed * .45 + index * .13;
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
        s.texture = this.shipTextures[model.shipId] || this.playerTexture;
        s.x = p.x + p.w / 2 + craft.x; s.y = p.y + p.h / 2 + craft.y + (model.reducedMotion ? 0 : Math.sin(model.now / 150) * 1.6);
        s.width = p.w * craft.scale * visualScale; s.height = p.h * craft.scale * visualScale; s.rotation = Math.max(-.16, Math.min(.16, (p.targetX - p.x) * .0045)); s.tint = hex(model.shipLivery?.hull || '#ffffff');
      });
      const trailStrength = .45 + model.movementEnergy * .75;
      const trails = formation.flatMap(craft => [-.18, .18].map(offset => ({ craft, offset })));
      this.syncPool('trails', flicker ? [] : trails, (s, item) => {
        const scale = item.craft.scale; s.texture = this.core['glow-orb'];
        s.x = p.x + p.w / 2 + item.craft.x + p.w * item.offset * scale; s.y = p.y + p.h / 2 + item.craft.y + p.h * .42 * scale;
        const shipTrail = ['#b0d3c4','#8b78b3','#91a77f','#82a9c9','#80b6a0','#a596c1','#d9b36f','#d98563','#c7cbd0','#b998d0','#e49b77'][Math.max(0, Math.min(10, Number(model.shipId) || 0))];
        s.width = p.w * (.14 + Math.min(10, Number(model.shipId) || 0) * .002) * scale;
        s.height = p.h * (.32 + model.movementEnergy * .34 + Math.min(10, Number(model.shipId) || 0) * .008) * scale;
        s.tint = hex(model.shipLivery?.accent || shipTrail || '#b0d3c4'); s.alpha = trailStrength;
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
      return { ...this.metrics, averageRenderMs: this.metrics.frames ? this.metrics.renderMsTotal / this.metrics.frames : 0, campaign: this.campaignId, bossAssetCount: Object.keys(this.bossTextures).length, shipTextureCount: Object.keys(this.shipTextures).length, deviceProfile: this.deviceProfile, bossResolver: 'resolveBossTexture', pools: { ...MAX }, reason: this.reason };
    }
    resetMetrics() {
      this.metrics.frames = 0; this.metrics.renderMsTotal = 0; this.metrics.renderMsMax = 0; this.metrics.fallbacks = 0; this.metrics.hitchFrames = 0; this.metrics.severeHitches = 0; this.metrics.p95FrameMs = 0; this.metrics.p99FrameMs = 0; this.qualitySamples.length = 0; this.frameSamples.length = 0; this.lastModelNow = 0;
    }
  }

  global.BBRInvadersRendererV2 = { create: options => new RendererV2(options), limits: MAX, bossResolver: 'resolveBossTexture' };
})(window);
