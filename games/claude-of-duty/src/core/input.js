/**
 * Input aggregation: keyboard, pointer-lock mouse, gamepad, and true multi-touch.
 *
 * Fixes applied:
 * - Ignore emulated mouse events from touch so FIRE/JUMP aren't cancelled by
 *   a failed requestPointerLock → pointerlockchange → blur-release.
 * - Touch analog is already in move-space (+X right, +Y forward) using atan2.
 * - Pointers tracked by pointerId so left-stick + right-fire work together.
 * - Keys clear on blur/visibilitychange (no stuck sprint after tab-out).
 *
 * Edge queries (`pressed`, `released`) are valid only during the frame in which
 * the transition happened — read them in update(), not fixedUpdate().
 */

export const ACTIONS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  crouch: ['ControlLeft', 'KeyC'],
  prone: ['KeyZ'],
  sprint: ['ShiftLeft'],
  reload: ['KeyR'],
  use: ['KeyF'],
  melee: ['KeyV'],
  leanLeft: ['KeyQ'],
  leanRight: ['KeyE'],
  swapWeapon: ['Digit1', 'Digit2', 'Tab'],
  grenade: ['KeyG'],
  flashlight: ['KeyT'],
  pause: ['Escape'],
};

const GAME_CODES = new Set(Object.values(ACTIONS).flat());

export class Input {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;

    this.down = new Set();
    this._pressed = new Set();
    this._released = new Set();
    this._pendingDown = new Set();
    this._pendingUp = new Set();

    this.look = { x: 0, y: 0 };
    this._rawLook = { x: 0, y: 0 };
    this.wheel = 0;
    this._pendingWheel = 0;

    this.pointerLocked = false;
    this.enabled = true;
    this.frozen = false;

    this.gamepadIndex = null;
    this.stick = { moveX: 0, moveY: 0, lookX: 0, lookY: 0 };
    /** Move-space analog: +X right, +Y forward, unit-disc clamped. */
    this.touch = { moveX: 0, moveY: 0 };
    this._touchLook = { x: 0, y: 0 };
    this._touchPointers = new Set();
    this._touchHeldCodes = new Set();
    this._touchLookEventAt = 0;
    this._touchLookPendingAt = 0;
    this._touchLookAppliedPending = false;
    this._touchLatencySamples = [];
    this.touchLatencyReport = {
      samples: 0,
      lastMs: null,
      medianMs: null,
      p95Ms: null,
      note: 'Pointer event to applied camera pose; populate on the deployed device.',
    };
    globalThis.__MOBILE_INPUT_PERF__ = this.touchLatencyReport;

