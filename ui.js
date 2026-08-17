const labels = {
  home: 'Community Hub', feed: 'Feed the Bull', addBulls: 'Herd', communityGoal: 'Community Goal',
  profile: 'Profile', bullStore: 'Bull Store', settings: 'Make It Yours', imageSettings: 'Image', youtubeSettings: 'YouTube', twitchSettings: 'Twitch', audioSettings: 'Audio', help: 'Help',
  invaderStats: 'Mission Statistics', invaderLeaderboard: 'Leaderboard', invaderGoals: 'Achievements', invadersGame: 'Bull Invaders', retention: 'Progress Center', daily: 'Daily', codex: 'Boss Codex', crew: 'Crew'
};
let currentView = 'home';
const viewHistory = [];
const JOURNEY_WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const LEGACY_HERD_SHIPS = Object.freeze([
  { id: 0, name: 'Genesis Validator', tag: 'Solana-gradient starter hull.', asset: 'assets/game/bull-invader-ship.webp' },
  { id: 1, name: 'Eclipse Crown', tag: 'Dark validator armor for EPOCH 2.', asset: 'assets/ships/ship-01-dark-crown.webp' },
  { id: 2, name: 'Ledger Wraith', tag: 'Bare-metal bones. Zero wasted weight.', asset: 'assets/ships/ship-02-skeleton.webp' },
  { id: 3, name: 'Turbine Cyan', tag: 'Fast cooling channels for dense fire.', asset: 'assets/ships/ship-03-cyan.webp' },
  { id: 4, name: 'Green Runtime', tag: 'Open-circuit hull with neon proof lines.', asset: 'assets/ships/ship-04-green-xray.webp' },
  { id: 5, name: 'Phantom Drift', tag: 'Low-signature craft for silent entries.', asset: 'assets/ships/ship-05-ghost.webp' },
  { id: 6, name: 'Sunforge', tag: 'Solar-plated hull with a bright heat bloom.', asset: 'assets/ships/ship-06-gold.webp' },
  { id: 7, name: 'Lava Ledger', tag: 'Hot-state armor built for heavy lanes.', asset: 'assets/ships/ship-07-lava.webp' },
  { id: 8, name: 'Silver Stake', tag: 'Clean alloy tuned for precision.', asset: 'assets/ships/ship-08-silver.webp' },
  { id: 9, name: 'Prism Route', tag: 'Multi-path color routing through every cannon.', asset: 'assets/ships/ship-09-psychedelic.webp' },
  { id: 10, name: 'Thermal Finality', tag: 'Endgame hull forged for EPOCH 10.', asset: 'assets/ships/ship-10-thermal.webp' }
]);
const HERD_SHIPS = Object.freeze(globalThis.BBRV7?.features?.themedEpochShips
  ? [...LEGACY_HERD_SHIPS]
  : [{ id: 0, name: 'Stampede One', tag: 'One craft. Every formation.', asset: globalThis.BBRV7?.config?.playerShip || 'assets/v7/player-ship.webp' }]);

function isJourneyWallet(address) {
  return JOURNEY_WALLET_PATTERN.test(String(address || '').trim());
}

