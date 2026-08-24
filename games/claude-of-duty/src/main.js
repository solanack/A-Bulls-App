/**
 * Boot entry for Solana Bang Bang.
 * Never runs at import time — the React shell calls `boot(canvas)` after a
 * user gesture so AudioContext, pointer events, and fullscreen stay legal.
 *
 * Performance: mobile starts on the low tier immediately (no 3s "probe on
 * ultra" tax). Shader pre-warm still runs behind the loading overlay so the
 * first shot does not compile 30 programs on one frame.
 */
import { Engine } from './core/engine.js';
import { createConfig } from './core/config.js';

import { RenderSystem } from './render/index.js';
import { MaterialSystem } from './materials/index.js';
import { SkySystem } from './sky/index.js';
import { WorldSystem } from './world/index.js';
import { PhysicsSystem } from './physics/index.js';
import { PlayerSystem } from './player/index.js';
import { WeaponSystem } from './weapons/index.js';
import { FxSystem } from './fx/index.js';
import { AiSystem } from './ai/index.js';
import { UiSystem } from './ui/index.js';
import { AudioSystem } from './audio/index.js';
import { MissionSystem } from './mission/index.js';

import { installShotApi } from './dev/shots.js';
import { prewarm } from './core/prewarm.js';

function detectMobile() {
  if (typeof window === 'undefined') return true;
  const ua = navigator.userAgent || '';
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const touch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return !!(coarse || touch || shortSide < 520 || /Android|iPhone|iPad|Mobile/i.test(ua));
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onStatus?: (s: string) => void }} [opts]
 */
export async function boot(canvas, opts = {}) {
  const params = new URLSearchParams(location.search);
  const capture = params.get('capture') === '1';
  const lockstep = capture && params.get('lockstep') === '1';
  const mobile = detectMobile();
  const onStatus = opts.onStatus ?? (() => {});

  const config = createConfig({
    quality: params.get('q') ?? (mobile ? 'low' : 'high'),
    deterministic: capture,
    mobile,
  });

  onStatus('Mounting systems');
  const engine = new Engine({ canvas, config });
  engine.ctx.onStatus = onStatus;

  engine
    .add(RenderSystem)
    .add(MaterialSystem)
    .add(SkySystem)
    .add(WorldSystem)
    .add(PhysicsSystem)
    .add(PlayerSystem)
    .add(WeaponSystem)
    .add(FxSystem)
    .add(AiSystem)
    .add(UiSystem)
    .add(AudioSystem)
    .add(MissionSystem);

  try {
    onStatus('Building world');
    await engine.init();
  } catch (err) {
    console.error('[boot] init failed', err);
    throw err;
  }

  const shotApi = installShotApi(engine, { capture, lockstep });

  // Pre-warm compiles 80+ programs and can stall software GL for minutes.
  // Default OFF so DEPLOY is instant; pass ?prewarm=1 on a real GPU.
  const wantPrewarm = params.get('prewarm') === '1';
  let warmup = { ok: false, reason: 'skipped (pass ?prewarm=1 to force)' };
  if (wantPrewarm) {
    onStatus('Compiling shaders');
    warmup = await prewarm(engine);
  }
  console.info('[boot] prewarm', warmup);
  window.__PREWARM__ = warmup;

  engine.start();
  window.__ENGINE__ = engine;
  window.__READY__ = true;

  if (lockstep) {
    await shotApi.pump(3);
  }

  onStatus('Live');
  return engine;
}

export function destroy(engine) {
  try { engine?.dispose?.(); } catch { /* */ }
  if (window.__ENGINE__ === engine) window.__ENGINE__ = null;
}

if (typeof document !== 'undefined' && !globalThis.__BULLS_REACT_SHELL__) {
  const canvas = document.getElementById('game');
  if (canvas) {
    boot(canvas).catch((err) => {
      console.error('[boot] standalone failed', err);
      const failure = document.createElement('pre');
      failure.style.cssText = 'position:fixed;inset:0;padding:2rem;color:#f66;background:#000;font:12px/1.5 ui-monospace,monospace;overflow:auto;z-index:9999;white-space:pre-wrap';
      failure.textContent = `BOOT FAILURE\n\n${String(err?.stack || err?.message || 'Unknown error').slice(0, 4000)}`;
      document.body.append(failure);
    });
  }
}
