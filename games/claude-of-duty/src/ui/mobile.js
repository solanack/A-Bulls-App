/**
 * Mobile-first HUD: 360° virtual joystick + independent action buttons.
 *
 * Fixes applied:
 * - Full-circle vector via Math.atan2 (was collapsing to forward-only when the
 *   finger left the 132px disc because pointer capture failed on iOS).
 * - Document-level pointer tracking by pointerId — left thumb can steer while
 *   the right thumb holds FIRE/JUMP without cancelling either.
 * - Buttons bind pointerdown/up/cancel/lostpointercapture, not click/keydown.
 * - preventDefault + touch-action:none so the browser cannot steal horizontal
 *   pans (the classic "joystick only walks forward" symptom).
 * - Dynamic left-half grab: first contact in the left 46% of the screen becomes
 *   the stick, so you don't have to hit the 132px circle dead-on.
 */

const css = `
.cod-mobile{position:fixed;inset:0;z-index:90;pointer-events:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.cod-look{position:absolute;inset:0;pointer-events:auto;touch-action:none}
.cod-stick{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:148px;height:148px;border-radius:50%;border:1px solid rgba(196,175,207,.34);background:rgba(23,24,32,.58);box-shadow:inset 0 0 28px rgba(7,7,11,.56);pointer-events:none}
.cod-stick-hit{position:absolute;left:max(0px,calc(env(safe-area-inset-left) - 8px));bottom:max(0px,calc(env(safe-area-inset-bottom) - 8px));width:46vw;max-width:280px;height:52vh;pointer-events:none}
.cod-knob{position:absolute;left:47px;top:47px;width:54px;height:54px;border-radius:50%;background:rgba(168,201,213,.18);border:2px solid rgba(243,241,244,.62);box-shadow:0 0 18px rgba(168,201,213,.2);transform:translate(0px,0px);will-change:transform}
.cod-stick-cross{position:absolute;inset:18px;border-radius:50%;pointer-events:none;background:
  linear-gradient(rgba(196,175,207,.2),rgba(196,175,207,.2)) center/1px 70% no-repeat,
  linear-gradient(rgba(196,175,207,.2),rgba(196,175,207,.2)) center/70% 1px no-repeat}
.cod-actions{position:absolute;right:max(10px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));display:grid;grid-template-columns:56px 56px 82px;grid-template-rows:52px 52px 82px;gap:10px;align-items:end;justify-items:center;pointer-events:none;z-index:2}
.cod-btn{pointer-events:auto;border:1px solid rgba(196,175,207,.42);background:rgba(41,42,52,.88);color:#f3f1f4;border-radius:50%;font:700 9px/1 Manrope,"Segoe UI",system-ui,sans-serif;letter-spacing:.1em;box-shadow:inset 0 1px rgba(255,255,255,.06),0 8px 20px rgba(7,7,11,.25);touch-action:none;-webkit-user-select:none;user-select:none;width:52px;height:52px;transition:transform 110ms ease,background-color 110ms ease,border-color 110ms ease,color 110ms ease}
.cod-btn:active,.cod-btn.on{background:#c4afcf;color:#1d1820;transform:translateY(1px) scale(.985)}
.cod-reload{grid-column:1;grid-row:1}
.cod-swap{grid-column:2;grid-row:1}
.cod-sprint{grid-column:1;grid-row:2}
.cod-ads{grid-column:2;grid-row:2}
.cod-turn{grid-column:3;grid-row:1;width:58px;height:52px;border-radius:16px;font-size:10px;line-height:1.05}
.cod-jump{grid-column:1;grid-row:3;width:56px;height:56px;align-self:end}
.cod-crouch{grid-column:2;grid-row:3;width:56px;height:56px;align-self:end}
.cod-fire{grid-column:3;grid-row:2 / span 2;position:relative;top:-48px;width:82px;height:82px;align-self:end;border-color:rgba(214,160,168,.62);background:rgba(112,63,73,.8);font-size:12px;letter-spacing:.16em}
.cod-grenade{position:absolute;left:max(54px,calc(env(safe-area-inset-left) + 54px));bottom:max(184px,calc(env(safe-area-inset-bottom) + 184px));width:64px;height:58px;border-radius:18px;border-color:rgba(176,211,196,.58);background:rgba(42,66,59,.86);color:#dcebe5;font-size:9px;line-height:1.05;z-index:3}
.cod-grenade::after{content:'×' attr(data-count);display:block;margin-top:4px;color:#f3f1f4;font-size:12px;letter-spacing:.08em}
.cod-grenade.empty{opacity:.45;filter:saturate(.25)}
.cod-pause{position:absolute;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));width:44px;height:44px;border-radius:14px;font-size:16px;z-index:3}
.cod-home{position:absolute;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));width:44px;height:44px;border-radius:14px;font-size:18px;z-index:3;display:grid;place-items:center;text-decoration:none;color:#f3f1f4;pointer-events:auto;border:1px solid rgba(196,175,207,.42);background:rgba(41,42,52,.88);box-shadow:inset 0 1px rgba(255,255,255,.06),0 8px 20px rgba(7,7,11,.25)}
.cod-start .cod-card{width:min(390px,100%);padding:24px;border:1px solid rgba(196,175,207,.34);border-radius:22px;background:linear-gradient(145deg,rgba(50,52,63,.94),rgba(35,36,45,.96));box-shadow:0 24px 70px rgba(7,7,11,.42),inset 0 1px rgba(255,255,255,.05)}
.cod-start .cod-kicker{display:block;color:#a8c9d5;font:700 10px/1.2 Manrope,system-ui,sans-serif;letter-spacing:.18em}
.cod-start h1{margin:14px 0;color:#f3f1f4;font:600 clamp(38px,12vw,62px)/.9 Sora,Manrope,system-ui,sans-serif;letter-spacing:-.055em;text-shadow:0 7px 30px rgba(7,7,11,.42)}
.cod-start h1 span{display:block;color:#d6a0a8}
.cod-start p{max-width:310px;margin:18px auto;color:#aaa7b2;font:500 13px/1.55 Manrope,system-ui,sans-serif}
.cod-deploy{min-height:48px;padding:0 32px;border:1px solid rgba(235,224,240,.38);border-radius:14px;color:#1d1820;background:#c4afcf;font:700 12px/1 Manrope,system-ui,sans-serif;letter-spacing:.12em;box-shadow:inset 0 1px rgba(255,255,255,.22),0 9px 22px rgba(7,7,11,.24);transition:transform 110ms ease,background-color 110ms ease}
.cod-deploy:active{transform:translateY(1px) scale(.985)}
.cod-mobile.paused .cod-stick,.cod-mobile.paused .cod-actions,.cod-mobile.paused .cod-grenade,.cod-mobile.paused .cod-look{display:none}
@media (orientation:portrait){
  .cod-stick{width:128px;height:128px}
  .cod-knob{left:40px;top:40px;width:48px;height:48px}
  .cod-actions{grid-template-columns:50px 50px 74px;grid-template-rows:48px 48px 74px;gap:8px}
  .cod-btn{width:48px;height:48px}
  .cod-fire{width:74px;height:74px}
  .cod-jump,.cod-crouch{width:50px;height:50px}
  .cod-grenade{left:max(44px,calc(env(safe-area-inset-left) + 44px));bottom:max(164px,calc(env(safe-area-inset-bottom) + 164px))}
}
@media (prefers-reduced-motion:reduce){.cod-btn,.cod-deploy{transition-duration:.01ms}}
`;

