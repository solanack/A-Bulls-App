const labels = {
  home: 'Home', profile: 'Profile', settings: 'Profile', imageSettings: 'Image', youtubeSettings: 'YouTube', twitchSettings: 'Twitch', audioSettings: 'Audio', help: 'Help',
  invaderStats: 'Mission Statistics', invaderLeaderboard: 'Leaderboard', invadersGame: 'Bull Invaders', intelligence: 'Analytics'
};
let currentView = 'home';
const viewHistory = [];
const JOURNEY_WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isJourneyWallet(address) {
  return JOURNEY_WALLET_PATTERN.test(String(address || '').trim());
}

function setJourneyUnlocked(unlocked, wallet = '') {
  const active = unlocked === true;
  document.body.classList.toggle('journey-unlocked', active);
  document.body.classList.toggle('journey-locked', !active);
  document.querySelectorAll('[data-wallet-required]').forEach(node => {
    node.hidden = !active;
  });
  const status = document.getElementById('journeyStatus');
  if (status) status.textContent = active ? 'Journey unlocked.' : 'Enter a valid public Solana wallet address.';
  if (active && wallet && document.getElementById('walletInput')) document.getElementById('walletInput').value = wallet;
}

function unlockJourney(address) {
  const wallet = String(address || '').trim();
  if (!isJourneyWallet(wallet)) {
    setJourneyUnlocked(false);
    return false;
  }
  // This public-address gate is cosmetic and read-only. Address spoofing is possible and accepted:
  // nothing transferable or custodial is at risk, so never add wallet signatures to this flow.
  profile.publicWallet = wallet;
  save();
  setJourneyUnlocked(true, wallet);
  window.dispatchEvent(new CustomEvent('bbrs:journey-unlocked', { detail: { wallet } }));
  return true;
}

function refreshJourney() {
  const wallet = String(profile?.publicWallet || '').trim();
  setJourneyUnlocked(isJourneyWallet(wallet), wallet);
}

window.BBRSJourney = { isValid: isJourneyWallet, unlock: unlockJourney, refresh: refreshJourney };

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  const fullMessage = String(msg || '');
  const dataUtilityActive = document.getElementById('trackView')?.classList.contains('active');
  // v7 playful surfaces communicate with a compact icon and sound. Preserve
  // the full message for screen readers; adult analytics keeps necessary text.
  t.textContent = globalThis.BBRV7 && !dataUtilityActive
    ? (/error|failed|invalid|unavailable/i.test(fullMessage) ? '!' : '✓')
    : fullMessage;
  t.setAttribute('aria-label', fullMessage);
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('backdrop').classList.add('show');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('backdrop').classList.remove('show');
}

