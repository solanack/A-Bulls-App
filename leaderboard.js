/* Server-screened leaderboard client with signed player sessions and one-time run challenges. */
(function (global) {
  'use strict';
  const challenges = new Map();
  const cleanAlias = value => String(value || 'Bull').replace(/[^a-zA-Z0-9_. -]/g, '').trim().slice(0, 24) || 'Bull';
  const alias = () => cleanAlias(global.profile?.customProfile?.name || global.profile?.googleUser?.name || 'Bull');
  const hex = buffer => [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, '0')).join('');
  async function hashRun(payload) {
    const canonical = ['abulls-v7.0.1', payload.mode, payload.game, payload.score, payload.elapsedMs, payload.kills || 0, payload.bossesDefeated || 0, payload.nonce, payload.challengeId].join('|');
    return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)));
  }
  async function beginRun(mode, game = 'bull-invaders') {
    if (!['ranked', 'daily'].includes(mode)) return null;
    challenges.delete(mode);
    const challenge = await global.BBRSApi.retentionPost('/api/leaderboard/challenge', { game, mode });
    if (challenge?.challengeId && challenge?.challengeToken) challenges.set(mode, challenge);
    return challenge;
  }
  function takeChallenge(mode) {
    const challenge = challenges.get(mode) || null;
    challenges.delete(mode);
    return challenge;
  }
  async function submit(game, run) {
    try {
      const mode = run.mode === 'ranked' ? 'ranked' : 'arcade';
      if (mode !== 'ranked') return { accepted: false, skipped: 'arcade' };
      const challenge = takeChallenge(mode);
      if (!challenge) return { accepted: false, skipped: 'missing-run-challenge' };
      const payload = {
        game, mode, purchasedItemsActive: false,
        score: Math.max(0, Math.floor(Number(run.score || 0))),
        elapsedMs: Math.max(0, Math.floor(Number(run.elapsedMs || 0))),
        kills: Math.max(0, Math.floor(Number(run.kills || 0))),
        bossesDefeated: Math.max(0, Math.floor(Number(run.bossesDefeated || 0))),
        alias: alias(), nonce: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        challengeId: challenge.challengeId, challengeToken: challenge.challengeToken
      };
      payload.replayHash = await hashRun(payload);
      return await global.BBRSApi.retentionPost('/api/leaderboard/submit', payload);
    } catch (_) { return null; }
  }
  async function load(game, root) {
    if (!root) return [];
    try {
      const data = await global.BBRSApi.data(`/api/leaderboard/top?game=${encodeURIComponent(game)}&limit=10`);
      const rows = data?.scores || [];
      if (!rows.length) return rows;
      const me = alias(), movementKey = `bbrs_rank_snapshot:${game}`;
      let prior = {};
      try { prior = JSON.parse(localStorage.getItem(movementKey) || '{}'); } catch (_) {}
      const safe = value => global.BBRPlatform?.escapeHtml?.(value) || String(value || 'Bull');
      const rowHtml = (row, index, pinned = false) => {
        const rank = Number.isInteger(index) && index >= 0 ? index + 1 : null, old = Number(prior[row.alias] || rank || 0), delta = rank ? old - rank : 0;
        const movement = delta > 0 ? `<span class="rank-move up">▲ ${delta}</span>` : delta < 0 ? `<span class="rank-move down">▼ ${Math.abs(delta)}</span>` : '<span class="rank-move flat">—</span>';
        const initial = safe(row.alias).slice(0, 1).toUpperCase();
        return `<div class="rank-row leaderboard-card ${pinned ? 'pinned-player' : ''}"><b>${rank ? '#' + rank : 'YOU'}</b><span class="profile-chip">${initial}</span><div class="rank-meta"><strong>${safe(row.alias)}${pinned ? ' · YOU' : ''}</strong><small>${row.screened === false ? 'local best · submit a Ranked run' : new Date(row.createdAt).toLocaleDateString() + ' · server-screened'}</small></div>${movement}<div class="rank-dist">${Number(row.score).toLocaleString()}</div></div>`;
      };
      const myIndex = rows.findIndex(row => String(row.alias || '').toLowerCase() === me.toLowerCase());
      const localRuns = global.profile?.gameRuns?.[game] || [];
      const localBest = Math.max(0, ...localRuns.map(run => Number(run.score || 0)));
      const pinned = myIndex >= 0 ? rowHtml(rows[myIndex], myIndex, true) : rowHtml({ alias: me, score: localBest, createdAt: Date.now(), screened: false }, -1, true);
      root.innerHTML = `<div class="leaderboard-scroll">${rows.map((row, index) => rowHtml(row, index, index === myIndex)).join('')}</div><div class="leaderboard-pinned">${pinned}</div>`;
      try { localStorage.setItem(movementKey, JSON.stringify(Object.fromEntries(rows.map((row, index) => [row.alias, index + 1])))); } catch (_) {}
      return rows;
    } catch (_) { return []; }
  }
  global.BBRLeaderboard = { beginRun, takeChallenge, submit, load, hashRun };
})(window);