function setJourneyUnlocked(unlocked, wallet = '') {
  const active = unlocked === true;
  document.body.classList.toggle('journey-unlocked', active);
  document.body.classList.toggle('journey-locked', !active);
  document.querySelectorAll('[data-wallet-required]').forEach(node => {
    const channelBlocked = node.hasAttribute('data-google-play-store') && window.Bullion?.storeAvailable?.() === false;
    node.hidden = !active || channelBlocked;
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
  profile.nftWallet = wallet;
  save();
  setJourneyUnlocked(true, wallet);
  window.dispatchEvent(new CustomEvent('bbrs:journey-unlocked', { detail: { wallet } }));
  return true;
}

function refreshJourney() {
  const wallet = String(profile?.nftWallet || '').trim();
  setJourneyUnlocked(isJourneyWallet(wallet), wallet);
}

window.BBRSJourney = { isValid: isJourneyWallet, unlock: unlockJourney, refresh: refreshJourney };

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  const fullMessage = String(msg || '');
  const dataUtilityActive = document.getElementById('trackView')?.classList.contains('active') || document.getElementById('intelligenceView')?.classList.contains('active');
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
  if (!document.getElementById(name + 'View') && !['settings', 'intelligence'].includes(name)) name = 'home';
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
  } else if (name === 'settings') {
    document.getElementById('settingsView')?.classList.add('active');
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
  const invaderViews = ['communityGoal', 'invaderStats', 'invaderLeaderboard', 'invaderGoals', 'retention', 'daily', 'codex', 'crew', 'settings', 'imageSettings', 'youtubeSettings', 'twitchSettings', 'audioSettings', 'invadersGame'];
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
      home: 'HUB', feed: 'FEED', addBulls: 'HERD', communityGoal: 'COMMUNITY',
      profile: 'PROFILE', bullStore: 'STORE', intelligence: 'ANALYTICS', settings: 'MAKE IT YOURS', imageSettings: 'IMAGE', youtubeSettings: 'YOUTUBE', twitchSettings: 'TWITCH', audioSettings: 'AUDIO', help: 'HELP',
      invaderStats: 'MISSIONS', invaderLeaderboard: 'RANKS', invaderGoals: 'GOALS', invadersGame: 'INVADERS', retention: 'PROGRESS', daily: 'DAILY', codex: 'CODEX', crew: 'CREW'
    };
    label.textContent = map[name] || name.toUpperCase();
  }
  if (name === 'intelligence') loadAnsemData();
  if (name === 'bullStore') Bullion?.refreshBalance?.({ silent: true });
  if (name === 'profile') ProfileManager?.render?.();
  if (name === 'invaderLeaderboard') BBRLeaderboard?.load('bull-invaders', document.getElementById('invaderRankList'));
  document.querySelectorAll('#mobileCommunityTabs [data-mobile-view]').forEach(button => button.classList.toggle('active', button.dataset.mobileView === name));
  document.querySelector('#mobileCommunityTabs [data-mobile-action="arcade"]')?.classList.toggle('active', invaderViews.includes(name));
}