function openArcadeDrawer() {
  openDrawer();
  setNavGroup('games', true);
  setGameGroup('invaders', true);
  requestAnimationFrame(() => document.getElementById('navGamesParent')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
}

function showView(name, options = {}) {
  if (name === 'settings') name = 'profile';
  if (!document.getElementById(name + 'View') && name !== 'intelligence') name = 'home';
  closeDrawer();
  if (name !== currentView && !options.fromHistory) viewHistory.push(currentView);
  currentView = name;
  document.body.classList.toggle('game-active', name === 'invadersGame');
  if (name !== 'invadersGame') {
    BBRPlatform?.games.pause();
    try { if (window.BackgroundManager) BackgroundManager.onRunPause(); } catch (_) {}
  }
  const views = document.getElementById('views');
  const controlCenterViews = ['settings', 'imageSettings', 'youtubeSettings', 'twitchSettings', 'audioSettings', 'intelligence'];
  views?.classList.toggle('control-center-mode', controlCenterViews.includes(name));
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  if (name === 'intelligence') {
    document.getElementById('trackView')?.classList.add('active');
    // The HTML defaults these sections closed. Preserve the user's current open state
    // after wallet data arrives so navigating away and back never makes results appear lost.
    if (views) views.scrollTop = 0;
  } else document.getElementById(name + 'View')?.classList.add('active');
  if (name === 'home' && window.BackgroundManager && typeof profile !== 'undefined') BackgroundManager.applyMenu(profile);
  const back = document.getElementById('backBtn');
  if (back) back.disabled = viewHistory.length === 0;

  // Highlight nav child items
  document.querySelectorAll('#drawer [data-view]').forEach(b => {
    const settingsChild = ['imageSettings', 'youtubeSettings', 'twitchSettings', 'audioSettings'].includes(name);
    const sameView = b.dataset.view === name || (settingsChild && b.dataset.view === 'settings');
    b.classList.toggle('active', sameView);
  });

  // Parent group active + auto-expand when child is current
  const invaderViews = ['invaderStats', 'invaderLeaderboard', 'settings', 'imageSettings', 'youtubeSettings', 'twitchSettings', 'audioSettings', 'invadersGame'];
  const arcadeViews = [...invaderViews];
  const gamesParent = document.getElementById('navGamesParent');
  if (gamesParent) {
    const on = arcadeViews.includes(name);
    gamesParent.classList.toggle('active-group', on);
    if (on) {
      setNavGroup('games', true);
      if (invaderViews.includes(name)) setGameGroup('invaders', true);
    }
  }
  const label = document.getElementById('viewLabel');
  if (label) {
    const map = {
      home: 'HOME', profile: 'PROFILE', intelligence: 'ANALYTICS', imageSettings: 'IMAGE', youtubeSettings: 'YOUTUBE', twitchSettings: 'TWITCH', audioSettings: 'AUDIO', help: 'HELP',
      invaderStats: 'MISSIONS', invaderLeaderboard: 'RANKS', invadersGame: 'INVADERS'
    };
    label.textContent = map[name] || name.toUpperCase();
  }
  if (name === 'intelligence') loadAnsemData();
  if (name === 'profile') ProfileManager?.render?.();
  if (name === 'invaderLeaderboard') BBRLeaderboard?.load('bull-invaders', document.getElementById('invaderRankList'));
  document.querySelectorAll('#mobileCommunityTabs [data-mobile-view]').forEach(button => button.classList.toggle('active', button.dataset.mobileView === name));
  document.querySelector('#mobileCommunityTabs [data-mobile-action="arcade"]')?.classList.toggle('active', invaderViews.includes(name));
}

function setNavGroup(group, open) {
  const ids = {
    games: ['navGamesParent', 'navGamesSub'],
  }[group];
  if (!ids) return;
  const parent = document.getElementById(ids[0]);
  const sub = document.getElementById(ids[1]);
  if (!parent || !sub) {
    console.warn('[nav] missing group nodes', group);
    return;
  }
  parent.setAttribute('aria-expanded', open ? 'true' : 'false');
  sub.classList.toggle('is-open', !!open);
  if (group === 'games' && open) setGameGroup('invaders', true);
}

function toggleNavGroup(group) {
  const parent = document.getElementById({ games: 'navGamesParent' }[group]);
  if (!parent) return;
  const open = parent.getAttribute('aria-expanded') !== 'true';
  setNavGroup(group, open);
}

function setGameGroup(group, open) {
  if (group !== 'invaders') return;
  const sub = document.getElementById('navInvadersSub');
  if (!sub) return;
  sub.classList.toggle('is-open', !!open);
}

function applyWalls() {
  if (typeof BackgroundManager !== 'undefined' && profile) {
    BackgroundManager.migrateProfile(profile);
    BackgroundManager.applyMenu(profile);
  }
  const st = document.getElementById('menuWallStatus');
  if (st) st.textContent = profile.menuWall ? 'Custom menu image active' : 'Using default bull art';
  const menuPill = document.getElementById('menuWallPill');
  if (menuPill) menuPill.textContent = profile.menuWall ? 'CUSTOM' : 'DEFAULT';
  const gst = document.getElementById('gameWallStatus');
  if (gst && profile.bg) {
    const t = profile.bg.gameType || 'default';
    gst.textContent = 'Media mode: ' + t + (profile.bg.gameMediaName ? ' · ' + profile.bg.gameMediaName : '');
  }
  const gamePill = document.getElementById('gameWallPill');
  if (gamePill) gamePill.textContent = String(profile.bg?.gameType || 'default').toUpperCase();
}

function renderProfileSummary() {
  const runs = profile.gameRuns?.['bull-invaders'] || [];
  const best = Math.max(0, ...runs.map(run => Number(run.score || 0)));
  const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  setText('profileBestScore', best.toLocaleString());
  setText('profileRunCount', runs.length.toLocaleString());
}

function renderAll() {
  const invaderRuns = profile.gameRuns?.['bull-invaders'] || [];
  const invaderBest = Math.max(0, ...invaderRuns.map(r => Number(r.score || 0)));
  const ir = document.getElementById('drawerInvaderRuns');
  const ib = document.getElementById('drawerInvaderBest');
  if (ir) ir.textContent = invaderRuns.length;
  if (ib) ib.textContent = invaderBest.toLocaleString();
  const isg = document.getElementById('invaderStatsGrid');
  if (isg) {
    const totalKills = invaderRuns.reduce((sum, r) => sum + Number(r.kills || 0), 0);
    const clears = invaderRuns.filter(r => r.won).length;
    const previous = Number(invaderRuns.at(-2)?.score || 0), latest = Number(invaderRuns.at(-1)?.score || 0), trend = latest > previous ? '▲' : latest < previous ? '▼' : '—';
    const recent = invaderRuns.slice(-12).map(run => Number(run.score || 0)), high = Math.max(1, ...recent);
    const points = recent.map((score, index) => `${recent.length === 1 ? 50 : index / (recent.length - 1) * 100},${42 - score / high * 36}`).join(' ');
    const epochs = Array.from({ length: 10 }, (_, index) => {
      const id = index + 1, runs = invaderRuns.filter(run => Number(run.epoch || 1) === id), wins = runs.filter(run => run.won).length;
      return `<div class="epoch-stat"><span>P${id}</span><b>${runs.length}</b><small>${wins} clear${wins === 1 ? '' : 's'}</small></div>`;
    }).join('');
    isg.className = 'mission-stat-board';
    isg.innerHTML = `<div class="mission-card-grid mission-cards">${[
      ['⌁','Best score',invaderBest.toLocaleString(),`${trend} vs prior mission`], ['◉','Missions',invaderRuns.length,'completed runs'],
      ['◆','Bear ships',totalKills.toLocaleString(),'destroyed'], ['✓','Campaign clears',clears,'victories'], ['↯','Win / loss',`${clears} / ${Math.max(0, invaderRuns.length - clears)}`,'completed-run outcome']
    ].map(([icon,label,value,note]) => `<article class="terminal-card"><i>${icon}</i><small>${label}</small><b>${value}</b><p>${note}</p></article>`).join('')}</div><article class="panel terminal-poster score-chart"><div class="settings-row"><b>Recent run scores</b><span class="status-pill">LAST 12</span></div>${recent.length ? `<svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-label="Recent score trend"><polyline points="${points}"/></svg>` : '<p class="notice">Complete a run to draw your score chart.</p>'}</article><article class="panel terminal-poster"><div class="settings-row"><b>Per-EPOCH breakdown</b><span class="status-pill">RUNS / CLEARS</span></div><div class="epoch-stat-grid">${epochs}</div></article>`;
  }
  const invaderRank = document.getElementById('invaderRankList');
  if (invaderRank) invaderRank.innerHTML = invaderRuns.length ? invaderRuns.slice().sort((a,b) => b.score-a.score).slice(0,10).map((r,i) => `<div class="rank-row"><b>#${i+1}</b><div class="rank-meta"><strong>You</strong><small>Level ${r.level}/19 · ${new Date(r.ts).toLocaleDateString()}</small></div><div class="rank-dist">${Number(r.score).toLocaleString()}</div></div>`).join('') : '<p class="notice">Complete a mission to join your local board.</p>';
  applyWalls();
  renderProfileSummary();
}

// Track Data logic moved to track.js



// ===== $ANSEM unified analytics – cache-first Worker data, no browser secrets =====
let ansemLoading = false;
const ANSEM_CLIENT_CACHE = 'bbrs_ansem_analytics_v1';

function fmtUsd(n) {
  if (n == null || isNaN(n)) return '—';
  const x = Number(n);
  if (x < 0.0001) return '$' + x.toFixed(10);
  if (x < 0.01) return '$' + x.toFixed(8);
  if (x < 1) return '$' + x.toFixed(6);
  if (x < 1000) return '$' + x.toFixed(4);
  return '$' + x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtK(n) {
  if (n == null || isNaN(n)) return '—';
  const x = Number(n);
  if (x >= 1e6) return '$' + (x / 1e6).toFixed(2) + 'M';
  if (x >= 1e3) return '$' + (x / 1e3).toFixed(1) + 'K';
  return '$' + x.toFixed(0);
}
function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString();
}

function fmtDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return '—';
  const totalMinutes = Math.max(0, Math.round(Number(ms) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor(totalMinutes % 1440 / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function renderAnsemAnalytics(body, localFallback = false) {
  const data = body?.data || body || {};
  const market = data.market || {};
  const holders = data.holders || {};
  const momentum = data.momentum || {};
  const updatedAt = body?.updatedAt || data.updatedAt || Date.now();
  const partial = body?.partial === true || data.partial === true || body?.meta?.partial === true;
  const set = (id, value) => { const node = document.getElementById(id); if (node && value != null) node.textContent = value; };
  const percent = value => Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : '—';
  const momentumLabel = item => {
    const value = item && typeof item === 'object' ? Number(item.percentChange ?? item.changePercent) : Number(item);
    if (!Number.isFinite(value)) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  set('ansemTop10Concentration', percent(holders.top10Percent ?? data.top10HolderPercent));
  set('ansemHolderCount', fmtNum(holders.count ?? data.holderCount));
  set('ansemLiquidityDepth', fmtK(market.liquidityUsd ?? data.liquidityUsd));
  set('ansemPrice', fmtUsd(market.priceUsd ?? data.priceUsd));
  const change = Number(market.priceChange24h ?? market.priceChange?.h24);
  set('ansemChange', Number.isFinite(change) ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '—');
  set('ansemVolume24h', fmtK(market.volume24h ?? market.volume?.h24));
  set('ansemTransactions24h', fmtNum(market.txCount24h ?? ((market.txns?.h24?.buys || 0) + (market.txns?.h24?.sells || 0))));
  set('ansemVolumeMomentum', momentumLabel(momentum.volume));
  set('ansemTransactionMomentum', momentumLabel(momentum.transactions));
  set('ansemUpdated', new Date(updatedAt).toLocaleString());
  set('ansemFreshnessTag', partial ? 'PARTIAL' : 'CURRENT');
  set('ansemLiveStatus', partial ? 'PARTIAL' : 'CURRENT');
  const dexLink = document.getElementById('ansemDexLink');
  if (dexLink && (market.pairUrl || data.sources?.liquidity?.url)) dexLink.href = market.pairUrl || data.sources.liquidity.url;
}

async function loadAnsemData() {
  if (ansemLoading) return;
  ansemLoading = true;
  const refreshBtn = document.getElementById('ansemRefresh');
  const statusEl = document.getElementById('ansemLiveStatus');
  if (refreshBtn) refreshBtn.textContent = '…';
  if (statusEl) statusEl.textContent = 'Loading cached analytics…';
  try {
    const body = await window.BBRSApi.envelope('/api/ansem/analytics', { timeoutMs: 12_000 });
    if (!body?.data) throw new Error('Cached analytics unavailable');
    renderAnsemAnalytics(body);
    try { localStorage.setItem(ANSEM_CLIENT_CACHE, JSON.stringify(body)); } catch (_) {}
  } catch (error) {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(ANSEM_CLIENT_CACHE) || 'null'); } catch (_) {}
    if (cached?.data) renderAnsemAnalytics(cached, true);
    else if (statusEl) statusEl.textContent = 'Analytics unavailable · no last-known value';
    console.error('[analytics]', error);
    toast(cached?.data ? 'Cached analytics loaded' : '$ANSEM analytics unavailable');
  } finally {
    ansemLoading = false;
    if (refreshBtn) refreshBtn.textContent = 'Refresh';
  }
}

function initUI() {
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) homeBtn.addEventListener('click', async () => {
    try { await BBRPlatform?.leaveGame(); } catch (_) {}
    showView('home');
  });
  document.getElementById('backBtn')?.addEventListener('click', async () => {
    if (!viewHistory.length) return;
    try { if (currentView === 'invadersGame') await BBRPlatform?.leaveGame('bull-invaders'); } catch (_) {}
    const prior = viewHistory.pop() || 'home';
    showView(prior, { fromHistory: true });
  });
  const backdrop = document.getElementById('backdrop');
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  document.querySelectorAll('[data-home-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.homeAction;
    if (action === 'journey') {
      showView('profile');
      requestAnimationFrame(() => document.getElementById('startJourneyPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else if (action === 'analytics') showView('intelligence');
  }));
  document.querySelectorAll('#mobileCommunityTabs [data-mobile-view]').forEach(button => button.addEventListener('click', () => {
    showView(button.dataset.mobileView);
    const focusId = button.dataset.focusTarget;
    if (focusId) requestAnimationFrame(() => document.getElementById(focusId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }));
  document.querySelector('#mobileCommunityTabs [data-mobile-action="arcade"]')?.addEventListener('click', openArcadeDrawer);

  // Dropdown parents FIRST so a later error cannot skip them
  ['games'].forEach((group) => {
    const parentId = { games: 'navGamesParent' }[group];
    const el = document.getElementById(parentId);
    if (!el) {
      console.warn('[nav] parent missing', parentId);
      return;
    }
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleNavGroup(group);
    });
  });
  // View links only (not parents — parents have no data-view)
  document.querySelectorAll('#drawer [data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const view = btn.dataset.view;
      if (view) {
        showView(view);
        const focusId = btn.dataset.focusTarget;
        if (focusId) requestAnimationFrame(() => document.getElementById(focusId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    });
  });
  document.querySelectorAll('[data-analytics-target]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.analyticsTarget;
    document.querySelectorAll('[data-analytics-target]').forEach(peer => {
      const selected = peer === button;
      peer.classList.toggle('active', selected);
      peer.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    document.querySelectorAll('.analytics-pane').forEach(panel => {
      panel.hidden = panel.id !== id;
      panel.classList.toggle('active', panel.id === id);
    });
  }));

  document.querySelectorAll('[data-settings-view]').forEach(button => button.addEventListener('click', () => {
    const targetView = button.dataset.settingsView;
    if (targetView) showView(targetView);
  }));

  // Bull Invaders is the only arcade game in this build.
  const startInvaders = document.getElementById('startInvaders');
  if (startInvaders) startInvaders.addEventListener('click', async e => {
    e.preventDefault(); e.stopPropagation();
    try { sessionStorage.setItem('bbr_run_mode', globalThis.BBRRunMode?.mode?.() || 'ranked'); } catch (_) {}
    BackgroundManager?.armFromGesture?.(profile, 'invaders');
    await BBRPlatform.launch('bull-invaders');
  });
  // Background uploads
  document.getElementById('uploadMenuWall').addEventListener('click', () => {
    document.getElementById('menuWallFile').click();
  });
  const clearMenuWallBtn = document.getElementById('clearMenuWall');
  if (clearMenuWallBtn) clearMenuWallBtn.addEventListener('click', () => {
    BackgroundManager.clearMenu(profile, save);
    toast('Default bull art restored');
  });
  document.getElementById('menuWallFile').addEventListener('change', async e => {
    const input = e.target;
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    try {
      await BackgroundManager.setMenuImageFile(f, profile, save);
      if (typeof showView === 'function') showView('home');
      toast('Menu image applied');
      if (window.AudioManager) AudioManager.sfx.success();
    } catch (err) {
      toast(err.message || 'Upload failed');
    }
  });

  document.getElementById('uploadGameWall').addEventListener('click', () => {
    document.getElementById('gameWallFile').click();
  });
  document.getElementById('gameWallFile').addEventListener('change', async e => {
    const input = e.target;
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    try {
      await BackgroundManager.setGameImageFile(f, profile, save);
      toast('Game image/GIF applied');
    } catch (err) {
      toast(err.message || 'Upload failed');
    }
  });
  const upVid = document.getElementById('uploadGameVideo');
  if (upVid) upVid.addEventListener('click', () => document.getElementById('gameVideoFile').click());
  const gv = document.getElementById('gameVideoFile');
  if (gv) gv.addEventListener('change', async e => {
    const input = e.target;
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    try {
      await BackgroundManager.setGameVideoFile(f, profile, save);
      toast('Local video saved for game background');
    } catch (err) {
      toast(err.message || 'Video save failed');
    }
  });
  const stw = document.getElementById('saveTwitch');
  if (stw) stw.addEventListener('click', async () => {
    const url = document.getElementById('twitchUrlInput')?.value || '';
    try {
      await BackgroundManager.setTwitch(url, profile, save);
      document.getElementById('twitchStatus').textContent = 'Twitch is ready on the landing page.';
      BackgroundManager.playTwitch(profile, 'menu');
      showView('home');
      toast('Twitch opened on the landing page');
    } catch (err) {
      toast(err.message || 'Invalid Twitch URL');
    }
  });
  document.getElementById('playTwitch')?.addEventListener('click', () => {
    const ok = BackgroundManager.playTwitch(profile, 'menu');
    document.getElementById('twitchStatus').textContent = ok ? 'Twitch play command sent with sound.' : 'Twitch is still loading. Tap again in a moment.';
  });
  const restoreLandingFromTwitch = async () => {
    await BackgroundManager.clearGame(profile, save);
    const status = document.getElementById('twitchStatus');
    if (status) status.textContent = 'Twitch removed. The home screen is restored.';
    showView('home');
    toast('Landing screen restored');
  };
  ['restoreLandingFromTwitch', 'removeTwitchBackground'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', restoreLandingFromTwitch);
  });
  const fitToggle = document.getElementById('backgroundFitToggle');
  if (fitToggle) {
    fitToggle.checked = profile.bg?.fitMedia !== false;
    fitToggle.addEventListener('change', () => {
      BackgroundManager.setFitMedia(fitToggle.checked, profile, save);
      toast(fitToggle.checked ? 'Uploaded backgrounds fit to screen' : 'Uploaded backgrounds fill and crop');
    });
  }
  const youtubeInput = document.getElementById('youtubeUrlsInput');
  const youtubeRandom = document.getElementById('youtubeRandomMode');
  const youtubeStatus = document.getElementById('youtubeListStatus');
  const savedYoutubeSources = profile.bg?.youtubeSources || [];
  const youtubeSummary = (sources, random) => {
    const playlists = sources.filter(source => source.kind === 'playlist').length;
    const videos = sources.length - playlists;
    const parts = [];
    if (playlists) parts.push(`${playlists} playlist${playlists === 1 ? '' : 's'}`);
    if (videos) parts.push(`${videos} video${videos === 1 ? '' : 's'}`);
    return `${sources.length} unique source${sources.length === 1 ? '' : 's'} saved (${parts.join(', ')})${random ? ' • random playback on' : ''}.`;
  };
  if (youtubeInput) youtubeInput.value = savedYoutubeSources.map(source => BackgroundManager.sourceToUrl(source)).filter(Boolean).join('\n');
  if (youtubeRandom) youtubeRandom.checked = profile.bg?.youtubeRandom === true;
  if (youtubeStatus && savedYoutubeSources.length) youtubeStatus.textContent = youtubeSummary(savedYoutubeSources, profile.bg.youtubeRandom);
  const sy = document.getElementById('youtubePlayNow');
  if (sy) sy.addEventListener('click', async () => {
    const urls = youtubeInput?.value || '';
    try {
      const count = await BackgroundManager.setYouTubeList(urls, youtubeRandom?.checked === true, profile, save);
      if (mediaToggle) mediaToggle.checked = true;
      if (youtubeStatus) youtubeStatus.textContent = youtubeSummary(profile.bg.youtubeSources || [], youtubeRandom?.checked === true);
      BackgroundManager.armFromGesture(profile, 'menu');
      showView('home');
      toast(`${count} YouTube source${count === 1 ? '' : 's'} ready with sound`);
    } catch (err) {
      toast(err.message || 'Invalid YouTube playlist');
    }
  });
  const cg = document.getElementById('clearGameBg');
  if (cg) cg.addEventListener('click', async () => {
    await BackgroundManager.clearGame(profile, save);
    toast('Game background reset to default');
  });
  const mediaToggle = document.getElementById('mediaAudioOn');
  if (mediaToggle) {
    mediaToggle.checked = profile.bg?.mediaAudio === true;
    mediaToggle.addEventListener('change', () => {
      profile.bg = profile.bg || {};
      profile.bg.mediaAudio = mediaToggle.checked;
      save();
      toast(mediaToggle.checked ? 'Media sound enabled for your next game' : 'Media sound muted');
    });
  }
  [['invadersMediaSound','invaders']].forEach(([id,target]) => {
    document.getElementById(id)?.addEventListener('click', async e => {
      e.stopPropagation();
      const enabled = await BackgroundManager.toggleMediaAudio(profile, target);
      if (mediaToggle) mediaToggle.checked = enabled;
      toast(enabled ? 'Media sound on' : 'Media sound muted');
    });
  });
  document.getElementById('youtubeListenerToggle')?.addEventListener('click', () => BackgroundManager.toggleListening(profile));
  document.getElementById('youtubeListenerStop')?.addEventListener('click', () => BackgroundManager.stopListening());
  document.getElementById('youtubeSoundGateButton')?.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const target = document.getElementById('youtubeSoundGate')?.dataset.target || 'invaders';
    BackgroundManager.armFromGesture(profile, target);
  });

  // Track Data handled by initTrackData()

  // Reset
  document.getElementById('resetData').addEventListener('click', () => {
    if (confirm('Reset all local data?')) {
      localStorage.clear();
      location.reload();
    }
  });

  // Profile X placeholder
  
  // $ANSEM
  const ansemRefresh = document.getElementById('ansemRefresh');
  if (ansemRefresh) ansemRefresh.addEventListener('click', () => loadAnsemData());
  if (window.ProfileManager) ProfileManager.init();
  if (window.BBRRunMode) BBRRunMode.init();

  if (window.AudioManager) {
    AudioManager.loadFromProfile(profile);
    const bindAudio = () => {
      const m = document.getElementById('audioMasterOn');
      const mv = document.getElementById('audioMasterVol');
      const mo = document.getElementById('audioMusicOn');
      const so = document.getElementById('audioSfxOn');
      const hand = document.getElementById('controlHand');
      const recordRun = document.getElementById('recordRunToggle');
      const vibration = document.getElementById('vibrationOn');
      const reducedMotionToggle = document.getElementById('reducedMotionToggle');
      const colorblindPaletteToggle = document.getElementById('colorblindPaletteToggle');
      const lbl = document.getElementById('audioMasterVolLbl');
      const applyAccessibility = () => {
        document.body.classList.toggle('reduced-motion', profile.settings?.reducedMotion === true);
        document.body.classList.toggle('colorblind-safe', profile.settings?.colorblindSafe === true);
      };
      if (m) { m.checked = AudioManager.settings.masterOn; m.onchange = () => { AudioManager.settings.masterOn = m.checked; AudioManager.applyGains(); AudioManager.saveToProfile(profile); save(); }; }
      if (mv) { mv.value = Math.round(AudioManager.settings.masterVol * 100); mv.oninput = () => { AudioManager.settings.masterVol = mv.value / 100; if (lbl) lbl.textContent = mv.value + '%'; AudioManager.applyGains(); }; mv.onchange = () => { AudioManager.saveToProfile(profile); save(); }; }
      if (mo) { mo.checked = AudioManager.settings.musicOn; mo.onchange = () => { AudioManager.settings.musicOn = mo.checked; if (!mo.checked) AudioManager.stopMusic(); AudioManager.saveToProfile(profile); save(); }; }
      if (so) { so.checked = AudioManager.settings.sfxOn; so.onchange = () => { AudioManager.settings.sfxOn = so.checked; AudioManager.saveToProfile(profile); save(); }; }
      if (hand) {
        hand.value = profile.settings?.controlHand === 'right' ? 'right' : 'left';
        document.getElementById('app')?.classList.toggle('control-hand-right', hand.value === 'right');
        hand.onchange = () => {
          profile.settings.controlHand = hand.value === 'right' ? 'right' : 'left';
          document.getElementById('app')?.classList.toggle('control-hand-right', profile.settings.controlHand === 'right');
          save(); toast(`${hand.options[hand.selectedIndex].text} controls active`);
        };
      }
      if (recordRun) {
        // Recording is deliberately session-only. It starts off for every run
        // and is never restored from profile/local storage.
        window.BBRRunRecorder?.setArmed?.(false);
        recordRun.checked = false;
        const canRecord = window.BBRRunRecorder?.supported?.() === true;
        recordRun.disabled = !canRecord;
        recordRun.closest('.play-record-toggle')?.classList.toggle('is-unavailable', !canRecord);
        recordRun.onchange = () => {
          const armed = window.BBRRunRecorder?.setArmed?.(recordRun.checked) === true;
          recordRun.checked = armed;
          toast(armed ? 'Next run recording armed' : 'Run recording off');
        };
        window.addEventListener('bbrs:recording-status', event => {
          if (event.detail?.armConsumed) recordRun.checked = false;
        });
      }
      if (vibration) {
        vibration.checked = profile.settings?.vibration !== false;
        vibration.onchange = () => { profile.settings.vibration = vibration.checked; save(); if (vibration.checked) navigator.vibrate?.(18); };
      }
      if (reducedMotionToggle) {
        reducedMotionToggle.checked = profile.settings?.reducedMotion === true;
        reducedMotionToggle.onchange = () => { profile.settings.reducedMotion = reducedMotionToggle.checked; applyAccessibility(); save(); };
      }
      if (colorblindPaletteToggle) {
        colorblindPaletteToggle.checked = profile.settings?.colorblindSafe === true;
        colorblindPaletteToggle.onchange = () => { profile.settings.colorblindSafe = colorblindPaletteToggle.checked; applyAccessibility(); save(); };
      }
      applyAccessibility();
    };
    bindAudio();
  }
  if (typeof initTrackData === 'function') initTrackData();
  refreshJourney();
  renderAll();
  showView('home');
  // Landing: keep dropdowns collapsed
  if (typeof setNavGroup === 'function') {
    setNavGroup('games', false);
    setGameGroup('invaders', true);
  }
}
