/* Run-mode compatibility layer. Commerce is intentionally deferred. */
(function (global) {
  'use strict';

  const state = { mode: global.profile?.bullion?.mode === 'arcade' ? 'arcade' : 'ranked' };
  const byId = id => document.getElementById(id);

  function persist() {
    if (!global.profile) return;
    global.profile.bullion = global.profile.bullion || {};
    global.profile.bullion.mode = state.mode;
    global.profile.bullion.activeSkin = '';
    global.save?.();
  }

  function clearDailySelection() {
    try {
      sessionStorage.removeItem('bbr_daily_boss');
      sessionStorage.removeItem('bbr_daily_mod');
    } catch (_) {}
  }

  function setMode(mode, options = {}) {
    state.mode = mode === 'arcade' ? 'arcade' : 'ranked';
    if (options.user === true) {
      clearDailySelection();
      try { sessionStorage.setItem('bbr_run_mode', state.mode); } catch (_) {}
    }
    persist();
    document.querySelectorAll('[name="invaderMode"]').forEach(input => { input.checked = input.value === state.mode; });
    global.dispatchEvent(new CustomEvent('bbrs:run-mode-change', { detail: { mode: state.mode } }));
  }

  function updateBalance() {
    [byId('bullionBalance'), byId('bullionMenuBalance')].forEach(node => { if (node) node.textContent = '0'; });
  }

  async function init() {
    setMode(state.mode);
    document.querySelectorAll('[name="invaderMode"]').forEach(input => {
      input.addEventListener('change', () => setMode(input.value, { user: true }));
    });
    document.querySelectorAll('[data-google-play-store], #bullStoreView').forEach(node => { node.hidden = true; });
    updateBalance();
  }

  async function unavailable() {
    throw new Error('Bullion is planned for a later release and is not available in this build.');
  }

  global.Bullion = Object.freeze({
    init,
    setMode,
    refreshBalance: async () => ({ balance: 0, entitlements: {} }),
    buyItem: unavailable,
    useConsumable: unavailable,
    mode: () => state.mode,
    balance: () => 0,
    entitlement: () => 0,
    maxPowerSlots: () => 4,
    specialWeapon: () => false,
    activeSkin: () => '',
    storeAvailable: () => false,
    purchasesEnabled: () => false,
    channel: () => 'none',
    snapshot: () => ({ balance: 0, entitlements: {} }),
    catalog: () => null
  });
})(window);
