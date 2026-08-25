/* Progressive Intelligence Mesh UI. Designed to coexist with legacy/community analytics. */
(function (global) {
  'use strict';

  const byId = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function walletValue() {
    return (byId('walletInput')?.value || byId('lifeWalletInput')?.value || '').trim();
  }

  function ensurePanel() {
    const host = byId('intelligencePanel');
    if (!host || byId('intelligenceMeshPanel')) return byId('intelligenceMeshPanel');
    const panel = document.createElement('section');
    panel.id = 'intelligenceMeshPanel';
    panel.className = 'panel intelligence-mesh-panel';
    panel.innerHTML = `
      <div class="section-title"><div><small>UNIVERSAL SOLANA INTELLIGENCE</small><h2>Intelligence Mesh</h2></div><span class="status-pill" id="meshStatePill">CHECKING</span></div>
      <p class="notice">Progressive, provider-agnostic indexing. Helius is optional; public RPC, Yellowstone/Richat, Substreams and historical repair sources can feed the same index.</p>
      <div class="metric-grid" id="meshStatusGrid"></div>
      <div class="analytics-update-row"><span id="meshCoverageText">Enter a public wallet to begin.</span><button class="secondary" id="meshIndexWallet" type="button">INDEX HISTORY</button></div>
      <div class="metric-grid" id="meshCoverageGrid"></div>
      <details class="data-disclosure"><summary><span>Source Health</span></summary><div class="disclosure-body" id="meshSourceHealth"><p class="notice">No sources reported yet.</p></div></details>
    `;
    host.insertBefore(panel, host.firstChild?.nextSibling || host.firstChild);
    byId('meshIndexWallet')?.addEventListener('click', indexCurrentWallet);
    return panel;
  }

  function metric(label, value) {
    return `<article class="signal-card"><small>${esc(label)}</small><strong>${esc(value)}</strong></article>`;
  }

  async function refreshStatus() {
    ensurePanel();
    if (!global.IntelligenceMesh) return;
    try {
      const result = await global.IntelligenceMesh.status();
      const status = result.status || {};
      const caps = status.capabilities || {};
      byId('meshStatePill').textContent = status.enabled ? 'ACTIVE' : 'STAGED';
      byId('meshStatusGrid').innerHTML = [
        metric('History Engine', caps.historyEngine ? 'READY' : 'OFF'),
        metric('Verification', caps.verificationEngine ? 'READY' : 'OFF'),
        metric('Trade Routes', caps.tradeRoutes ? 'READY' : 'OFF'),
        metric('On-chain Candles', caps.onChainCandles ? 'READY' : 'OFF'),
        metric('Market Sequence', caps.marketSequence ? 'READY' : 'OFF'),
        metric('Demand Engine', caps.demandEngine ? 'READY' : 'OFF')
      ].join('');
      await refreshSources();
    } catch (_) {
      byId('meshStatePill').textContent = 'UNAVAILABLE';
    }
  }

  async function refreshSources() {
    try {
      const result = await global.IntelligenceMesh.sourceHealth();
      const rows = result.sources || [];
      byId('meshSourceHealth').innerHTML = rows.length ? rows.map(row => `
        <div class="analytics-update-row"><span><b>${esc(row.source)}</b><small> ${esc(row.source_kind || '')}</small></span><span class="status-pill">${esc(String(row.state || 'unknown').toUpperCase())}</span></div>
      `).join('') : '<p class="notice">Sources appear here as the mesh observes them.</p>';
    } catch (_) {}
  }

  async function refreshCoverage(wallet) {
    if (!global.IntelligenceMesh?.validWallet(wallet)) return;
    try {
      const result = await global.IntelligenceMesh.coverage(wallet);
      const row = result.coverage || null;
      const formatted = global.IntelligenceMesh.formatCoverage(row);
      byId('meshCoverageText').textContent = formatted.detail;
      byId('meshCoverageGrid').innerHTML = [
        metric('Coverage', formatted.label),
        metric('Indexed Transactions', Number(row?.indexed_transactions || 0).toLocaleString()),
        metric('Indexed Events', Number(row?.indexed_events || 0).toLocaleString()),
        metric('Status', row?.status || 'indexing')
      ].join('');
    } catch (_) {}
  }

  async function indexCurrentWallet() {
    const wallet = walletValue();
    if (!global.IntelligenceMesh?.validWallet(wallet)) {
      byId('meshCoverageText').textContent = 'Enter a valid public Solana wallet first.';
      return;
    }
    const button = byId('meshIndexWallet');
    if (button) button.disabled = true;
    byId('meshCoverageText').textContent = 'Queuing progressive history…';
    try {
      const result = await global.IntelligenceMesh.ensureProgressiveIndex(wallet, { pageSize: 25 });
      byId('meshCoverageText').textContent = result.state === 'complete-history' ? 'Complete history already indexed.' : 'History indexing queued. Intelligence improves as coverage expands.';
      await refreshCoverage(wallet);
    } catch (error) {
      byId('meshCoverageText').textContent = error?.message || 'History could not be queued.';
    } finally {
      if (button) button.disabled = false;
    }
  }

  function hookWalletAnalysis() {
    byId('trackAnalyze')?.addEventListener('click', () => {
      const wallet = walletValue();
      if (!global.IntelligenceMesh?.validWallet(wallet)) return;
      global.IntelligenceMesh.ensureProgressiveIndex(wallet, { pageSize: 25 }).then(() => refreshCoverage(wallet)).catch(() => {});
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensurePanel();
    hookWalletAnalysis();
    refreshStatus();
    const wallet = walletValue();
    if (global.IntelligenceMesh?.validWallet(wallet)) refreshCoverage(wallet);
  });

  global.IntelligenceMeshUI = Object.freeze({ refreshStatus, refreshCoverage, indexCurrentWallet });
})(window);
