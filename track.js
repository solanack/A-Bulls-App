/* Track Data — deep, read-only Solana + $ANSEM wallet intelligence. */
(function (global) {
  'use strict';

  const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const RANGE_LABELS = Object.freeze({ '24h': '24 hours', '7d': '7 days', '30d': '30 days', '90d': '90 days', all: 'available history' });
  const WALLET_SESSION_CACHE_PREFIX = 'bbrs_wallet_analysis_v2:';
  const WALLET_SESSION_MAX_AGE = 15 * 60_000;
  const WALLET_REFRESH_PREFIX = 'bbrs_wallet_refreshed_v2:';
  const state = {
    address: null,
    range: '24h',
    requestId: 0,
    abort: null,
    loading: false,
    overview: null,
    activity: null
  };

  const el = id => document.getElementById(id);
  const safe = value => global.BBRPlatform?.escapeHtml ? BBRPlatform.escapeHtml(value) : String(value ?? '');
  const fmtNum = (value, digits = 0) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toLocaleString(undefined, { maximumFractionDigits: digits });
  };
  const fmtSol = value => Number.isFinite(Number(value)) ? fmtNum(value, 6) + ' SOL' : '—';
  const fmtUsd = value => Number.isFinite(Number(value))
    ? Number(value).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: Number(value) < 1 ? 4 : 2 })
    : '—';
  const fmtToken = value => Number.isFinite(Number(value)) ? fmtNum(value, 6) : '—';
  const shortAddr = value => {
    const text = String(value || '');
    return text.length > 12 ? text.slice(0, 6) + '…' + text.slice(-5) : text || '—';
  };
  const dexTokenUrl = mint => isValidSolanaAddress(mint)
    ? `https://dexscreener.com/solana/${encodeURIComponent(String(mint))}`
    : null;
  const setText = (id, value) => { const node = el(id); if (node) node.textContent = value; };
  const metric = (label, value, sub = '') =>
    `<div class="stat"><small>${safe(label)}</small><b>${safe(value)}</b>${sub ? `<em>${safe(sub)}</em>` : ''}</div>`;

  const walletCacheKey = address => WALLET_SESSION_CACHE_PREFIX + String(address || '').trim();
  function readWalletSession(address) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(walletCacheKey(address)) || 'null');
      if (!cached || cached.address !== address || Date.now() - Number(cached.savedAt || 0) > WALLET_SESSION_MAX_AGE) return null;
      return cached;
    } catch (_) { return null; }
  }
  function writeWalletSession(address) {
    if (!address || (!state.overview && !state.activity)) return;
    try { sessionStorage.setItem(walletCacheKey(address), JSON.stringify({ address, range: state.range, overview: state.overview, activity: state.activity, savedAt: Date.now() })); } catch (_) {}
  }
  function removeWalletSession(address) {
    try {
      if (address) {
        sessionStorage.removeItem(walletCacheKey(address));
        sessionStorage.removeItem(WALLET_REFRESH_PREFIX + address);
      }
    } catch (_) {}
  }

  function isValidSolanaAddress(input) {
    const text = String(input || '').trim();
    if (text.length < 32 || text.length > 44) return false;
    try {
      let bytes = [0];
      for (const char of text) {
        let carry = BASE58.indexOf(char);
        if (carry < 0) return false;
        for (let index = 0; index < bytes.length; index++) {
          carry += bytes[index] * 58;
          bytes[index] = carry & 0xff;
          carry >>= 8;
        }
        while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
      }
      for (let index = 0; index < text.length && text[index] === '1'; index++) bytes.push(0);
      return bytes.reverse().length === 32;
    } catch (_) { return false; }
  }

  async function postJson(path, body, signal) {
    return global.BBRSApi.post(path, body, { signal });
  }

  function renderOverview(data) {
    state.overview = data;

    const value = data.totalUsdValue;
    const ansem = data.ansemHolding || {};
    el('trackSnapshot').innerHTML = [
      metric('SOL Balance', fmtSol(data.solBalance)),
      metric('Portfolio Value', fmtUsd(value), data.pricedHoldingCount != null ? `${data.pricedHoldingCount} priced assets` : ''),
      metric('Token Accounts', fmtNum(data.tokenAccountCount), `${fmtNum(data.token2022AccountCount || 0)} Token-2022`),
      metric('Unique Tokens', fmtNum(data.uniqueTokenCount)),
      metric('NFTs Detected', fmtNum(data.nftCount || 0)),
      metric('$ANSEM Balance', fmtToken(ansem.balance || 0), fmtUsd(ansem.usdValue)),
      metric('Largest Holding', Number.isFinite(Number(data.topHoldingPercent)) ? fmtNum(data.topHoldingPercent, 1) + '%' : '—', 'of priced portfolio'),
      metric('Unpriced Assets', fmtNum(data.unpricedHoldingCount || 0))
    ].join('');

    const holdings = Array.isArray(data.holdings) ? data.holdings : [];
    el('trackHoldings').innerHTML = holdings.length
      ? '<h3 class="mini-heading">Largest Holdings</h3>' + holdings.slice(0, 12).map(item => {
          const href = dexTokenUrl(item.mint);
          const open = href ? `<a class="hold-row" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Open ${safe(item.symbol || 'token')} on DexScreener">` : '<div class="hold-row">';
          const close = href ? '</a>' : '</div>';
          return `${open}
            <div class="left"><span class="sym">${safe(item.symbol || 'TOKEN')}</span><span class="mint">${safe(shortAddr(item.mint))}</span></div>
            <div class="right"><b>${safe(fmtToken(item.balance))}</b><small>${safe(fmtUsd(item.usdValue))}</small></div>
          ${close}`;
        }).join('')
      : '<p class="notice">No non-zero token holdings returned.</p>';

    const rent = data.rent || {};
    el('trackRent').innerHTML = [
      metric('Empty Accounts', fmtNum(rent.emptyAccountCount || 0)),
      metric('Estimated Locked Rent', fmtSol(rent.reclaimableSol || 0)),
      metric('Classic SPL', fmtNum(rent.classicEmptyCount || 0)),
      metric('Token-2022', fmtNum(rent.token2022EmptyCount || 0))
    ].join('');
    const rentTotal = el('rentSolAmount');
    if (rentTotal) rentTotal.textContent = fmtSol(rent.reclaimableSol || 0);
  }

  function renderFlow(data) {
    const flow = data.flow || {};
    const inCount = Number(flow.transferInCount || 0);
    const outCount = Number(flow.transferOutCount || 0);
    const totalCount = inCount + outCount;
    const inPercent = totalCount ? Math.round(inCount / totalCount * 100) : 50;
    el('trackFlowMetrics').innerHTML = [
      metric('SOL In', fmtSol(flow.solIn || 0)),
      metric('SOL Out', fmtSol(flow.solOut || 0)),
      metric('Net SOL', fmtSol(flow.solNet || 0)),
      metric('Inbound Transfers', fmtNum(inCount)),
      metric('Outbound Transfers', fmtNum(outCount)),
      metric('Tokens Touched', fmtNum(data.trading?.uniqueMints || 0))
    ].join('');
    el('trackFlow').innerHTML = `
      <div class="flow-legend"><span>IN ${inPercent}%</span><span>OUT ${100 - inPercent}%</span></div>
      <div class="bar-track" aria-label="Inbound versus outbound transfer count">
        <div class="in" style="width:${inPercent}%"></div>
        <div class="out" style="width:${100 - inPercent}%"></div>
      </div>
      <div class="flow-list">${(data.topFlows || []).slice(0, 10).map(item => `
        <div><span>${dexTokenUrl(item.mint) ? `<a class="token-address-link" href="${dexTokenUrl(item.mint)}" target="_blank" rel="noopener noreferrer">${safe(item.symbol || shortAddr(item.mint))}</a>` : safe(item.symbol || shortAddr(item.mint))}</span><b class="${Number(item.net || 0) >= 0 ? 'positive' : 'negative'}">${Number(item.net || 0) >= 0 ? '+' : ''}${safe(fmtToken(item.net || 0))}</b></div>
      `).join('') || '<p class="notice">No decoded token movement in this range.</p>'}</div>`;
  }

  function renderActivity(data) {
    state.activity = data;
    const ansem = data.ansem || {};
    el('trackAnsem').innerHTML = [
      metric('$ANSEM Received', fmtToken(ansem.received || 0)),
      metric('$ANSEM Sent', fmtToken(ansem.sent || 0)),
      metric('Net $ANSEM', fmtToken(ansem.net || 0)),
      metric('Total $ANSEM Flow', fmtToken(ansem.volume || 0)),
      metric('Receive Events', fmtNum(ansem.receiveTxs || 0)),
      metric('Send Events', fmtNum(ansem.sendTxs || 0))
    ].join('');
    setText('trackAnsemNote', ansem.volume
      ? `Decoded balance changes across ${data.signaturesAnalyzed || 0} loaded transactions.`
      : 'No decoded $ANSEM balance changes appeared in the loaded range.');

    const trading = data.trading || {};
    const failureRate = data.signaturesAnalyzed ? Number(data.failedCount || 0) / data.signaturesAnalyzed * 100 : 0;
    el('trackBehavior').innerHTML = [
      metric('Transactions', fmtNum(data.signaturesAnalyzed || 0), data.historyComplete ? 'range covered' : 'partial coverage'),
      metric('Success Rate', fmtNum(100 - failureRate, 1) + '%'),
      metric('Swaps Detected', fmtNum(trading.swapCount || 0)),
      metric('Active Days', fmtNum(trading.activeDays || 0)),
      metric('Tx / Active Day', fmtNum(trading.transactionsPerActiveDay || 0, 1)),
      metric('Busiest Day', trading.busiestWeekday || '—'),
      metric('Busiest Hour', trading.busiestHour != null ? String(trading.busiestHour).padStart(2, '0') + ':00 UTC' : '—'),
      metric('Unique Mints', fmtNum(trading.uniqueMints || 0))
    ].join('');
    el('trackFees').innerHTML = [
      metric('Total Network Fees', fmtSol(data.feesSol || 0)),
      metric('Average Fee', fmtSol(data.signaturesAnalyzed ? Number(data.feesSol || 0) / data.signaturesAnalyzed : 0)),
      metric('Successful', fmtNum(data.successCount || 0)),
      metric('Failed', fmtNum(data.failedCount || 0))
    ].join('');

    renderFlow(data);
    renderTransactions(data.recent || []);
  }

  function renderTransactions(recent) {
    const root = el('trackFeed');
    if (!recent.length) {
      root.innerHTML = '<p class="notice">No decoded transactions landed in this range.</p>';
      return;
    }
    root.innerHTML = recent.slice(0, 50).map(tx => {
      const time = Number(tx.blockTime || tx.timestamp || 0);
      const when = time ? new Date(time * 1000).toLocaleString() : 'Timestamp unavailable';
      return `<article class="tx-row">
        <div class="tx-title"><b>${safe(tx.type || (tx.err ? 'Failed' : 'Transaction'))}</b><span class="${tx.err ? 'negative' : 'positive'}">${tx.err ? 'FAILED' : 'SUCCESS'}</span></div>
        <p>${safe(tx.summary || 'Confirmed Solana activity')}</p>
        <div class="meta">${safe(when)} · fee ${safe(fmtSol(tx.feeSol || 0))}</div>
        <a href="https://solscan.io/tx/${encodeURIComponent(tx.signature || '')}" target="_blank" rel="noopener noreferrer">View on Solscan ↗</a>
      </article>`;
    }).join('');
  }

  function clearResults(options = {}) {
    const priorAddress = state.address || String(profile?.nftWallet || '').trim();
    state.overview = null;
    state.activity = null;
    state.address = null;
    ['trackSnapshot', 'trackHoldings', 'trackFlowMetrics', 'trackFlow', 'trackAnsem', 'trackBehavior', 'trackFees', 'trackRent'].forEach(id => {
      const node = el(id); if (node) node.innerHTML = '';
    });
    if (el('trackFeed')) el('trackFeed').innerHTML = '<p class="notice">No transactions loaded.</p>';
    setText('trackAnsemNote', 'Load a wallet to inspect its $ANSEM transfers.');
    if (options.includeNfts) global.ProfileManager?.clearNftResults?.(priorAddress);
    if (options.removeCache) removeWalletSession(priorAddress);
  }

  function openIntelligenceResults() {
    if (typeof global.showView === 'function') global.showView('intelligence', { walletResults: true });
    ['intelligencePanel', 'nftAnalysisPanel', 'bullIntelligencePanel'].forEach(id => {
      const panel = el(id); if (panel instanceof HTMLDetailsElement) panel.open = true;
    });
    document.body.dataset.walletDataLoaded = 'true';
    const views = el('views'); if (views) views.scrollTop = 0;
  }

  function restoreCachedWallet(address) {
    const cached = readWalletSession(address);
    if (!cached) return false;
    state.address = address;
    state.range = RANGE_LABELS[cached.range] ? cached.range : '24h';
    document.querySelectorAll('#trackRangeTabs .tab').forEach(tab => tab.classList.toggle('active', tab.dataset.range === state.range));
    if (cached.overview) renderOverview(cached.overview);
    if (cached.activity) renderActivity(cached.activity);
    setText('trackLiveStatus', 'Restored');
    setText('trackPhase', `Restored the latest ${RANGE_LABELS[state.range]} wallet analysis.`);
    document.body.dataset.walletDataLoaded = 'true';
    return Boolean(cached.overview || cached.activity);
  }

  async function analyzeWallet(input, options = {}) {
    const address = String(input || el('walletInput')?.value || '').trim();
    if (!isValidSolanaAddress(address)) {
      setText('trackPhase', 'Enter a valid 32-byte Base58 Solana address.');
      setText('journeyStatus', 'Enter a valid public Solana wallet address.');
      global.toast?.('Enter a valid Solana address');
      return;
    }
    const previousAddress = String(state.address || profile?.nftWallet || '').trim();
    if (isValidSolanaAddress(previousAddress) && previousAddress !== address) clearResults({ includeNfts: true });
    global.BBRSJourney?.unlock(address);
    const analyzeButton = el('trackAnalyze');
    if (analyzeButton && options.silent !== true) { analyzeButton.disabled = true; analyzeButton.textContent = 'ANALYZING…'; }
    state.abort?.abort();
    const controller = new AbortController();
    const requestId = ++state.requestId;
    state.abort = controller;
    state.address = address;
    state.loading = true;
    setText('trackPhase', 'Loading live portfolio and decoded history in parallel…');
    setText('trackLiveStatus', 'Loading');

    const errors = [];
    const overviewTask = postJson('/api/wallet/overview', { address }, controller.signal)
      .then(data => { if (requestId === state.requestId) { renderOverview(data); writeWalletSession(address); } })
      .catch(error => { if (error.name !== 'AbortError') errors.push('Portfolio: ' + error.message); });
    const activityTask = postJson('/api/wallet/activity', { address, range: state.range, limit: 100 }, controller.signal)
      .then(data => { if (requestId === state.requestId) { renderActivity(data); writeWalletSession(address); } })
      .catch(error => { if (error.name !== 'AbortError') errors.push('Activity: ' + error.message); });
    const bullPenTask = global.BBRV7?.features?.bullpenNftCosmetics === true && global.ProfileManager?.analyzeNfts
      ? global.ProfileManager.analyzeNfts(address, { force: options.forceNfts === true, silent: options.silent === true, open: true }).catch(error => { if (error.name !== 'AbortError') errors.push('Bull Pen: ' + error.message); })
      : Promise.resolve();

    await Promise.all([overviewTask, activityTask, bullPenTask]);
    if (requestId !== state.requestId) return;
    state.loading = false;
    if (analyzeButton && options.silent !== true) { analyzeButton.disabled = false; analyzeButton.textContent = 'ANALYZE WALLET'; }
    if (errors.length === 3) {
      setText('trackPhase', errors.join(' · '));
      setText('trackLiveStatus', 'Unavailable');
      global.toast?.('Wallet analyzer unavailable');
      return;
    }
    writeWalletSession(address);
    setText('trackLiveStatus', errors.length ? 'Partial live data' : 'Live · Helius');
    setText('trackPhase', errors.length
      ? `Partial result for ${RANGE_LABELS[state.range]}. ${errors.join(' · ')}`
      : `Analysis complete for ${RANGE_LABELS[state.range]}.`);
    global.toast?.(errors.length ? 'Partial wallet data loaded' : 'Wallet analysis updated');
    if (options.navigate !== false) openIntelligenceResults();
    global.dispatchEvent?.(new CustomEvent('bbrs:wallet-analysis-complete', { detail: { address, partial: errors.length > 0 } }));
  }

  function restoreSavedWalletOnce() {
    const address = String(profile?.nftWallet || '').trim();
    if (!isValidSolanaAddress(address)) return;
    if (el('walletInput')) el('walletInput').value = address;
    const restored = restoreCachedWallet(address);
    let refreshed = false;
    try { refreshed = sessionStorage.getItem(WALLET_REFRESH_PREFIX + address) === '1'; } catch (_) {}
    if (!refreshed || !restored) {
      try { sessionStorage.setItem(WALLET_REFRESH_PREFIX + address, '1'); } catch (_) {}
      analyzeWallet(address, { silent: true, navigate: false, forceNfts: false }).catch(() => {});
    }
  }

  function initTrackData() {
    el('trackAnalyze')?.addEventListener('click', () => analyzeWallet(undefined, { forceNfts: true, navigate: true }));
    el('walletInput')?.addEventListener('keydown', event => { if (event.key === 'Enter') analyzeWallet(undefined, { forceNfts: true, navigate: true }); });
    document.querySelectorAll('#trackRangeTabs .tab').forEach(tab => tab.addEventListener('click', () => {
      state.range = tab.dataset.range;
      document.querySelectorAll('#trackRangeTabs .tab').forEach(item => item.classList.toggle('active', item === tab));
      if (state.address) analyzeWallet(state.address, { forceNfts: false, navigate: false });
    }));
    clearResults();
    setTimeout(restoreSavedWalletOnce, 0);
  }

  global.initTrackData = initTrackData;
  global.onTrackViewEnter = () => {};
  global.onTrackViewLeave = () => {};
  global.analyzeWallet = analyzeWallet;
  global.BBRWalletAnalytics = { isValidSolanaAddress, restoreCachedWallet, getState: () => ({ ...state }) };
})(window);