const PASSIVE = { passive: false };
const DZ = 0.14;

function pointerClock(event) {
  const now = performance.now();
  const stamp = Number(event?.timeStamp);
  return Number.isFinite(stamp) && Math.abs(stamp - now) < 60_000 ? stamp : now;
}

function radialFromCenter(clientX, clientY, rect, deadzone = DZ) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const maxR = Math.min(rect.width, rect.height) * 0.42;
  const angle = Math.atan2(dy, dx);
  const raw = Math.hypot(dx, dy);
  const mag01 = Math.min(1, raw / Math.max(8, maxR));
  if (mag01 < deadzone) {
    return { x: 0, y: 0, knobX: 0, knobY: 0, mag: 0, angle };
  }
  const scaled = (mag01 - deadzone) / (1 - deadzone);
  const kx = Math.cos(angle) * Math.min(raw, maxR);
  const ky = Math.sin(angle) * Math.min(raw, maxR);
  return {
    x: Math.cos(angle) * scaled,
    y: -Math.sin(angle) * scaled,
    knobX: kx,
    knobY: ky,
    mag: scaled,
    angle,
  };
}

function bindButton(parent, cls, label, code, input, pointers) {
  const b = document.createElement('button');
  b.className = `cod-btn ${cls}`;
  b.textContent = label;
  b.type = 'button';
  b.setAttribute('aria-label', label);
  parent.appendChild(b);

  const down = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pointers.set(e.pointerId, { kind: 'btn', code, el: b });
    input.noteTouchPointer(e.pointerId, true);
    input.setTouchButton(code, true);
    b.classList.add('on');
    try { b.setPointerCapture(e.pointerId); } catch { /* iOS */ }
  };
  const up = (e) => {
    const rec = pointers.get(e.pointerId);
    if (!rec || rec.kind !== 'btn' || rec.code !== code) return;
    e.preventDefault();
    e.stopPropagation();
    pointers.delete(e.pointerId);
    input.noteTouchPointer(e.pointerId, false);
    input.setTouchButton(code, false);
    b.classList.remove('on');
  };
  b.addEventListener('pointerdown', down, PASSIVE);
  b.addEventListener('pointerup', up, PASSIVE);
  b.addEventListener('pointercancel', up, PASSIVE);
  b.addEventListener('lostpointercapture', up);
  return b;
}

