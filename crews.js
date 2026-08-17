/* v7.0.1 Crews — signed players, join code, weekly Daily completions */
(function (global) {
  'use strict';
  async function render(root) {
    if (!root) return;
    root.innerHTML = `
      <div class="panel terminal-poster">
        <div class="section-title" style="margin-top:0"><h2 style="font-size:15px">Crew</h2></div>
        <p class="notice">Up to 8 players · weekly score = Daily Runs completed · no contact access</p>
        <input class="input" id="crewName" placeholder="Crew name"/>
        <button type="button" class="primary" id="crewCreate" style="width:100%;margin-top:8px">Create crew</button>
        <input class="input" id="crewJoinCode" placeholder="Join code" style="margin-top:12px"/>
        <button type="button" class="secondary" id="crewJoin" style="width:100%;margin-top:8px">Join</button>
        <div id="crewStatus" class="notice" style="margin-top:12px"></div>
        <div id="crewRoster" class="crew-roster"></div>
      </div>`;
    const loadStatus = async () => {
      const roster = root.querySelector('#crewRoster'), status = root.querySelector('#crewStatus');
      try {
        const data = await global.BBRSApi.retentionData('/api/crews/status');
        if (!data.crew) { roster.innerHTML = '<p class="notice">Create or join a crew to see member contributions.</p>'; return; }
        const max = Math.max(1, ...data.members.map(member => Number(member.contribution || 0)));
        status.textContent = `${data.crew.name} · ${data.weeklyTotal} weekly Daily Runs · code ${data.crew.joinCode}`;
        roster.innerHTML = `<div class="crew-summary terminal-card"><i>♉</i><small>Weekly crew total</small><b>${data.weeklyTotal}</b></div><div class="crew-member-list">${data.members.map((member, index) => `<article class="crew-member ${member.you ? 'is-you' : ''}"><span class="profile-chip">${String(member.alias || 'B').slice(0,1).toUpperCase()}</span><div><b>${member.alias}${member.you ? ' · YOU' : ''}</b><small>Weekly contribution</small><div class="achievement-progress"><span style="width:${Number(member.contribution || 0) / max * 100}%"></span></div></div><strong>${member.contribution}</strong></article>`).join('')}</div>`;
      } catch (error) { roster.innerHTML = `<p class="notice">${error.message || 'Crew data unavailable'}</p>`; }
    };
    root.querySelector('#crewCreate')?.addEventListener('click', async () => {
      const st = root.querySelector('#crewStatus');
      try {
        const data = await global.BBRSApi.retentionPost('/api/crews/create', { name: root.querySelector('#crewName').value });
        st.textContent = `Created. Join code: ${data.joinCode}`;
        await loadStatus();
      } catch (e) { st.textContent = e.message || 'Create failed'; }
    });
    root.querySelector('#crewJoin')?.addEventListener('click', async () => {
      const st = root.querySelector('#crewStatus');
      try {
        const data = await global.BBRSApi.retentionPost('/api/crews/join', { code: root.querySelector('#crewJoinCode').value });
        st.textContent = `Joined ${data.name || 'crew'} (${data.members || '?'} members)`;
        await loadStatus();
      } catch (e) { st.textContent = e.message || 'Join failed'; }
    });
    loadStatus();
  }
  global.BBRCrews = { render };
})(window);
