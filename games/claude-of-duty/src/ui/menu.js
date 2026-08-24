import { el, setText, setStyle, clamp, damp, ease } from './util.js';

const SETTINGS_KEY = 'solana-bang-bang-settings-v1';

/**
 * Pause / settings menu.
 *
 * Solana Bang Bang exposes only the two player-facing controls requested for
 * the pause screen: horizontal turning sensitivity and auto aim. Both settings
 * are stored only on this device and applied to the live config immediately.
 *
 * Events emitted: `ui:pause` {paused}, `ui:sensitivity` {multiplier},
 * `ui:setting` {key, value}.
 */
export class PauseMenu {
  constructor(parent, ctx) {
    this.ctx = ctx;
    this._loadSettings();
    this.root = el('div', 'ow-menu', parent);
    const inner = el('div', 'ow-menu-inner', this.root);

    const h = el('h1', null, inner, 'Paused');
    h.textContent = 'PAUSED';
    el('div', 'sub', inner, 'SOLANA BANG BANG — GAME SETTINGS');
    el('div', 'rule', inner);

    this.rows = el('div', null, inner);

    // ---- left/right turning sensitivity ----------------------------------
    this.sens = this._slider('Turn Sensitivity', 0.5, 2.0, 0.05, (v) => {
      this.ctx.config.turnSensitivity = v;
      this.ctx.events.emit('ui:sensitivity', { multiplier: v });
      this._saveSettings();
      return `${Math.round(v * 100)}%`;
    });

    // ---- auto aim ---------------------------------------------------------
    const aimRow = this._row('Auto Aim');
    const aimSeg = el('div', 'ow-seg', aimRow);
    this.aimBtns = [];
    for (const [label, val] of [
      ['off', false],
      ['on', true],
    ]) {
      const b = el('button', null, aimSeg, label);
      b.type = 'button';
      b.setAttribute('aria-label', `Auto aim ${label}`);
      b.addEventListener('click', () => {
        this.ctx.config.autoAim = val;
        this.ctx.events.emit('ui:setting', { key: 'autoAim', value: val });
        this._saveSettings();
        this.syncFromConfig();
      });
      this.aimBtns.push([b, val]);
    }

    // ---- buttons ---------------------------------------------------------
    const btns = el('div', 'ow-btns', inner);
    this.resumeBtn = el('button', 'ow-btn primary', btns, 'Resume');
    this.resumeBtn.type = 'button';
    this.resumeBtn.addEventListener('click', () => this.close());
    const reset = el('button', 'ow-btn', btns, 'Defaults');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      this.sens.set(1);
      this.ctx.config.autoAim = true;
      this._saveSettings();
      this.syncFromConfig();
    });
    el('div', 'hint', inner, this.ctx.config.mobile
      ? 'AUTO AIM HELPS ONLY WHILE AIMING OR FIRING · DRAG RIGHT SIDE TO TURN'
      : 'AUTO AIM HELPS ONLY WHILE AIMING OR FIRING · ESC TO RESUME');

    this.open = false;
    this.shown = 0;
    setStyle(this.root, 'display', 'none');
    setStyle(this.root, 'cursor', 'default');
    this.syncFromConfig();
  }

  _row(name) {
    const r = el('div', 'ow-row', this.rows);
    el('div', 'name', r, name.toUpperCase());
    return r;
  }

  _slider(name, min, max, step, apply) {
    const row = this._row(name);
    const wrap = el('div', 'ow-slider', row);
    el('div', 'track', wrap);
    const fill = el('div', 'fill', wrap);
    const knob = el('div', 'knob', wrap);
    const input = el('input', null, wrap);
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    const val = el('div', 'val', row, '');

    const paint = (v) => {
      const t = (v - min) / (max - min);
      setStyle(fill, 'width', (t * 100).toFixed(2) + '%');
      setStyle(knob, 'left', (t * 100).toFixed(2) + '%');
      setText(val, apply(v) ?? String(v));
    };
    input.addEventListener('input', () => paint(parseFloat(input.value)));
    const api = {
      set: (v) => {
        const c = clamp(v, min, max);
        input.value = String(c);
        paint(c);
      },
    };
    return api;
  }

  _loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (Number.isFinite(saved.turnSensitivity)) {
        this.ctx.config.turnSensitivity = clamp(saved.turnSensitivity, 0.5, 2);
      }
      if (typeof saved.autoAim === 'boolean') this.ctx.config.autoAim = saved.autoAim;
    } catch {
      // Corrupt or blocked local storage must never stop the game from opening.
    }
  }

  _saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        turnSensitivity: this.ctx.config.turnSensitivity,
        autoAim: this.ctx.config.autoAim === true,
      }));
    } catch {
      // Private browsing/storage pressure: keep the live setting for this run.
    }
  }

  syncFromConfig() {
    const cfg = this.ctx.config;
    for (const [b, v] of this.aimBtns) {
      const selected = (cfg.autoAim === true) === v;
      b.classList.toggle('on', selected);
      b.setAttribute('aria-pressed', String(selected));
    }
    this.sens?.set(cfg.turnSensitivity ?? 1);
  }

  toggle() {
    this.open ? this.close() : this.show();
  }

  show() {
    if (this.open) return;
    this.open = true;
    this.syncFromConfig();
    setStyle(this.root, 'display', '');
    document.exitPointerLock?.();
    const t = this.ctx.time;
    if (t) {
      this._prevScale = t.scale;
      t.scale = 0;
    }
    this.ctx.peek('player')?.setControlEnabled?.(false);
    this.ctx.events.emit('ui:pause', { paused: true });
  }

  close() {
    if (!this.open) return;
    this.open = false;
    const t = this.ctx.time;
    if (t) t.scale = this._prevScale ?? 1;
    this.ctx.peek('player')?.setControlEnabled?.(true);
    this.ctx.input?.requestPointerLock?.();
    this.ctx.events.emit('ui:pause', { paused: false });
  }

  /** Driven with unscaled time so the fade still runs while the game is frozen. */
  update(rawDt) {
    this.shown = damp(this.shown, this.open ? 1 : 0, 14, rawDt);
    if (this.shown < 0.004) {
      setStyle(this.root, 'display', 'none');
      setStyle(this.root, 'pointer-events', 'none');
      return;
    }
    setStyle(this.root, 'display', '');
    setStyle(this.root, 'pointer-events', this.open ? 'auto' : 'none');
    setStyle(this.root, 'opacity', ease.outQuad(this.shown).toFixed(3));
  }

  dispose() {
    this.root.remove();
  }
}