function bindToggleButton(parent, cls, label, code, input, pointers) {
  const b = document.createElement('button');
  b.className = `cod-btn ${cls}`;
  b.textContent = label;
  b.type = 'button';
  b.setAttribute('aria-label', `${label} toggle`);
  b.setAttribute('aria-pressed', 'false');
  parent.appendChild(b);
  let on = false;

  const set = (next) => {
    on = !!next;
    input.setTouchButton(code, on);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  };
  const down = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pointers.set(e.pointerId, { kind: 'toggle', code, el: b });
    input.noteTouchPointer(e.pointerId, true);
    set(!on);
    try { b.setPointerCapture(e.pointerId); } catch { /* iOS */ }
  };
  const up = (e) => {
    const rec = pointers.get(e.pointerId);
    if (!rec || rec.kind !== 'toggle' || rec.code !== code) return;
    e.preventDefault();
    e.stopPropagation();
    pointers.delete(e.pointerId);
    input.noteTouchPointer(e.pointerId, false);
  };
  b.addEventListener('pointerdown', down, PASSIVE);
  b.addEventListener('pointerup', up, PASSIVE);
  b.addEventListener('pointercancel', up, PASSIVE);
  b.addEventListener('lostpointercapture', up);
  b.setToggle = set;
  return b;
}

function bindTapButton(parent, cls, label, pointers, onTap) {
  const b = document.createElement('button');
  b.className = `cod-btn ${cls}`;
  b.textContent = label;
  b.type = 'button';
  b.setAttribute('aria-label', label);
  parent.appendChild(b);
  const release = (e) => {
    const rec = pointers.get(e.pointerId);
    if (!rec || rec.kind !== 'tap' || rec.el !== b) return;
    e.preventDefault();
    e.stopPropagation();
    pointers.delete(e.pointerId);
    b.classList.remove('on');
  };
  b.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pointers.set(e.pointerId, { kind: 'tap', el: b });
    b.classList.add('on');
    onTap?.();
    try { b.setPointerCapture(e.pointerId); } catch { /* iOS */ }
  }, PASSIVE);
  b.addEventListener('pointerup', release, PASSIVE);
  b.addEventListener('pointercancel', release, PASSIVE);
  b.addEventListener('lostpointercapture', release);
  return b;
}

