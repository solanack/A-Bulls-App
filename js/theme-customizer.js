/* App-wide theme sliders. Local-only and persistent. */
(function (global) {
  'use strict';
  const KEY = 'abulls_theme_v1';
  const defaults = { hue: 140, saturation: 34, lightness: 70, panelHue: 275 };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const read = () => {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; }
    catch (_) { return { ...defaults }; }
  };
  const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;

  function apply(state) {
    const root = document.documentElement;
    const h = clamp(state.hue, 0, 360);
    const s = clamp(state.saturation, 0, 100);
    const l = clamp(state.lightness, 35, 85);
    const p = clamp(state.panelHue, 0, 360);
    root.style.setProperty('--g2', hsl(h, s, l));
    root.style.setProperty('--g', hsl((h + 85) % 360, Math.max(16, s * .75), Math.min(82, l + 3)));
    root.style.setProperty('--tg-green', hsl(h, s, l));
    root.style.setProperty('--tg-cyan', hsl((h + 42) % 360, Math.min(100, s + 10), Math.min(85, l + 4)));
    root.style.setProperty('--tg-purple', hsl((h + 105) % 360, Math.max(20, s), Math.min(82, l + 2)));
    root.style.setProperty('--community-green', hsl(h, Math.min(100, s + 8), l));
    root.style.setProperty('--community-lime', hsl((h + 18) % 360, Math.min(100, s + 16), Math.min(84, l + 4)));
    root.style.setProperty('--community-border', hsl((h + 35) % 360, Math.max(14, s * .65), Math.max(30, l - 30)));
    root.style.setProperty('--line', hsl(p, Math.max(10, s * .45), 32));
    root.style.setProperty('--panel', `hsla(${Math.round(p)} ${Math.round(Math.max(8, s * .25))}% 8% / .90)`);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', hsl(p, Math.max(8, s * .25), 7));
  }

  function syncLabels(state) {
    [
      ['themeHueValue', `${Math.round(state.hue)}°`],
      ['themeSaturationValue', `${Math.round(state.saturation)}%`],
      ['themeLightnessValue', `${Math.round(state.lightness)}%`],
      ['themePanelHueValue', `${Math.round(state.panelHue)}°`]
    ].forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = value; });
  }

  function init() {
    let state = read();
    apply(state);
    const controls = { themeHue: 'hue', themeSaturation: 'saturation', themeLightness: 'lightness', themePanelHue: 'panelHue' };
    Object.entries(controls).forEach(([id, key]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = state[key];
      input.addEventListener('input', () => {
        state[key] = Number(input.value);
        apply(state);
        syncLabels(state);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
      });
    });
    document.getElementById('themeReset')?.addEventListener('click', () => {
      state = { ...defaults };
      Object.entries(controls).forEach(([id, key]) => {
        const input = document.getElementById(id);
        if (input) input.value = state[key];
      });
      apply(state);
      syncLabels(state);
      try { localStorage.removeItem(KEY); } catch (_) {}
    });
    syncLabels(state);
  }

  apply(read());
  global.BBRSThemeCustomizer = Object.freeze({ init, apply });
})(window);
