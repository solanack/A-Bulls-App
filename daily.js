/* v7.0.1 Daily seeded challenge client */
(function (global) {
  'use strict';

  const BOSSES = [
    'rugpaw', 'diamond-fang', 'candlewick', 'gasfee-golem', 'whale-song', 'ponzimouse',
    'rekt-raven', 'slippage-slug', 'copium-cat', 'fud-hound', 'paperhand-phantom',
    'moonboy-owl', 'dump-truck-turtle', 'airdrop-vulture', 'honeypot-wasp',
    'gas-war-goat', 'snipe-serpent', 'bagholder-bear', 'exit-liquidity-eel'
  ];
  const MODIFIERS = [
    { id: 'swift', label: 'Swift Bears', desc: 'Enemy projectiles move faster' },
    { id: 'dense', label: 'Dense Formation', desc: 'Tighter enemy groups' },
    { id: 'glass', label: 'Glass Cannon', desc: 'You and enemies take extra pressure' },
    { id: 'meteor', label: 'Meteor Rain', desc: 'Extra hazard cadence' },
    { id: 'steady', label: 'Steady Aim', desc: 'Standard daily tempo' }
  ];

  function dayKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
  }

  /** Deterministic daily config (matches Worker seed logic). */
  function localConfigForDay(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    const bossId = BOSSES[h % BOSSES.length];
    const mod = MODIFIERS[(h >>> 8) % MODIFIERS.length];
    return { dayKey: key, bossId, modifier: mod.id, modifierLabel: mod.label, modifierDesc: mod.desc };
  }

  async function fetchToday() {
    try {
      if (global.BBRSApi) {
        const data = await global.BBRSApi.retentionData('/api/daily/today');
        const mod = MODIFIERS.find(item => item.id === data?.modifier);
        return { ...data, modifierLabel: mod?.label || data?.modifier, modifierDesc: mod?.desc || '' };
      }
    } catch (_) {}
    return localConfigForDay(dayKey());
  }

  async function submitRun(run) {
    const mode = 'daily';
    const challenge = global.BBRLeaderboard?.takeChallenge?.(mode);
    if (!challenge) return { accepted: false, error: 'The Daily Run challenge expired. Start a new Daily Run.' };
    const payload = {
      game: 'bull-invaders',
      mode,
      purchasedItemsActive: false,
      score: Math.max(0, Math.floor(Number(run.score || 0))),
      elapsedMs: Math.max(0, Math.floor(Number(run.elapsedMs || 0))),
      kills: Math.max(0, Math.floor(Number(run.kills || 0))),
      bossesDefeated: Math.max(0, Math.floor(Number(run.bossesDefeated || 0))),
      alias: String(global.profile?.customProfile?.name || global.profile?.googleUser?.name || 'Bull').slice(0, 24),
      nonce: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      bossId: run.bossId,
      modifier: run.modifier,
      damageTaken: Math.max(0, Math.floor(Number(run.damageTaken || 0))),
      continuesUsed: Math.max(0, Math.floor(Number(run.continuesUsed || 0))),
      challengeId: challenge.challengeId,
      challengeToken: challenge.challengeToken
    };
    if (global.BBRLeaderboard?.hashRun) {
      payload.replayHash = await global.BBRLeaderboard.hashRun(payload);
    }
    try {
      const result = await global.BBRSApi.retentionPost('/api/daily/submit', payload);
      if (result?.streak_count != null) {
        localStorage.setItem('bbr_last_streak', String(result.streak_count));
        if (global.profile) global.profile.streak = Number(result.streak_count || 0);
        global.save?.();
      }
      return result;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function renderPanel(root) {
    if (!root) return;
    const cfg = await fetchToday();
    root.innerHTML = `
      <div class="panel daily-panel terminal-poster">
        <div class="section-title" style="margin-top:0"><h2 style="font-size:15px">Daily Run</h2></div>
        <p class="notice">Same boss + modifier for everyone · resets 00:00 UTC · separate from Ranked</p>
        <div class="daily-card retention-card-grid">
          <div class="terminal-card"><i>☠</i><span class="eyebrow">Boss</span><b id="dailyBossLabel">${String(cfg.bossId || '—').replace(/-/g, ' ')}</b></div>
          <div class="terminal-card"><i>⚡</i><span class="eyebrow">Modifier</span><b>${cfg.modifierLabel || cfg.modifier || '—'}</b></div>
          <p class="notice">${cfg.modifierDesc || ''}</p>
          <p class="notice" id="dailyAttempted">${cfg.attempted ? 'You already logged a run today — you can still practice in Arcade.' : 'Not attempted yet today.'}</p>
        </div>
        <button type="button" class="primary" id="dailyStartBtn" style="width:100%;margin-top:12px">${cfg.attempted ? 'START ARCADE PRACTICE' : 'START DAILY RUN'}</button>
        <div id="dailyLeaderboard" class="rank-list" style="margin-top:14px"></div>
      </div>`;
    root.querySelector('#dailyStartBtn')?.addEventListener('click', () => {
      try {
        sessionStorage.setItem('bbr_run_mode', cfg.attempted ? 'arcade' : 'daily');
        if (cfg.attempted) {
          global.Bullion?.setMode?.('arcade');
          sessionStorage.removeItem('bbr_daily_boss');
          sessionStorage.removeItem('bbr_daily_mod');
        } else {
          sessionStorage.setItem('bbr_daily_launch', '1');
          sessionStorage.setItem('bbr_daily_boss', cfg.bossId || '');
          sessionStorage.setItem('bbr_daily_mod', cfg.modifier || '');
        }
      } catch (_) {}
      document.getElementById('startInvaders')?.click();
      if (typeof showView === 'function') showView('invadersGame');
    });
    try {
      const top = await global.BBRSApi.data('/api/daily/top?limit=10');
      const rows = top?.scores || [];
      const box = root.querySelector('#dailyLeaderboard');
      if (box && rows.length) {
        box.innerHTML = '<div class="eyebrow">Today\'s board</div>' + rows.map((r, i) =>
          `<div class="rank-row"><b>#${i + 1}</b><div class="rank-meta"><strong>${r.alias || 'Bull'}</strong></div><div class="rank-dist">${Number(r.score).toLocaleString()}</div></div>`
        ).join('');
      }
    } catch (_) {}
  }

  global.BBRDaily = { fetchToday, submitRun, renderPanel, localConfigForDay, dayKey };
})(window);