export class MobileControls {
  constructor(parent, ctx, menu, opts = {}) {
    this.ctx = ctx;
    this.menu = menu;
    this._pointers = new Map();
    this._stickOrigin = null;

    this.style = document.createElement('style');
    this.style.textContent = css;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.className = 'cod-mobile';
    parent.appendChild(this.root);

    this.look = document.createElement('div');
    this.look.className = 'cod-look';
    this.root.appendChild(this.look);

    this.stickHit = document.createElement('div');
    this.stickHit.className = 'cod-stick-hit';
    this.root.appendChild(this.stickHit);

    this.stick = document.createElement('div');
    this.stick.className = 'cod-stick';
    this.root.appendChild(this.stick);
    const cross = document.createElement('div');
    cross.className = 'cod-stick-cross';
    this.stick.appendChild(cross);
    this.knob = document.createElement('div');
    this.knob.className = 'cod-knob';
    this.stick.appendChild(this.knob);

    const actions = document.createElement('div');
    actions.className = 'cod-actions';
    this.root.appendChild(actions);
    bindButton(actions, 'cod-reload', 'RELOAD', 'KeyR', ctx.input, this._pointers);
    bindButton(actions, 'cod-swap', 'SWAP', 'Tab', ctx.input, this._pointers);
    bindButton(actions, 'cod-sprint', 'SPRINT', 'ShiftLeft', ctx.input, this._pointers);
    this.adsButton = bindToggleButton(actions, 'cod-ads', 'AIM', 'Mouse2', ctx.input, this._pointers);
    bindTapButton(actions, 'cod-turn', '180°', this._pointers, () => {
      ctx.events.emit('player:turn-180', { source: 'mobile' });
    });
    bindButton(actions, 'cod-jump', 'JUMP', 'Space', ctx.input, this._pointers);
    bindButton(actions, 'cod-crouch', 'CROUCH', 'ControlLeft', ctx.input, this._pointers);
    bindButton(actions, 'cod-fire', 'FIRE', 'Mouse0', ctx.input, this._pointers);
    this.grenadeButton = bindButton(this.root, 'cod-grenade', 'GRENADE', 'KeyG', ctx.input, this._pointers);
    this.grenadeButton.dataset.count = '1';
    this._offGrenade = ctx.events.on('grenade:inventory', (event) => {
      const count = Math.max(0, Number(event?.count) || 0);
      this.grenadeButton.dataset.count = String(count);
      this.grenadeButton.classList.toggle('empty', count <= 0);
      this.grenadeButton.disabled = count <= 0;
    });
    const pause = bindButton(this.root, 'cod-pause', 'II', 'Escape', ctx.input, this._pointers);
    pause.setAttribute('aria-label', 'Pause');
    const home = document.createElement('a');
    home.className = 'cod-home';
    const existing = document.querySelector('a.bulls-home');
    home.href = existing?.getAttribute('href') || '/arcade.html';
    home.setAttribute('aria-label', 'A Bulls App');
    home.title = 'A Bulls App';
    home.textContent = '⌂';
    this.root.appendChild(home);

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._resetToggles = this._resetToggles.bind(this);
    this.look.addEventListener('pointerdown', this._onPointerDown, PASSIVE);
    document.addEventListener('pointermove', this._onPointerMove, PASSIVE);
    document.addEventListener('pointerup', this._onPointerUp, PASSIVE);
    document.addEventListener('pointercancel', this._onPointerUp, PASSIVE);
    addEventListener('blur', this._resetToggles);
    document.addEventListener('visibilitychange', this._resetToggles);

    if (!opts.skipStart) this._startScreen();
  }

