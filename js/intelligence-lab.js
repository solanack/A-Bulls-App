/* A Bulls App — Intelligence Lab v1
 * Additive read-only experiments built from public wallet analytics already loaded by the app.
 * No historical prices are invented: unavailable archival features remain capability-locked.
 */
(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  const fmt = (value, digits = 2) => Number.isFinite(Number(value))
    ? Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })
    : '—';
  const short = value => {
    const text = String(value || '');
    return text.length > 13 ? `${text.slice(0, 6)}…${text.slice(-5)}` : text || 'TOKEN';
  };

  function walletState() {
    return global.BBRWalletAnalytics?.getState?.() || {};
  }

  function capabilityMap(state = walletState()) {
    const activity = state.activity || {};
    const overview = state.overview || {};
    const flows = Array.isArray(activity.topFlows) ? activity.topFlows : [];
    const recent = Array.isArray(activity.recent) ? activity.recent : [];
    const holdings = Array.isArray(overview.holdings) ? overview.holdings : [];
    const fullRange = activity.historyComplete === true;
    const hasWallet = Boolean(state.address && (activity.signaturesAnalyzed || holdings.length));
    return [
      { id: 'dna', name: 'Bull DNA', status: hasWallet ? 'ready' : 'needs-wallet', reason: 'Uses current portfolio and loaded public activity.' },
      { id: 'museum', name: 'Wallet Museum', status: hasWallet ? 'ready' : 'needs-wallet', reason: 'Uses current holdings and the visible activity window.' },
      { id: 'rivalry', name: 'Wallet Rivalries', status: 'ready', reason: 'Compares two public addresses with the same explainable metrics.' },
      { id: 'ghost-ledger', name: 'Ghost Ledger', status: flows.length ? 'ready' : 'needs-wallet', reason: 'Shows net outbound token quantities without inventing historical valuation.' },
      { id: 'constellation', name: 'Activity Constellation', status: flows.length || holdings.length ? 'ready' : 'needs-wallet', reason: 'Maps the wallet to observed tokens only.' },
      { id: 'time-machine', name: 'Wallet Time Machine', status: fullRange ? 'limited' : 'index-required', reason: fullRange ? 'The selected range is covered, but full wallet history still requires indexing.' : 'Complete historical reconstruction requires the archival index.' },
      { id: 'ghost-portfolio', name: 'Ghost Portfolio', status: 'index-required', reason: 'Exact counterfactual value requires historical positions and prices.' },
      { id: 'parallel-universe', name: 'Parallel Universe', status: 'index-required', reason: 'Defensible historical rule replay requires complete position history.' },
      { id: 'radar', name: 'Bull Radar', status: 'index-required', reason: 'Anomaly detection needs aggregate multi-wallet cohort history.' },
      { id: 'weather', name: 'Solana Weather', status: 'index-required', reason: 'Chain-wide conditions need aggregate indexed windows.' },
      { id: 'wallet-constellation', name: 'Wallet Constellation', status: recent.length ? 'limited' : 'index-required', reason: recent.length ? 'Recent public relationships can be displayed; deep graph coverage requires indexing.' : 'Relationship edges require decoded counterparty history.' }
    ];
  }

  function ghostLedger(activity = {}) {
    const flows = Array.isArray(activity.topFlows) ? activity.topFlows : [];
    return flows
      .map(item => ({
        mint: String(item.mint || ''),
        symbol: String(item.symbol || ''),
        net: Number(item.net || 0)
      }))
      .filter(item => Number.isFinite(item.net) && item.net < 0)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 12)
      .map(item => ({ ...item, ghostQuantity: Math.abs(item.net) }));
  }

  function constellation(state = walletState()) {
    const activity = state.activity || {};
    const overview = state.overview || {};
    const flows = Array.isArray(activity.topFlows) ? activity.topFlows : [];
    const holdings = Array.isArray(overview.holdings) ? overview.holdings : [];
    const byMint = new Map();
    holdings.slice(0, 10).forEach(item => {
      const mint = String(item.mint || '');
      if (!mint) return;
      byMint.set(mint, {
        mint,
        symbol: String(item.symbol || ''),
        holdingUsd: Number(item.usdValue || 0),
        netFlow: 0,
        relationship: 'holding'
      });
    });
    flows.slice(0, 12).forEach(item => {
      const mint = String(item.mint || '');
      if (!mint) return;
      const existing = byMint.get(mint) || { mint, symbol: String(item.symbol || ''), holdingUsd: 0, netFlow: 0, relationship: 'flow' };
      existing.symbol = existing.symbol || String(item.symbol || '');
      existing.netFlow = Number(item.net || 0);
      existing.relationship = existing.holdingUsd > 0 ? 'holding+flow' : 'flow';
      byMint.set(mint, existing);
    });
    return [...byMint.values()]
      .sort((a, b) => Math.max(Math.abs(b.netFlow), b.holdingUsd) - Math.max(Math.abs(a.netFlow), a.holdingUsd))
      .slice(0, 12);
  }

  function make(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function renderCapabilities(root, state) {
    const card = make('section', 'panel intelligence-lab-card');
    const head = make('div', 'intelligence-lab-head');
    head.append(make('b', '', 'INTELLIGENCE CAPABILITIES'), make('small', '', 'HONEST COVERAGE'));
    card.append(head);
    const grid = make('div', 'intelligence-capability-grid');
    capabilityMap(state).forEach(item => {
      const row = make('article', `intelligence-capability is-${item.status}`);
      const copy = make('div');
      copy.append(make('b', '', item.name), make('small', '', item.reason));
      const label = item.status === 'ready' ? 'READY' : item.status === 'limited' ? 'LIMITED' : item.status === 'needs-wallet' ? 'LOAD WALLET' : 'INDEX REQUIRED';
      row.append(copy, make('span', '', label));
      grid.append(row);
    });
    card.append(grid);
    root.append(card);
  }

  function renderGhost(root, state) {
    const rows = ghostLedger(state.activity || {});
    const card = make('section', 'panel intelligence-lab-card');
    const head = make('div', 'intelligence-lab-head');
    head.append(make('b', '', 'GHOST LEDGER'), make('small', '', 'OBSERVED NET OUTFLOW'));
    card.append(head);
    if (!rows.length) {
      card.append(make('p', 'notice', 'Load a wallet with decoded token flow to reveal the Ghost Ledger.'));
    } else {
      const grid = make('div', 'ghost-ledger-grid');
      rows.forEach(item => {
        const row = make('article', 'ghost-ledger-row');
        const copy = make('div');
        copy.append(make('b', '', item.symbol || short(item.mint)), make('small', '', short(item.mint)));
        row.append(copy, make('strong', '', fmt(item.ghostQuantity, 6)));
        grid.append(row);
      });
      card.append(grid, make('p', 'bull-intel-trust', 'Ghost quantity is the absolute net outbound token movement in the loaded range. It is not a claim about what the wallet would be worth today.'));
    }
    root.append(card);
  }

  function renderConstellation(root, state) {
    const nodes = constellation(state);
    const card = make('section', 'panel intelligence-lab-card');
    const head = make('div', 'intelligence-lab-head');
    head.append(make('b', '', 'ACTIVITY CONSTELLATION'), make('small', '', 'TOKEN RELATIONSHIPS'));
    card.append(head);
    if (!nodes.length) {
      card.append(make('p', 'notice', 'Load a wallet to map its observed token relationships.'));
      root.append(card); return;
    }
    const field = make('div', 'constellation-field');
    field.append(make('div', 'constellation-wallet', short(state.address)));
    nodes.forEach((item, index) => {
      const node = make('div', `constellation-node relation-${item.relationship}`);
      node.style.setProperty('--angle', `${Math.round(index / nodes.length * 360)}deg`);
      node.style.setProperty('--orbit', `${86 + (index % 3) * 34}px`);
      node.append(make('b', '', item.symbol || short(item.mint)), make('small', '', item.netFlow ? `${item.netFlow > 0 ? '+' : ''}${fmt(item.netFlow, 3)}` : item.holdingUsd ? `$${fmt(item.holdingUsd, 0)}` : 'observed'));
      field.append(node);
    });
    card.append(field, make('p', 'bull-intel-trust', 'This constellation links the public wallet only to tokens observed in the loaded data. It does not infer identity or common ownership.'));
    root.append(card);
  }

  function injectStyles() {
    if ($('intelligenceLabStyles')) return;
    const style = document.createElement('style');
    style.id = 'intelligenceLabStyles';
    style.textContent = `
      #intelligenceLabRoot{display:grid;gap:12px;margin-top:14px}.intelligence-lab-card{display:grid;gap:12px}.intelligence-lab-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.intelligence-lab-head small{color:var(--muted);font-size:9px}.intelligence-capability-grid{display:grid;gap:7px}.intelligence-capability{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.018)}.intelligence-capability div{display:grid;gap:3px}.intelligence-capability small{color:var(--muted);font-size:10px;line-height:1.35}.intelligence-capability span{font-size:9px;font-weight:900;color:var(--g2)}.intelligence-capability.is-index-required span{color:#d8a46d}.intelligence-capability.is-limited span{color:#d8c36d}.ghost-ledger-grid{display:grid;gap:6px}.ghost-ledger-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px;border-bottom:1px solid var(--line)}.ghost-ledger-row div{display:grid}.ghost-ledger-row small{color:var(--muted);font-size:9px}.ghost-ledger-row strong{color:var(--g2)}.constellation-field{position:relative;height:330px;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:radial-gradient(circle at center,rgba(176,211,196,.12),transparent 58%)}.constellation-wallet,.constellation-node{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;text-align:center;border:1px solid var(--line);background:var(--card);box-shadow:var(--glow)}.constellation-wallet{z-index:3;width:96px;height:96px;border-radius:50%;font-size:11px;font-weight:900;color:var(--g2)}.constellation-node{--angle:0deg;--orbit:110px;width:66px;min-height:48px;padding:6px;border-radius:12px;transform:translate(-50%,-50%) rotate(var(--angle)) translateX(var(--orbit)) rotate(calc(var(--angle) * -1));font-size:9px}.constellation-node b{max-width:58px;overflow:hidden;text-overflow:ellipsis}.constellation-node small{color:var(--muted);font-size:8px}.relation-holding\+flow{border-color:var(--g2)}@media(max-width:380px){.constellation-field{height:290px}.constellation-node{--orbit:78px!important}}
    `;
    document.head.append(style);
  }

  function render() {
    const host = $('bullDeepIntelligencePanel') || $('bullIntelResult')?.parentElement;
    if (!host) return false;
    let root = $('intelligenceLabRoot');
    if (!root) {
      root = make('div', 'intelligence-lab-root');
      root.id = 'intelligenceLabRoot';
      host.append(root);
    }
    root.replaceChildren();
    const state = walletState();
    renderCapabilities(root, state);
    renderGhost(root, state);
    renderConstellation(root, state);
    return true;
  }

  function init() {
    injectStyles();
    if (!render()) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (render() || attempts >= 20) clearInterval(timer);
      }, 250);
    }
    global.addEventListener('bbrs:wallet-analysis-complete', render);
    global.addEventListener('bbrs:journey-unlocked', render);
  }

  global.BBRIntelligenceLab = Object.freeze({ init, render, capabilityMap, ghostLedger, constellation });
})(window);
