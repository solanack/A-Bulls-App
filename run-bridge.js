/* Bridges invaders run completion → Daily / Ranked submit without changing Ranked math */
(function (global) {
  'use strict';
  async function onRunComplete(summary) {
    const mode = sessionStorage.getItem('bbr_run_mode') || summary?.mode || 'ranked';
    const payload = {
      score: summary?.score || 0,
      elapsedMs: summary?.elapsedMs || 0,
      kills: summary?.kills || 0,
      bossesDefeated: summary?.bossesDefeated || 0,
      bossId: sessionStorage.getItem('bbr_daily_boss') || summary?.bossId,
      modifier: sessionStorage.getItem('bbr_daily_mod') || summary?.modifier,
      damageTaken: summary?.damageTaken,
      continuesUsed: summary?.continuesUsed,
      timeThresholdMs: summary?.timeThresholdMs || 180000
    };
    if (mode === 'daily' && global.BBRDaily?.submitRun) {
      const res = await global.BBRDaily.submitRun(payload);
      if (res?.streak_count != null || res?.data?.streak_count != null) {
        const n = res.streak_count ?? res.data?.streak_count;
        try {
          localStorage.setItem('bbr_last_streak', String(n));
          if (global.profile) global.profile.streak = Number(n || 0);
          global.save?.();
        } catch (_) {}
        if (global.toast) global.toast(`${n}-day streak — keep it going`);
      }
      try {
        if (global.ShareCard?.fromDaily) global.ShareCard.fromDaily(res);
      } catch (_) {}
      try {
        sessionStorage.removeItem('bbr_run_mode');
        sessionStorage.removeItem('bbr_daily_boss');
        sessionStorage.removeItem('bbr_daily_mod');
      } catch (_) {}
      return res;
    }
    if (mode === 'ranked' && global.BBRLeaderboard?.submit) {
      return global.BBRLeaderboard.submit('bull-invaders', { ...payload, mode: 'ranked' });
    }
    return null;
  }
  global.BBRRetentionBridge = { onRunComplete };
})(window);
