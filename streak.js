/* v7.0.1 Streak UI — forward momentum only; cosmetic milestones */
(function (global) {
  'use strict';
  const MILESTONES = [
    { day: 3, cosmetic: 'streak_badge_3', label: '3-day badge' },
    { day: 7, cosmetic: 'streak_badge_7', label: '7-day banner' },
    { day: 14, cosmetic: 'streak_badge_14', label: '14-day trail' },
    { day: 30, cosmetic: 'streak_badge_30', label: '30-day crown' }
  ];

  function render(root, data) {
    if (!root) return;
    const n = Number(data?.streak_count || 0);
    const next = MILESTONES.find(m => m.day > n) || MILESTONES[MILESTONES.length - 1];
    root.innerHTML = `
      <div class="panel">
        <div class="section-title" style="margin-top:0"><h2 style="font-size:15px">Streak</h2></div>
        <p style="font-size:22px;font-weight:800;color:var(--g2);margin:0">${n}-day streak</p>
        <p class="notice">Keep it going — next unlock: ${next.label} (day ${next.day}). Cosmetics only.</p>
        <ul class="notice" style="padding-left:18px">${MILESTONES.map(m =>
          `<li>${m.day}d — ${m.label}${n >= m.day ? ' ✓' : ''}</li>`).join('')}</ul>
        <label class="notice" style="display:flex;gap:8px;align-items:center;margin-top:10px">
          <input type="checkbox" id="streakNotifyOpt" ${data?.notifyOptIn ? 'checked' : ''}/>
          Optional once-daily reminder (only after your first Daily clear)
        </label>
      </div>`;
    root.querySelector('#streakNotifyOpt')?.addEventListener('change', async (e) => {
      if (e.target.checked && n < 1) {
        e.target.checked = false;
        alert('Complete a Daily Run first to enable reminders.');
        return;
      }
      if (e.target.checked && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') e.target.checked = false;
      }
      try {
        localStorage.setItem('bbr_streak_notify', e.target.checked ? '1' : '0');
      } catch (_) {}
    });
  }

  global.BBRStreak = { render, MILESTONES };
})(window);
