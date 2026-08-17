/* v7.0.1 First-session intro — once per install, sub-90s path via existing opening + choice */
(function (global) {
  'use strict';
  function hasCompleted() {
    try {
      return !!(global.profile?.hasCompletedIntro || localStorage.getItem('bbr_hasCompletedIntro') === '1');
    } catch (_) { return false; }
  }
  function markDone() {
    try {
      if (global.profile) global.profile.hasCompletedIntro = true;
      if (typeof save === 'function') save();
      localStorage.setItem('bbr_hasCompletedIntro', '1');
    } catch (_) {}
  }
  function maybeStart() {
    if (hasCompleted()) return false;
    // Prefer existing opening sequence module if present
    if (global.OpeningSequence?.play) {
      global.OpeningSequence.play({
        onComplete: () => {
          markDone();
          showChoice();
        }
      });
      return true;
    }
    showChoice();
    markDone();
    return true;
  }
  function showChoice() {
    const host = document.getElementById('introChoiceHost');
    if (!host) return;
    host.hidden = false;
    host.innerHTML = `
      <div class="panel" style="max-width:420px;margin:24px auto">
        <h2 style="margin-top:0">You're cleared for launch</h2>
        <p class="notice">Pick one path — you can open the others anytime from the menu.</p>
        <button type="button" class="primary" data-go="campaign" style="width:100%;margin-top:8px">Campaign</button>
        <button type="button" class="secondary" data-go="ranked" style="width:100%;margin-top:8px">Ranked</button>
        <button type="button" class="secondary" data-go="analytics" style="width:100%;margin-top:8px">Explore Analytics</button>
      </div>`;
    host.querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        host.hidden = true;
        const go = btn.getAttribute('data-go');
        try {
          sessionStorage.removeItem('bbr_daily_boss');
          sessionStorage.removeItem('bbr_daily_mod');
          if (go === 'campaign') {
            sessionStorage.setItem('bbr_run_mode', 'arcade');
            global.Bullion?.setMode?.('arcade');
          } else if (go === 'ranked') {
            sessionStorage.setItem('bbr_run_mode', 'ranked');
            global.Bullion?.setMode?.('ranked');
          }
        } catch (_) {}
        if (go === 'ranked' || go === 'campaign') document.getElementById('startInvaders')?.click();
        else if (typeof showView === 'function') showView('home');
      });
    });
  }
  global.BBRIntro = { maybeStart, hasCompleted, markDone };
})(window);