function setNavGroup(group, open) {
  const ids = {
    journey: ['navJourneyParent', 'navJourneySub'],
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
  const parent = document.getElementById({ journey: 'navJourneyParent', games: 'navGamesParent' }[group]);
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

function applyHerdFilter() {
  const visible = document.querySelectorAll('#herdCollectionGrid .herd-collectible').length;
  const empty = document.getElementById('herdEmptyState');
  if (empty) empty.hidden = visible !== 0;
}

function renderCommunitySurfaces() {
  const runs = profile.gameRuns?.['bull-invaders'] || [];
  const best = Math.max(0, ...runs.map(run => Number(run.score || 0)));
  const unlockedShips = globalThis.BBRV7?.features?.themedEpochShips
    ? new Set(Array.isArray(profile.unlockedShips) ? profile.unlockedShips.map(Number) : [0])
    : new Set([0]);
  const unlockedEpochs = new Set(Array.isArray(profile.unlockedEpochs) ? profile.unlockedEpochs.map(Number) : [1]);
  const streak = Math.max(0, Number(profile.streak || 0));
  const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };

  setText('homeRunsCount', runs.length.toLocaleString());
  setText('homeStreakCount', streak.toLocaleString());
  setText('homeShipsCount', unlockedShips.size.toLocaleString());
  setText('homeEpochsCount', unlockedEpochs.size.toLocaleString());
  setText('herdShipCount', unlockedShips.size.toLocaleString());
  setText('herdEpochCount', unlockedEpochs.size.toLocaleString());
  setText('herdStreakCount', streak.toLocaleString());
  setText('herdCollectionCount', `${unlockedShips.size} ship${unlockedShips.size === 1 ? '' : 's'} unlocked`);
  setText('profileBestScore', best.toLocaleString());
  setText('profileStreakCount', streak.toLocaleString());
  setText('profileShipsCount', unlockedShips.size.toLocaleString());

  const grid = document.getElementById('herdCollectionGrid');
  if (!grid) return;
  const shipCards = HERD_SHIPS.filter(ship => unlockedShips.has(ship.id)).map(ship => {
    const unlocked = true;
    const selected = Number(profile.selectedShip || 0) === ship.id;
    return `<article class="herd-collectible ${unlocked ? 'is-unlocked' : 'is-locked'} ${selected ? 'is-selected' : ''}" data-herd-kind="ship" data-herd-state="${unlocked ? 'unlocked' : 'locked'}"><div class="herd-card-art"><img src="${ship.asset}" alt="${ship.name}" loading="lazy"/></div><div class="herd-card-copy"><span class="card-chip">${unlocked ? selected ? 'ACTIVE SHIP' : 'UNLOCKED' : 'LOCKED'}</span><b>${ship.name}</b><small>${ship.tag}</small></div></article>`;
  }).join('');
  grid.innerHTML = shipCards;
  applyHerdFilter();
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
    isg.innerHTML = `<div class="retention-card-grid mission-cards">${[
      ['⌁','Best score',invaderBest.toLocaleString(),`${trend} vs prior mission`], ['◉','Missions',invaderRuns.length,'completed runs'],
      ['◆','Bear ships',totalKills.toLocaleString(),'destroyed'], ['✓','Campaign clears',clears,'victories'], ['↯','Win / loss',`${clears} / ${Math.max(0, invaderRuns.length - clears)}`,'completed-run outcome']
    ].map(([icon,label,value,note]) => `<article class="terminal-card"><i>${icon}</i><small>${label}</small><b>${value}</b><p>${note}</p></article>`).join('')}</div><article class="panel terminal-poster score-chart"><div class="settings-row"><b>Recent run scores</b><span class="status-pill">LAST 12</span></div>${recent.length ? `<svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-label="Recent score trend"><polyline points="${points}"/></svg>` : '<p class="notice">Complete a run to draw your score chart.</p>'}</article><article class="panel terminal-poster"><div class="settings-row"><b>Per-EPOCH breakdown</b><span class="status-pill">RUNS / CLEARS</span></div><div class="epoch-stat-grid">${epochs}</div></article>`;
  }
  const invaderRank = document.getElementById('invaderRankList');
  if (invaderRank) invaderRank.innerHTML = invaderRuns.length ? invaderRuns.slice().sort((a,b) => b.score-a.score).slice(0,10).map((r,i) => `<div class="rank-row"><b>#${i+1}</b><div class="rank-meta"><strong>You</strong><small>Level ${r.level}/19 · ${new Date(r.ts).toLocaleDateString()}</small></div><div class="rank-dist">${Number(r.score).toLocaleString()}</div></div>`).join('') : '<p class="notice">Complete a mission to join your local board.</p>';
  const invaderGoals = document.getElementById('invaderAchievementsList');
  if (invaderGoals) {
    const totalKills = invaderRuns.reduce((sum, r) => sum + Number(r.kills || 0), 0);
    const totalBosses = invaderRuns.reduce((sum, r) => sum + Number(r.bossesDefeated || 0), 0);
    const clears = invaderRuns.filter(r => r.won).length;
    invaderGoals.innerHTML = `<div class="achievement-grid">${[
      ['First Contact', invaderRuns.length, 1, 'Complete one mission'], ['Candle Breaker', totalKills, 100, 'Destroy 100 bear ships'],
      ['Boss Hunter', totalBosses, 19, 'Defeat 19 roster bosses'], ['Bullpen NFT Master', clears, 1, 'Clear an EPOCH']
    ].map(([name,value,target,copy]) => { const pct = Math.min(100, Number(value) / target * 100), done = pct >= 100; return `<article class="panel terminal-poster achievement-card ${done ? 'complete' : ''}"><div class="settings-row"><b>${done ? '✓' : '○'} ${name}</b><span>${Math.min(Number(value), target)}/${target}</span></div><p>${copy}</p><div class="achievement-progress"><span style="width:${pct}%"></span></div></article>`; }).join('')}</div>`;
  }

  applyWalls();
  renderCommunitySurfaces();
}

// Track Data logic moved to track.js



// ===== $ANSEM – via Worker API (no browser secrets) =====
let ansemRange = '24h';
let ansemLoading = false;
let ansemLastMarket = null;

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

