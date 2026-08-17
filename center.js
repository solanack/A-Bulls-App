/* v7.0.1 Retention Center — aggregate display only */
(function (global) {
  'use strict';
  async function render(root) {
    if (!root) return;
    let daily = {}, community = {}, medals = {}, streak = 0;
    try { daily = await global.BBRDaily?.fetchToday?.() || {}; } catch (_) {}
    try { community = await global.BBRSApi?.data?.('/api/community/goal') || {}; } catch (_) {}
    try {
      medals = (await global.BBRSApi?.retentionData?.('/api/medals'))?.medals || {};
    } catch (_) {}
    try {
      streak = Number(global.profile?.streak || 0);
      // Prefer server streak if daily submit returned one previously
      const s = localStorage.getItem('bbr_last_streak');
      if (s) streak = Math.max(streak, Number(s) || 0);
    } catch (_) {}
    const medalCount = Object.values(medals).filter(m => m && (m.no_damage || m.under_time || m.no_continue)).length;
    const medalKeys = Object.keys(medals).length || 19;
    const medalPct = Math.round((medalCount / Math.max(1, medalKeys)) * 100);
    const sessionCap = Number(global.BullInvaders?.getSessionCaptures?.() || 0);
    const totalCap = Math.max(0, Math.floor(Number(global.profile?.stats?.bullsCapturedTotal || 0)));
    const cProg = Number(community.progress || 0), cThr = Number(community.threshold || 10000);
    const cPct = Math.min(100, Math.round((cProg / Math.max(1, cThr)) * 100));
    const card = (icon, label, value, detail, progress = null) => `<article class="terminal-card retention-stat-card"><i>${icon}</i><small>${label}</small><b>${value}</b>${progress == null ? '' : `<div class="terminal-progress"><span style="width:${progress}%"></span></div>`}<p>${detail}</p></article>`;
    root.innerHTML = `
      <div class="section-title"><h2>Retention Center</h2><small>Terminal Graffiti progress board</small></div>
      <div class="retention-card-grid">
        ${card('↯', 'Streak', `${streak} days`, 'Cosmetic milestones only', Math.min(100, streak / 30 * 100))}
        ${card('◉', 'Daily status', daily.attempted ? 'Complete' : 'Open', `${String(daily.bossId || 'No boss').replace(/-/g, ' ')} · ${daily.modifierLabel || daily.modifier || 'standard'}`, daily.attempted ? 100 : 0)}
        ${card('✦', 'Crew progress', 'Weekly', 'Daily completions power the crew total')}
        ${card('◆', 'Boss medals', `${medalPct}%`, `${medalCount} medal bosses tracked`, medalPct)}
        ${card('♉', 'Bulls captured', totalCap.toLocaleString(), `${sessionCap} captured this session`)}
        ${card('⌁', 'Community goal', `${cPct}%`, `${cProg.toLocaleString()} / ${cThr.toLocaleString()}`, cPct)}
      </div>
      <div class="retention-actions"><button type="button" class="primary" id="rcDaily">OPEN DAILY RUN</button><button type="button" class="secondary" id="rcCrew">OPEN CREW</button></div>`;
    root.querySelector('#rcDaily')?.addEventListener('click', () => showView?.('daily'));
    root.querySelector('#rcCrew')?.addEventListener('click', () => showView?.('crew'));
  }
  global.BBRRetentionCenter = { render };
})(window);