    this._bound = {
      keydown: this._onKeyDown.bind(this),
      keyup: this._onKeyUp.bind(this),
      mousedown: this._onMouseDown.bind(this),
      mouseup: this._onMouseUp.bind(this),
      mousemove: this._onMouseMove.bind(this),
      pointerdown: this._onCanvasPointerDown.bind(this),
      pointerup: this._onCanvasPointerUp.bind(this),
      wheel: this._onWheel.bind(this),
      lockchange: this._onLockChange.bind(this),
      blur: this._onBlur.bind(this),
      visibility: this._onVisibility.bind(this),
      contextmenu: (e) => e.preventDefault(),
    };
  }

  attach() {
    addEventListener('keydown', this._bound.keydown);
    addEventListener('keyup', this._bound.keyup);
    addEventListener('mousedown', this._bound.mousedown);
    addEventListener('mouseup', this._bound.mouseup);
    addEventListener('mousemove', this._bound.mousemove);
    addEventListener('wheel', this._bound.wheel, { passive: true });
    addEventListener('blur', this._bound.blur);
    document.addEventListener('visibilitychange', this._bound.visibility);
    document.addEventListener('pointerlockchange', this._bound.lockchange);
    this.canvas.addEventListener('contextmenu', this._bound.contextmenu);
    this.canvas.addEventListener('pointerdown', this._bound.pointerdown);
    this.canvas.addEventListener('pointerup', this._bound.pointerup);
    this.canvas.addEventListener('pointercancel', this._bound.pointerup);
  }

  detach() {
    removeEventListener('keydown', this._bound.keydown);
    removeEventListener('keyup', this._bound.keyup);
    removeEventListener('mousedown', this._bound.mousedown);
    removeEventListener('mouseup', this._bound.mouseup);
    removeEventListener('mousemove', this._bound.mousemove);
    removeEventListener('wheel', this._bound.wheel);
    removeEventListener('blur', this._bound.blur);
    document.removeEventListener('visibilitychange', this._bound.visibility);
    document.removeEventListener('pointerlockchange', this._bound.lockchange);
    this.canvas.removeEventListener('contextmenu', this._bound.contextmenu);
    this.canvas.removeEventListener('pointerdown', this._bound.pointerdown);
    this.canvas.removeEventListener('pointerup', this._bound.pointerup);
    this.canvas.removeEventListener('pointercancel', this._bound.pointerup);
  }

  requestPointerLock() {
    if (this.config.mobile) return;
    if (this._touchPointers.size) return;
    try {
      const p = this.canvas.requestPointerLock?.({ unadjustedMovement: true });
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          try { this.canvas.requestPointerLock?.(); } catch { /* not eligible */ }
        });
      }
    } catch {
      try { this.canvas.requestPointerLock?.(); } catch { /* not eligible */ }
    }
  }

  _isEmulatedMouse(e) {
    if (!e) return false;
    if (e.sourceCapabilities?.firesTouchEvents) return true;
    if (this._touchPointers.size > 0) return true;
    if (this.config.mobile) return true;
    const t = e.target;
    if (t && typeof t.closest === 'function' && t.closest('.cod-mobile, .cod-btn, .cod-stick')) {
      return true;
    }
    return false;
  }

  _onKeyDown(e) {
    if (!this.enabled) return;
    if (e.repeat) return;
    if (GAME_CODES.has(e.code) && !e.metaKey && !e.ctrlKey) e.preventDefault();
    this._pendingDown.add(e.code);
  }

  _onKeyUp(e) {
    if (!this.enabled) return;
    this._pendingUp.add(e.code);
  }

  _onMouseDown(e) {
    if (!this.enabled) return;
    if (this._isEmulatedMouse(e)) return;
    if (!this.pointerLocked && e.button === 0) this.requestPointerLock();
    this._pendingDown.add(`Mouse${e.button}`);
  }

  _onMouseUp(e) {
    if (!this.enabled) return;
    if (this._isEmulatedMouse(e)) return;
    this._pendingUp.add(`Mouse${e.button}`);
  }

  _onCanvasPointerDown(e) {
    if (!this.enabled || this.config.mobile) return;
    if (e.pointerType === 'touch') return;
    if (e.button === 0 && !this.pointerLocked) this.requestPointerLock();
  }

  _onCanvasPointerUp() {}

  _onMouseMove(e) {
    if (!this.enabled || !this.pointerLocked || this.frozen) return;
    if (this._isEmulatedMouse(e)) return;
    this._rawLook.x += e.movementX ?? 0;
    this._rawLook.y += e.movementY ?? 0;
  }

  _onWheel(e) {
    if (!this.enabled) return;
    this._pendingWheel += Math.sign(e.deltaY);
  }

  _onLockChange() {
    const locked = document.pointerLockElement === this.canvas;
    const wasLocked = this.pointerLocked;
    this.pointerLocked = locked;
    // Only release keys when we actually *lost* a lock. A failed mobile lock
    // request used to fire this with null and wipe JUMP/FIRE the same frame.
    if (wasLocked && !locked) this._onBlur();
  }

  _onBlur() {
    for (const code of this.down) this._pendingUp.add(code);
    this._rawLook.x = 0;
    this._rawLook.y = 0;
    this._touchLook.x = 0;
    this._touchLook.y = 0;
    this._touchLookEventAt = 0;
    this._touchLookAppliedPending = false;
    this._touchHeldCodes.clear();
  }

  _onVisibility() {
    if (document.hidden) this._onBlur();
  }

  beginFrame() {
    this._pressed.clear();
    this._released.clear();

    for (const code of this._pendingDown) {
      if (!this.down.has(code)) {
        this.down.add(code);
        this._pressed.add(code);
      }
    }
    for (const code of this._pendingUp) {
      if (this.down.delete(code)) this._released.add(code);
    }
    this._pendingDown.clear();
    this._pendingUp.clear();

    const hasTouchLook = Math.abs(this._touchLook.x) + Math.abs(this._touchLook.y) > 1e-8;
    if (hasTouchLook) {
      this._touchLookPendingAt = this._touchLookEventAt || performance.now();
      this._touchLookAppliedPending = true;
    }
    const turnSensitivity = Number.isFinite(this.config.turnSensitivity)
      ? Math.max(0.35, Math.min(2.25, this.config.turnSensitivity))
      : 1;
    const baseSensitivity = this.config.sensitivity;
    this.look.x = this.frozen ? 0 : this._rawLook.x * baseSensitivity * turnSensitivity + this._touchLook.x;
    this.look.y = this.frozen ? 0 : (this._rawLook.y * baseSensitivity + this._touchLook.y) * (this.config.invertY ? -1 : 1);
    this._rawLook.x = 0;
    this._rawLook.y = 0;
    this._touchLook.x = 0;
    this._touchLook.y = 0;
    this._touchLookEventAt = 0;

    this.wheel = this._pendingWheel;
    this._pendingWheel = 0;

    this._pollGamepad();
  }

  endFrame() {}

  _pollGamepad() {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads[this.gamepadIndex ?? 0] ?? pads.find(Boolean);
    if (!pad) {
      this.stick.moveX = this.stick.moveY = this.stick.lookX = this.stick.lookY = 0;
      return;
    }
    const radial = (x, y, dz = 0.16) => {
      const m = Math.hypot(x, y);
      if (m < dz) return { x: 0, y: 0 };
      const scale = ((m - dz) / (1 - dz)) / m;
      return { x: x * scale, y: y * scale };
    };
    const mv = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    this.stick.moveX = mv.x;
    this.stick.moveY = mv.y;
    const look = radial(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.14);
    const curve = (v) => Math.sign(v) * Math.abs(v) ** 2.4;
    this.stick.lookX = curve(look.x);
    this.stick.lookY = curve(look.y);
    if (pad.buttons[0]?.pressed) this._pendingDown.add('Space');
    else if (this.down.has('Space') && !this._touchHeldCodes.has('Space')) this._pendingUp.add('Space');
    if (pad.buttons[7]?.value > 0.4) this._pendingDown.add('Mouse0');
    else if (this.down.has('Mouse0') && !this._touchHeldCodes.has('Mouse0')) this._pendingUp.add('Mouse0');
    if (pad.buttons[6]?.value > 0.4) this._pendingDown.add('Mouse2');
    else if (this.down.has('Mouse2') && !this._touchHeldCodes.has('Mouse2')) this._pendingUp.add('Mouse2');
  }

  /**
   * @param {number} x  -1..1, player-right
   * @param {number} y  -1..1, player-forward (NOT screen-down)
   */
  setTouchMove(x, y) {
    const mx = Number.isFinite(x) ? x : 0;
    const my = Number.isFinite(y) ? y : 0;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      this.touch.moveX = mx / len;
      this.touch.moveY = my / len;
    } else {
      this.touch.moveX = mx;
      this.touch.moveY = my;
    }
  }

  addTouchLook(dx, dy, eventAt = performance.now()) {
    if (this.frozen) return;
    const turnSensitivity = Number.isFinite(this.config.turnSensitivity)
      ? Math.max(0.35, Math.min(2.25, this.config.turnSensitivity))
      : 1;
    const scale = this.config.touchSensitivity ?? 0.0034;
    this._touchLook.x += dx * scale * turnSensitivity;
    this._touchLook.y += dy * scale;
    const stamp = Number(eventAt);
    if (Number.isFinite(stamp) && stamp > 0) {
      this._touchLookEventAt = this._touchLookEventAt
        ? Math.min(this._touchLookEventAt, stamp)
        : stamp;
    }
  }

  markTouchLookApplied(appliedAt = performance.now()) {
    if (!this._touchLookAppliedPending) return;
    this._touchLookAppliedPending = false;
    const latency = Math.max(0, Math.min(250, Number(appliedAt) - this._touchLookPendingAt));
    if (!Number.isFinite(latency)) return;
    const samples = this._touchLatencySamples;
    samples.push(latency);
    if (samples.length > 180) samples.shift();
    const sorted = [...samples].sort((a, b) => a - b);
    const percentile = p => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
    const report = this.touchLatencyReport;
    report.samples++;
    report.lastMs = +latency.toFixed(2);
    report.medianMs = +percentile(0.5).toFixed(2);
    report.p95Ms = +percentile(0.95).toFixed(2);
  }

  setTouchButton(code, down) {
    if (down) this._touchHeldCodes.add(code);
    else this._touchHeldCodes.delete(code);
    (down ? this._pendingDown : this._pendingUp).add(code);
  }

  noteTouchPointer(pointerId, down) {
    if (down) this._touchPointers.add(pointerId);
    else this._touchPointers.delete(pointerId);
  }

  action(name) {
    const codes = ACTIONS[name];
    if (!codes) return false;
    for (const c of codes) if (this.down.has(c)) return true;
    return false;
  }

  actionPressed(name) {
    const codes = ACTIONS[name];
    if (!codes) return false;
    for (const c of codes) if (this._pressed.has(c)) return true;
    return false;
  }

  held(code) {
    return this.down.has(code);
  }

  pressed(code) {
    return this._pressed.has(code);
  }

  released(code) {
    return this._released.has(code);
  }

  get fire() {
    return this.down.has('Mouse0');
  }

  get firePressed() {
    return this._pressed.has('Mouse0');
  }

  get ads() {
    return this.down.has('Mouse2');
  }

  /** Normalised WASD + stick + touch, clamped to the unit disc. */
  moveVector(out = { x: 0, y: 0 }) {
    let x = (this.action('right') ? 1 : 0) - (this.action('left') ? 1 : 0);
    let y = (this.action('forward') ? 1 : 0) - (this.action('back') ? 1 : 0);
    x += this.stick.moveX;
    y -= this.stick.moveY;
    x += this.touch.moveX;
    y += this.touch.moveY;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    out.x = x;
    out.y = y;
    return out;
  }
}