  _startScreen() {
    this.start = document.createElement('div');
    this.start.className = 'cod-start';
    this.start.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(196,175,207,.13),rgba(23,24,32,.97) 68%);display:flex;align-items:center;justify-content:center;pointer-events:auto;padding:24px;text-align:center;z-index:5';
    this.start.innerHTML = '<div class="cod-card"><small class="cod-kicker">A BULLS APP · FIELD OPS</small><h1>SOLANA <span>BANG BANG</span></h1><p>Move with the left thumb. Aim on the right. Hold FIRE to engage. Pause to change turn sensitivity or auto aim.</p><button type="button" class="cod-deploy">DEPLOY</button></div>';
    this.root.appendChild(this.start);
    this.start.querySelector('button').addEventListener('click', async () => {
      this.start.remove();
      this.start = null;
      try { await document.documentElement.requestFullscreen?.(); } catch { /* */ }
      try { await screen.orientation?.lock?.('landscape'); } catch { /* */ }
    }, { once: true });
  }

  _leftZone(clientX) {
    const w = innerWidth || 1;
    return clientX < w * 0.46;
  }

  _onPointerDown(e) {
    if (e.target.closest?.('.cod-btn')) return;
    if (this._pointers.has(e.pointerId)) return;
    e.preventDefault();
    this.ctx.input.noteTouchPointer(e.pointerId, true);

    if (this._leftZone(e.clientX) && ![...this._pointers.values()].some((p) => p.kind === 'stick')) {
      this._pointers.set(e.pointerId, { kind: 'stick', x: e.clientX, y: e.clientY });
      this._stickOrigin = { x: e.clientX, y: e.clientY };
      this._applyStick(e.clientX, e.clientY);
      try { this.look.setPointerCapture(e.pointerId); } catch { /* iOS */ }
      return;
    }
    this._pointers.set(e.pointerId, {
      kind: 'look',
      x: e.clientX,
      y: e.clientY,
      filteredX: e.clientX,
      filteredY: e.clientY,
      lastAt: pointerClock(e),
    });
    try { this.look.setPointerCapture(e.pointerId); } catch { /* iOS */ }
  }

  _onPointerMove(e) {
    const rec = this._pointers.get(e.pointerId);
    if (!rec) return;
    e.preventDefault();
    if (rec.kind === 'stick') {
      this._applyStick(e.clientX, e.clientY);
      return;
    }
    if (rec.kind === 'look') {
      const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
      const events = samples.length ? samples : [e];
      for (const sample of events) {
        this._applyLookSample(rec, sample.clientX, sample.clientY, pointerClock(sample));
      }
    }
  }

  _applyLookSample(rec, x, y, now = performance.now()) {
    const dt = Math.max(1, Math.min(32, now - rec.lastAt));
    rec.lastAt = now;
    // Filter position at a high cutoff, then emit the filtered position delta.
    // Coalesced samples remove quantisation while the high cutoff keeps response
    // inside one rendered frame; the residual is flushed when the finger lifts.
    const alpha = 1 - Math.exp(-dt * 0.12);
    const nextX = rec.filteredX + (x - rec.filteredX) * alpha;
    const nextY = rec.filteredY + (y - rec.filteredY) * alpha;
    const dx = Math.max(-36, Math.min(36, nextX - rec.filteredX));
    const dy = Math.max(-36, Math.min(36, nextY - rec.filteredY));
    rec.filteredX += dx;
    rec.filteredY += dy;
    rec.x = x;
    rec.y = y;
    if (Math.abs(dx) + Math.abs(dy) > 0.05) this.ctx.input.addTouchLook(dx, dy, now);
  }

  _onPointerUp(e) {
    const rec = this._pointers.get(e.pointerId);
    if (!rec) return;
    if (rec.kind === 'btn' || rec.kind === 'toggle' || rec.kind === 'tap') return;
    this._pointers.delete(e.pointerId);
    this.ctx.input.noteTouchPointer(e.pointerId, false);
    if (rec.kind === 'stick') {
      this.knob.style.transform = 'translate(0px,0px)';
      this.ctx.input.setTouchMove(0, 0);
      this._stickOrigin = null;
    } else if (rec.kind === 'look') {
      const dx = rec.x - rec.filteredX;
      const dy = rec.y - rec.filteredY;
      if (Math.abs(dx) + Math.abs(dy) > 0.05) {
        this.ctx.input.addTouchLook(dx, dy, pointerClock(e));
      }
    }
  }

  _applyStick(clientX, clientY) {
    const origin = this._stickOrigin;
    const rect = origin
      ? {
          left: origin.x - 74,
          top: origin.y - 74,
          width: 148,
          height: 148,
        }
      : this.stick.getBoundingClientRect();
    const v = radialFromCenter(clientX, clientY, rect);
    this.knob.style.transform = `translate(${v.knobX}px,${v.knobY}px)`;
    this.ctx.input.setTouchMove(v.x, v.y);
  }

  update(paused) {
    this.root.classList.toggle('paused', paused);
    if (paused) this.adsButton?.setToggle?.(false);
  }

  _resetToggles() {
    if (document.hidden || !document.hasFocus()) this.adsButton?.setToggle?.(false);
  }

  dispose() {
    this.ctx.input.setTouchMove(0, 0);
    this.look.removeEventListener('pointerdown', this._onPointerDown);
    document.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('pointerup', this._onPointerUp);
    document.removeEventListener('pointercancel', this._onPointerUp);
    removeEventListener('blur', this._resetToggles);
    document.removeEventListener('visibilitychange', this._resetToggles);
    this.adsButton?.setToggle?.(false);
    this._offGrenade?.();
    this.root.remove();
    this.style.remove();
  }
}