async function loadAnsemData() {
  if (ansemLoading) return;
  ansemLoading = true;
  const refreshBtn = document.getElementById('ansemRefresh');
  const statusEl = document.getElementById('ansemLiveStatus');
  if (refreshBtn) refreshBtn.textContent = '…';
  if (statusEl) statusEl.textContent = 'Refreshing live data…';

  const getJson = async path => {
    const body = await window.BBRSApi.envelope(path);
    if (!body.data) throw new Error('Live data unavailable');
    return body;
  };
  const safe = value => window.BBRPlatform?.escapeHtml ? BBRPlatform.escapeHtml(value) : String(value ?? '');
  const stat = (label, value) => `<div class="stat"><small>${safe(label)}</small><b>${safe(value)}</b></div>`;
  const structureRow = (label, value) => `<div class="structure-row"><span>${safe(label)}</span><b>${safe(value)}</b></div>`;
  const structureLinkRow = (label, value, href, title) => `<div class="structure-row"><span>${safe(label)}</span><b><a class="token-address-link" href="${safe(href)}" target="_blank" rel="noopener noreferrer" title="${safe(title)}">${safe(value)}</a></b></div>`;

  let marketBody = null;
  const renderStructure = () => {
    const root = document.getElementById('ansemStructure');
    if (!root) return;
    const m = marketBody?.data || {};
    const pair = m.pairAddress ? m.pairAddress.slice(0, 6) + '…' + m.pairAddress.slice(-4) : '—';
    const mintUrl = `https://dexscreener.com/solana/${encodeURIComponent(CONFIG.ansemMint)}`;
    root.innerHTML = [
      structureLinkRow('Mint', CONFIG.ansemMint.slice(0, 7) + '…' + CONFIG.ansemMint.slice(-5), mintUrl, 'Open token on DexScreener'),
      structureRow('Quote', m.quoteSymbol || '—'),
      m.pairUrl ? structureLinkRow('Pair', pair, m.pairUrl, 'Open pair on DexScreener') : structureRow('Pair', pair),
      structureRow('Pair Created', m.pairCreatedAt ? new Date(m.pairCreatedAt).toLocaleDateString() : '—')
    ].join('');
  };

  const marketTask = getJson('/api/ansem/market').then(body => {
    marketBody = body;
    const m = body.data;
    ansemLastMarket = m;
    const changeKey = { '5m': 'm5', '1h': 'h1', '6h': 'h6', '24h': 'h24' }[ansemRange] || 'h24';
    const change = m.priceChange?.[changeKey] == null ? null : Number(m.priceChange[changeKey]);
    const transactions = m.txns?.[changeKey] || {};
    const buys = Number(transactions.buys || 0);
    const sells = Number(transactions.sells || 0);
    const total = buys + sells;
    const buyPercent = total ? Math.round(buys / total * 100) : 0;
    const volumeLiquidity = Number(m.liquidityUsd) > 0 ? Number(m.volume?.h24 || 0) / Number(m.liquidityUsd) : null;

    document.getElementById('ansemPrice').textContent = fmtUsd(m.priceUsd);
    const changeEl = document.getElementById('ansemChange');
    changeEl.textContent = change == null ? 'Change unavailable' : (change >= 0 ? '+' : '') + change.toFixed(2) + '% (' + ansemRange.toUpperCase() + ')';
    changeEl.style.color = change == null ? 'var(--muted)' : change >= 0 ? 'var(--g2)' : 'var(--danger)';
    document.getElementById('ansemUpdated').textContent = 'Updated ' + new Date(body.updatedAt || Date.now()).toLocaleTimeString() + ' · DexScreener';
    document.getElementById('ansemSnapshot').innerHTML = [
      stat('Market Cap', fmtK(m.marketCap)),
      stat('FDV', fmtK(m.fdv)),
      stat('Liquidity', fmtK(m.liquidityUsd)),
      stat('24h Volume', fmtK(m.volume?.h24)),
      stat('Volume / Liquidity', volumeLiquidity == null ? '—' : volumeLiquidity.toFixed(2) + 'x')
    ].join('');
    document.getElementById('ansemPulseLabel').textContent = ansemRange.toUpperCase();
    document.getElementById('ansemPulse').innerHTML = [
      stat('Price Change', change == null ? '—' : (change >= 0 ? '+' : '') + change.toFixed(2) + '%'),
      stat('Volume', fmtK(m.volume?.[changeKey])),
      stat('Buys', fmtNum(buys)),
      stat('Sells', fmtNum(sells))
    ].join('');
    document.getElementById('ansemPressure').innerHTML = total ? `
      <div class="flow-legend"><span>BUY ${buyPercent}%</span><span>SELL ${100 - buyPercent}%</span></div>
      <div class="bar-track"><div class="in" style="width:${buyPercent}%"></div><div class="out" style="width:${100 - buyPercent}%"></div></div>` : '';
    document.getElementById('ansemPulseNote').textContent = total < 10 ? 'Insufficient activity for a directional read.' : buyPercent >= 60 ? 'Buying activity is dominant in this window.' : buyPercent <= 40 ? 'Selling activity is dominant in this window.' : 'Buying and selling activity are balanced.';
    document.getElementById('ansemTxns').innerHTML = [['5m', 'm5'], ['1h', 'h1'], ['6h', 'h6'], ['24h', 'h24']].map(([label, key]) => {
      const values = m.txns?.[key] || {};
      return stat(label + ' Buys / Sells', (values.buys ?? '—') + ' / ' + (values.sells ?? '—'));
    }).join('');
    const dexLink = document.getElementById('ansemDexLink');
    if (dexLink && m.pairUrl) dexLink.href = m.pairUrl;
    renderStructure();
  });

  const results = await Promise.allSettled([marketTask]);
  const failures = results.filter(result => result.status === 'rejected');
  if (statusEl) statusEl.textContent = failures.length === 0 ? 'Live · DexScreener' : 'Data unavailable';
  if (failures.length) {
    console.error(...failures.map(result => result.reason));
    toast('$ANSEM market data is unavailable');
  }
  ansemLoading = false;
  if (refreshBtn) refreshBtn.textContent = 'Refresh';
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
    if (action === 'herd') showView('addBulls');
    else openArcadeDrawer();
  }));
  document.querySelectorAll('#mobileCommunityTabs [data-mobile-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.mobileView)));
  document.querySelector('#mobileCommunityTabs [data-mobile-action="arcade"]')?.addEventListener('click', openArcadeDrawer);

  // Dropdown parents FIRST so a later error cannot skip them
  ['journey', 'games'].forEach((group) => {
    const parentId = { journey: 'navJourneyParent', games: 'navGamesParent' }[group];
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
      if (view) showView(view);
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
    try {
      const dailyLaunch = sessionStorage.getItem('bbr_daily_launch') === '1';
      sessionStorage.removeItem('bbr_daily_launch');
      if (!dailyLaunch) {
        sessionStorage.setItem('bbr_run_mode', globalThis.Bullion?.mode?.() || 'ranked');
        sessionStorage.removeItem('bbr_daily_boss');
        sessionStorage.removeItem('bbr_daily_mod');
      }
    } catch (_) {}
    BackgroundManager?.armFromGesture?.(profile, 'invaders');
    await BBRPlatform.launch('bull-invaders');
  });
  // Feed the Bull
  document.getElementById('copyWallet').addEventListener('click', () => {
    navigator.clipboard.writeText(CONFIG.feedWallet).then(() => toast('Wallet copied'));
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
    if (status) status.textContent = 'Twitch removed. The community landing screen is restored.';
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
  document.querySelectorAll('#ansemRangeTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#ansemRangeTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ansemRange = tab.dataset.range;
      loadAnsemData();
    });
  });

  
  const ansemRefresh = document.getElementById('ansemRefresh');
  if (ansemRefresh) ansemRefresh.addEventListener('click', () => loadAnsemData());
  if (window.ProfileManager) ProfileManager.init();
  if (window.Bullion) Bullion.init();

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
    setNavGroup('journey', false);
    setNavGroup('games', false);
    setGameGroup('invaders', true);
  }
}


/* v5.9 retention view hooks */
(function () {
  const _show = typeof showView === 'function' ? showView : null;
  if (!_show) return;
  window.showView = function (name) {
    const result = _show.apply(this, arguments);
    try {
      if (name === 'retention') BBRRetentionCenter?.render(document.getElementById('retentionRoot'));
      if (name === 'daily') BBRDaily?.renderPanel(document.getElementById('dailyRoot'));
      if (name === 'codex') BBRCodex?.render(document.getElementById('codexRoot'));
      if (name === 'crew') BBRCrews?.render(document.getElementById('crewRoot'));
      if (name === 'streak') BBRStreak?.render(document.getElementById('streakRoot'), { streak_count: 0 });
    } catch (e) { console.warn(e); }
    return result;
  };
})();
