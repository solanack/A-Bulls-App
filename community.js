/* v7.0.1 replay-safe Community goal progress bar */
(function (global) {
  'use strict';
  async function render(root) {
    if (!root) return;
    let data = { progress: 0, threshold: 10000, unlocked: false, weekKey: '' };
    try { data = await global.BBRSApi.data('/api/community/goal') || data; } catch (_) {}
    const pct = Math.min(100, Math.round((data.progress / Math.max(1, data.threshold)) * 100));
    root.innerHTML = `
      <div class="panel community-goal">
        <div class="eyebrow">Community goal · this week</div>
        <p class="notice">Bosses defeated by all players · unlocks a shared cosmetic when complete</p>
        <div style="background:#132013;border-radius:8px;height:12px;overflow:hidden;margin-top:8px">
          <div style="height:100%;width:${pct}%;background:#00e676"></div>
        </div>
        <p class="notice">${Number(data.progress).toLocaleString()} / ${Number(data.threshold).toLocaleString()} · ${data.unlocked ? 'UNLOCKED' : pct + '%'}</p>
      </div>`;
  }
  global.BBRCommunity = { render };
})(window);
