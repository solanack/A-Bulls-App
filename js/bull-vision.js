/* A Bulls App Bull Vision — public read-only token/wallet reconstruction client. */
(function (global) {
  'use strict';

  const byId = id => document.getElementById(id);
  const isAddress = value => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || '').trim());
  const state = { mode: 'vision', last: null };

  function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const sign = number < 0 ? '-' : '';
    const abs = Math.abs(number);
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(2)}`;
  }

  function duration(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n < 60) return `${Math.round(n)}s`;
    if (n < 3600) return `${Math.round(n / 60)}m`;
    if (n < 86400) return `${(n / 3600).toFixed(1)}h`;
    return `${(n / 86400).toFixed(1)}d`;
  }

  function serviceBase() {
    const configured = String(global.CONFIG?.bullVisionBase || '').trim();
    const stored = String(localStorage.getItem('abulls_bull_vision_base') || '').trim();
    return (configured || stored).replace(/\/+$/, '');
  }

  function clear(node) {
    while (node?.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function metric(label, value) {
    const card = el('article', 'bull-vision-metric');
    card.append(el('small', '', label), el('strong', '', value));
    return card;
  }

  function sectionTitle(text, accent) {
    const title = el('div', 'bull-vision-section-title');
    title.append(el('small', accent || '', text));
    return title;
  }

  function injectStyles() {
    if (byId('bullVisionStyles')) return;
    const style = document.createElement('style');
    style.id = 'bullVisionStyles';
    style.textContent = `
      #bullVisionPanel{display:grid;gap:14px}.bull-vision-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.bull-vision-head h3{margin:0;font-size:20px}.bull-vision-status{font-size:10px;font-weight:900;letter-spacing:.12em;color:var(--g2)}
      .bull-vision-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:4px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025)}.bull-vision-modes button{min-height:42px;border:0;border-radius:10px;background:transparent;color:var(--muted);font:850 10px/1.1 inherit;letter-spacing:.08em;text-transform:uppercase}.bull-vision-modes button.active{background:var(--g2);color:#050608}
      .bull-vision-inputs{display:grid;grid-template-columns:1fr;gap:8px}.bull-vision-inputs .input{min-width:0}.bull-vision-inputs button{min-height:48px}.bull-vision-result{display:grid;gap:14px}.bull-vision-token-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.bull-vision-token-row div{display:grid;gap:3px}.bull-vision-token-row small{color:var(--muted);font-size:10px;letter-spacing:.12em}.bull-vision-token-row strong{font-size:22px}.bull-vision-token-row img{width:54px;height:54px;border-radius:14px;object-fit:cover}
      .bull-vision-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.bull-vision-metric{display:grid;gap:5px;min-width:0;padding:12px;border:1px solid var(--line);border-radius:13px;background:rgba(255,255,255,.025)}.bull-vision-metric small{color:var(--muted);font-size:9px;font-weight:850;letter-spacing:.1em}.bull-vision-metric strong{font-size:16px;overflow-wrap:anywhere}.bull-vision-two-col,.bull-vision-scenario-grid,.bull-vision-compare-grid{display:grid;gap:10px}.bull-vision-card{display:grid;gap:12px;padding:14px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.025)}.bull-vision-section-title small{font-size:10px;font-weight:900;letter-spacing:.14em}.bull-vision-green{color:var(--g2)}.bull-vision-cyan{color:var(--tg-cyan,var(--g2))}.bull-vision-purple{color:var(--tg-purple,var(--g))}.bull-vision-gold{color:#f5d873}.bull-vision-autopsy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.bull-vision-autopsy-grid .bull-vision-metric{padding:9px}.bull-vision-signal-list{display:grid;gap:8px}.bull-vision-signal{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:12px}.bull-vision-signal div{display:flex;justify-content:space-between;gap:8px}.bull-vision-signal small{text-transform:uppercase;color:var(--muted)}.bull-vision-signal p,.bull-vision-card p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.bull-vision-actions{display:flex;flex-wrap:wrap;gap:8px}.bull-vision-actions a{text-decoration:none;display:inline-flex;align-items:center}.bull-vision-scenario-pnl{font-size:25px}.bull-vision-positive{color:var(--g2)}.bull-vision-negative{color:#ff718b}.bull-vision-wallet{font:750 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}.bull-vision-winner{border-color:var(--g2)!important;box-shadow:0 0 24px color-mix(in srgb,var(--g2) 15%,transparent)}.bull-vision-loading{padding:25px 10px;text-align:center;color:var(--muted);font-size:11px;font-weight:850;letter-spacing:.12em}
      @media(min-width:700px){.bull-vision-inputs{grid-template-columns:1fr 1fr auto}.bull-vision-inputs.is-compare{grid-template-columns:1fr 1fr 1fr auto}.bull-vision-metric-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.bull-vision-two-col,.bull-vision-compare-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bull-vision-scenario-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
    document.head.append(style);
  }

  function injectPanel() {
    if (byId('bullVisionPanel')) return true;
    const switcher = document.querySelector('#intelligencePanel .analytics-switch');
    const hub = document.querySelector('#intelligencePanel .intelligence-hub');
    if (!switcher || !hub) return false;

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.type = 'button';
    tab.role = 'tab';
    tab.setAttribute('aria-selected', 'false');
    tab.dataset.analyticsTarget = 'bullVisionPanel';
    tab.textContent = 'Bull Vision';
    tab.addEventListener('click', () => openPanel());
    switcher.append(tab);

    const panel = document.createElement('section');
    panel.className = 'analytics-pane nft-subsection';
    panel.id = 'bullVisionPanel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="bull-vision-head"><h3>Bull Vision</h3><span class="bull-vision-status" id="bullVisionServiceStatus">CONNECTING</span></div>
      <div class="bull-vision-modes" role="tablist" aria-label="Bull Vision modes">
        <button type="button" class="active" data-bull-vision-mode="vision">Trade Autopsy</button>
        <button type="button" data-bull-vision-mode="what-if">What If</button>
        <button type="button" data-bull-vision-mode="compare">Wallet vs Wallet</button>
      </div>
      <div class="bull-vision-inputs" id="bullVisionInputs">
        <input class="input" id="bullVisionMint" placeholder="Token mint" autocomplete="off" spellcheck="false" aria-label="Solana token mint"/>
        <input class="input" id="bullVisionWalletA" placeholder="Public wallet" autocomplete="off" spellcheck="false" aria-label="Public Solana wallet"/>
        <input class="input" id="bullVisionWalletB" placeholder="Wallet B" autocomplete="off" spellcheck="false" aria-label="Second public Solana wallet" hidden/>
        <button class="primary" id="bullVisionRun" type="button">RUN BULL VISION</button>
      </div>
      <div class="bull-vision-result" id="bullVisionResult" aria-live="polite"></div>`;
    hub.append(panel);
    return true;
  }

  function openPanel() {
    document.querySelectorAll('#intelligencePanel .analytics-switch .tab').forEach(button => {
      const active = button.dataset.analyticsTarget === 'bullVisionPanel';
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#intelligencePanel .analytics-pane').forEach(panel => {
      const active = panel.id === 'bullVisionPanel';
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  }

  async function request(path) {
    const base = serviceBase();
    if (!base) throw new Error('Bull Vision is ready in the app, but its reconstruction service still needs to be connected.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300000);
    try {
      const response = await fetch(base + path, { cache: 'no-store', signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.error) throw new Error(body?.error || `Bull Vision returned ${response.status}`);
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  function renderMetrics(root, metrics) {
    const grid = el('div', 'bull-vision-metric-grid');
    [
      ['FINAL PNL', money(metrics?.finalPnlUsd)], ['PEAK PNL', money(metrics?.peakPnlUsd)],
      ['MAX DRAWDOWN', money(metrics?.maxDrawdownUsd)], ['HOLD SPAN', duration(metrics?.holdSpanSec)],
      ['BOUGHT', money(metrics?.boughtUsd)], ['SOLD', money(metrics?.soldUsd)],
      ['BUYS', Number(metrics?.buys || 0).toLocaleString()], ['SELLS', Number(metrics?.sells || 0).toLocaleString()]
    ].forEach(([label, value]) => grid.append(metric(label, value)));
    root.append(grid);
  }

  function renderVision(body) {
    const root = byId('bullVisionResult');
    clear(root);
    const vision = body?.vision;
    if (!vision) return;
    const token = el('div', 'bull-vision-token-row');
    const identity = el('div');
    identity.append(el('small', '', body?.token?.name || 'TOKEN'), el('strong', '', body?.token?.symbol || 'BULL VISION'));
    token.append(identity);
    if (body?.token?.image) {
      const img = document.createElement('img');
      img.src = body.token.image; img.alt = ''; img.loading = 'lazy'; token.append(img);
    }
    root.append(token);
    renderMetrics(root, vision.metrics);

    const two = el('div', 'bull-vision-two-col');
    const autopsy = el('section', 'bull-vision-card');
    autopsy.append(sectionTitle('TRADE AUTOPSY', 'bull-vision-green'));
    const autopsyGrid = el('div', 'bull-vision-autopsy-grid');
    autopsyGrid.append(metric('ENTRY MCAP', money(vision.metrics?.entryMarketCapUsd)), metric('PEAK PNL', money(vision.autopsy?.peak?.pnlUsd)), metric('EXIT MCAP', money(vision.metrics?.exitMarketCapUsd)));
    autopsy.append(autopsyGrid);

    const signals = el('section', 'bull-vision-card');
    signals.append(sectionTitle('OBSERVED SIGNALS', 'bull-vision-cyan'));
    const signalList = el('div', 'bull-vision-signal-list');
    (vision.signals || []).forEach(signal => {
      const row = el('article', 'bull-vision-signal');
      const head = el('div'); head.append(el('b', '', signal.label), el('small', '', signal.strength));
      row.append(head, el('p', '', signal.detail)); signalList.append(row);
    });
    if (!signalList.childElementCount) signalList.append(el('p', 'notice', 'No strong pattern was needed for this replay.'));
    signals.append(signalList); two.append(autopsy, signals); root.append(two);

    const actions = el('div', 'bull-vision-actions');
    const base = serviceBase();
    if (base && isAddress(body?.mint) && isAddress(body?.wallet)) {
      const replay = document.createElement('a');
      replay.className = 'primary'; replay.target = '_blank'; replay.rel = 'noopener noreferrer';
      replay.href = `${base}/bull-vision/replay?mint=${encodeURIComponent(body.mint)}&wallet=${encodeURIComponent(body.wallet)}`;
      replay.textContent = 'CINEMATIC REPLAY / TRADE MOVIE ↗'; actions.append(replay);
    }
    const life = el('button', 'secondary', 'USE SIGNALS IN LIFE');
    life.type = 'button';
    life.addEventListener('click', () => {
      try {
        sessionStorage.setItem('abulls_bull_vision_life', JSON.stringify({ wallet: body.wallet, mint: body.mint, observed: { ...vision.metrics, signals: vision.signals || [] } }));
        global.dispatchEvent(new CustomEvent('abulls:bull-vision-life'));
        global.toast?.('Bull Vision signals available to LIFE');
      } catch (_) {}
    });
    actions.append(life); root.append(actions);
  }

  function renderScenarios(body) {
    const root = byId('bullVisionResult'); clear(root); root.append(sectionTitle('HISTORICAL WHAT IF', 'bull-vision-purple'));
    const grid = el('div', 'bull-vision-scenario-grid');
    (body?.scenarios || []).forEach(scenario => {
      const card = el('article', 'bull-vision-card');
      card.append(el('small', '', scenario.label), el('strong', 'bull-vision-scenario-pnl', money(scenario.pnlUsd)));
      const difference = Number(scenario.differenceUsd || 0);
      card.append(el('b', difference >= 0 ? 'bull-vision-positive' : 'bull-vision-negative', difference === 0 ? 'Observed path' : `${difference > 0 ? '+' : ''}${money(difference)} vs actual`));
      card.append(el('p', '', scenario.detail)); grid.append(card);
    });
    root.append(grid);
  }

  function renderCompare(body) {
    const root = byId('bullVisionResult'); clear(root); root.append(sectionTitle('WALLET VS WALLET', 'bull-vision-gold'));
    if (body?.comparison?.summary) root.append(el('h3', '', body.comparison.summary));
    const grid = el('div', 'bull-vision-compare-grid');
    [['a', body?.a], ['b', body?.b]].forEach(([key, side]) => {
      if (!side?.vision) return;
      const card = el('section', `bull-vision-card ${body?.comparison?.winner === key ? 'bull-vision-winner' : ''}`);
      card.append(el('small', '', `WALLET ${String(key).toUpperCase()}`), el('b', 'bull-vision-wallet', `${side.wallet.slice(0, 6)}…${side.wallet.slice(-5)}`));
      renderMetrics(card, side.vision.metrics); grid.append(card);
    });
    root.append(grid);
  }

  async function run() {
    const mint = String(byId('bullVisionMint')?.value || '').trim();
    const walletA = String(byId('bullVisionWalletA')?.value || '').trim();
    const walletB = String(byId('bullVisionWalletB')?.value || '').trim();
    const button = byId('bullVisionRun'); const status = byId('bullVisionServiceStatus'); const root = byId('bullVisionResult');
    if (!isAddress(mint) || !isAddress(walletA) || (state.mode === 'compare' && !isAddress(walletB))) { global.toast?.('Enter valid public Solana addresses'); return; }
    clear(root); root.append(el('div', 'bull-vision-loading', 'REBUILDING PUBLIC HISTORY…'));
    if (button) button.disabled = true; if (status) status.textContent = 'WORKING';
    try {
      let body;
      if (state.mode === 'compare') { body = await request(`/api/bull-vision/compare?mint=${encodeURIComponent(mint)}&walletA=${encodeURIComponent(walletA)}&walletB=${encodeURIComponent(walletB)}`); renderCompare(body); }
      else if (state.mode === 'what-if') { body = await request(`/api/bull-vision/what-if?mint=${encodeURIComponent(mint)}&wallet=${encodeURIComponent(walletA)}`); renderScenarios(body); }
      else { body = await request(`/api/bull-vision?mint=${encodeURIComponent(mint)}&wallet=${encodeURIComponent(walletA)}`); renderVision(body); }
      state.last = body; if (status) status.textContent = 'CURRENT';
    } catch (error) {
      clear(root); root.append(el('p', 'notice error', error?.message || 'Bull Vision unavailable.')); if (status) status.textContent = 'OFFLINE';
    } finally { if (button) button.disabled = false; }
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-bull-vision-mode]').forEach(button => {
      const active = button.dataset.bullVisionMode === mode; button.classList.toggle('active', active); button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const walletB = byId('bullVisionWalletB'); if (walletB) walletB.hidden = mode !== 'compare';
    const inputs = byId('bullVisionInputs'); if (inputs) inputs.classList.toggle('is-compare', mode === 'compare');
    const runButton = byId('bullVisionRun'); if (runButton) runButton.textContent = mode === 'compare' ? 'COMPARE' : mode === 'what-if' ? 'SIMULATE HISTORY' : 'RUN BULL VISION';
    clear(byId('bullVisionResult'));
  }

  function init() {
    injectStyles();
    if (!injectPanel()) return;
    document.querySelectorAll('[data-bull-vision-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.bullVisionMode || 'vision')));
    byId('bullVisionRun')?.addEventListener('click', run);
    [byId('bullVisionMint'), byId('bullVisionWalletA'), byId('bullVisionWalletB')].forEach(input => input?.addEventListener('keydown', event => { if (event.key === 'Enter') run(); }));
    const savedWallet = String(global.profile?.publicWallet || '').trim();
    if (isAddress(savedWallet) && byId('bullVisionWalletA') && !byId('bullVisionWalletA').value) byId('bullVisionWalletA').value = savedWallet;
    const status = byId('bullVisionServiceStatus'); if (status) status.textContent = serviceBase() ? 'READY' : 'NEEDS SERVICE';
    setMode('vision');
  }

  global.BBRBullVision = Object.freeze({ init, run, setMode, openPanel, serviceBase });
})(window);
