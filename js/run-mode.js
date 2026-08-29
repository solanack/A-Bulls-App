/* Ranked/campaign mode state. No currency, catalog, entitlement, or purchase surface. */
(function (global) {
  'use strict';
  const state = { mode: global.profile?.runMode === 'arcade' ? 'arcade' : 'ranked' };

  function persist() {
    if (!global.profile) return;
    global.profile.runMode = state.mode;
    global.save?.();
  }

  function setMode(mode, options = {}) {
    state.mode = mode === 'arcade' ? 'arcade' : 'ranked';
    if (options.user === true) {
      try { sessionStorage.setItem('bbr_run_mode', state.mode); } catch (_) {}
    }
    persist();
    document.querySelectorAll('[name="invaderMode"]').forEach(input => { input.checked = input.value === state.mode; });
    global.dispatchEvent(new CustomEvent('bbrs:run-mode-change', { detail: { mode: state.mode } }));
  }

  function init() {
    setMode(state.mode);
    document.querySelectorAll('[name="invaderMode"]').forEach(input => {
      if (input.dataset.bbrRunModeWired === '1') return;
      input.dataset.bbrRunModeWired = '1';
      input.addEventListener('change', () => setMode(input.value, { user: true }));
    });
  }

  global.BBRRunMode = Object.freeze({ init, setMode, mode: () => state.mode });
})(window);
