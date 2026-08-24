/* A Bulls App — NFT Memory
 * Read-only NFT history from the Bull Intelligence index.
 * Displays observed history only and never treats partial indexing as complete ownership history.
 */
(function (global) {
  'use strict';
  const $ = id => document.getElementById(id);
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; };
  const short = value => { const s = String(value || ''); return s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-5)}` : s || '—'; };
  const fmt = (n, digits = 0) => Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
  const state = { loading: false, payload: null, error: null };

  function wallet() { return String(global.BBRWalletAnalytics?.getState?.().address || '').trim(); }
  function date(value) { return Number(value) ? new Date(Number(value) * 1000).toLocaleDateString() : '—'; }

  function derive(payload = state.payload) {
    const events = Array.isArray(payload?.events) ? payload.events : [];
    const collections = Array.isArray(payload?.collections) ? payload.collections : [];
    const first = events[0] || null;
    const latest = events.length ? events[events.length - 1] : null;
    const busiest = collections.slice().sort((a, b) => Number(b.unique_assets || 0) - Number(a.unique_assets || 0))[0] || null;
    const longest = collections.slice().sort((a, b) => (Number(b.last_seen || 0) - Number(b.first_seen || 0)) - (Number(a.last_seen || 0) - Number(a.first_seen || 0)))[0] || null;
    return { events, collections, first, latest, busiest, longest };
  }

  async function load() {
    const address = wallet();
    state.error = null;
    if (!address || !global.BBRSApi?.post) { state.payload = null; render(); return; }
    state.loading = true; render();
    try { state.payload = await global.BBRSApi.post('/api/intelligence/nft-memory', { wallet: address }); }
    catch (error) { state.error = error?.message || 'NFT Memory unavailable.'; state.payload = null; }
    finally { state.loading = false; render(); }
  }

  function render() {
    const host = $('nftAnalysisPanel') || $('bullDeepIntelligencePanel');
    if (!host) return false;
    let root = $('nftMemoryRoot');
    if (!root) { root = make('section', 'panel nft-memory-card'); root.id = 'nftMemoryRoot'; host.append(root); }
    root.replaceChildren();

    const head = make('div', 'nft-memory-head');
    const title = make('div'); title.append(make('small', '', 'PUBLIC NFT HISTORY'), make('b', '', 'NFT MEMORY'));
    const refresh = make('button', 'secondary', state.loading ? 'Loading…' : 'Refresh'); refresh.type = 'button'; refresh.disabled = state.loading; refresh.addEventListener('click', load);
    head.append(title, refresh); root.append(head);

    if (!wallet()) { root.append(make('p', 'notice', 'Load a public wallet to inspect indexed NFT history.')); return true; }
    if (state.loading) { root.append(make('p', 'notice', 'READING NFT INDEX…')); return true; }
    if (state.error) { root.append(make('p', 'notice', state.error)); return true; }
    if (!state.payload || state.payload.state !== 'ready') {
      root.append(make('div', 'nft-memory-locked', 'INDEX REQUIRED'), make('p', 'bull-intel-trust', 'NFT Memory activates only when normalized NFT observations are indexed. No missing history is invented.'));
      return true;
    }

    const model = derive();
    const grid = make('div', 'nft-memory-grid');
    const facts = [
      ['EARLIEST OBSERVED NFT', model.first ? short(model.first.asset_id) : '—', model.first ? date(model.first.block_time) : 'No event'],
      ['LATEST OBSERVED NFT', model.latest ? short(model.latest.asset_id) : '—', model.latest ? date(model.latest.block_time) : 'No event'],
      ['DEEPEST COLLECTION', model.busiest ? short(model.busiest.collection) : '—', model.busiest ? `${fmt(model.busiest.unique_assets)} observed assets` : 'No collection window'],
      ['LONGEST OBSERVED ERA', model.longest ? short(model.longest.collection) : '—', model.longest ? `${date(model.longest.first_seen)} → ${date(model.longest.last_seen)}` : 'No collection window'],
      ['INDEXED NFT EVENTS', fmt(state.payload.bounds?.event_count || model.events.length), 'Observed public-chain events'],
      ['COLLECTIONS OBSERVED', fmt(state.payload.bounds?.collections || model.collections.length), 'Within indexed coverage']
    ];
    facts.forEach(([label, value, detail]) => { const card = make('article', 'nft-memory-fact'); card.append(make('small', '', label), make('strong', '', value), make('p', '', detail)); grid.append(card); });
    root.append(grid, make('p', 'bull-intel-trust', 'NFT Memory describes indexed public-chain observations only. It does not claim complete lifetime ownership, cost basis, profit, or identity.'));
    return true;
  }

  function injectStyles() {
    if ($('nftMemoryStyles')) return;
    const style = document.createElement('style'); style.id = 'nftMemoryStyles';
    style.textContent = `.nft-memory-card{display:grid;gap:12px;margin-top:12px}.nft-memory-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.nft-memory-head>div{display:grid;gap:2px}.nft-memory-head small{font-size:8px;letter-spacing:.12em;color:var(--muted)}.nft-memory-head button{width:auto!important;min-height:32px!important;padding:5px 10px!important}.nft-memory-locked{padding:18px;border:1px dashed var(--line);border-radius:12px;text-align:center;font-size:10px;font-weight:900;letter-spacing:.12em;color:var(--muted)}.nft-memory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.nft-memory-fact{display:grid;gap:4px;padding:11px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.018)}.nft-memory-fact small{font-size:7px;letter-spacing:.08em;color:var(--muted)}.nft-memory-fact strong{font-size:11px}.nft-memory-fact p{margin:0;font-size:8px;color:var(--muted);line-height:1.4}@media(max-width:390px){.nft-memory-grid{grid-template-columns:1fr}}`;
    document.head.append(style);
  }

  function init() {
    injectStyles();
    render();
    global.addEventListener('bbrs:wallet-analysis-complete', load);
    load();
  }

  global.BBRNFTMemory = Object.freeze({ init, load, render, derive });
})(window);
