/* A Bulls App — Ghost Portfolio
 * Counterfactual preview from observed swap-like entries and observed historical prices.
 * Never labels the result as today's value and never treats transfers/airdrops as purchases.
 */
(function (global) {
  'use strict';
  const $ = id => document.getElementById(id);
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; };
  const fmt = (n, digits = 2) => Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
  const usd = n => Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : '—';
  const short = value => { const s = String(value || ''); return s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-5)}` : s || 'TOKEN'; };

  function events() {
    return global.BBRIntelligenceHistory?.observedEvents?.() || [];
  }

  function normalize(row = {}) {
    const explicit = String(row.eventClass || row.event_class || '').toLowerCase();
    const type = String(row.type || row.kind || row.description || '').toLowerCase();
    const eventClass = explicit || (/swap|trade|buy|sell/.test(type) ? 'swap-like' : 'unknown');
    const price = Number(row.priceUsd ?? row.price_usd ?? row.historicalPriceUsd ?? 0);
    const delta = Number(row.tokenDelta ?? row.token_delta ?? row.amountDelta ?? row.netTokenChange ?? 0);
    const time = Number(row.blockTime || row.block_time || row.timestamp || 0);
    return { mint: String(row.mint || row.tokenMint || row.assetId || ''), eventClass, priceUsd: price > 0 ? price : null, tokenDelta: Number.isFinite(delta) ? delta : 0, blockTime: Number.isFinite(time) ? time : 0 };
  }

  function derive(rows = events()) {
    const byMint = new Map();
    rows.map(normalize).filter(row => row.eventClass === 'swap-like' && row.mint).forEach(row => {
      const item = byMint.get(row.mint) || { mint: row.mint, bought: 0, sold: 0, latestObservedPriceUsd: null, latestPriceTime: 0, pricedEntries: 0 };
      if (row.tokenDelta > 0) {
        item.bought += row.tokenDelta;
        if (row.priceUsd) item.pricedEntries += 1;
      } else if (row.tokenDelta < 0) item.sold += Math.abs(row.tokenDelta);
      if (row.priceUsd && row.blockTime >= item.latestPriceTime) {
        item.latestObservedPriceUsd = row.priceUsd;
        item.latestPriceTime = row.blockTime;
      }
      byMint.set(row.mint, item);
    });

    const positions = [...byMint.values()].filter(item => item.bought > 0).map(item => {
      const observedNetSwapQuantity = Math.max(0, item.bought - item.sold);
      const ghostQuantity = item.bought;
      const price = item.latestObservedPriceUsd;
      return {
        ...item,
        observedNetSwapQuantity,
        ghostQuantity,
        ghostValueAtLastObservedPrice: price ? ghostQuantity * price : null,
        observedNetSwapValueAtLastObservedPrice: price ? observedNetSwapQuantity * price : null,
        differenceAtLastObservedPrice: price ? Math.max(0, item.sold) * price : null
      };
    }).sort((a, b) => Number(b.ghostValueAtLastObservedPrice || 0) - Number(a.ghostValueAtLastObservedPrice || 0));

    const priced = positions.filter(item => item.ghostValueAtLastObservedPrice != null);
    return {
      positions,
      pricedPositions: priced.length,
      ghostValueAtLastObservedPrice: priced.reduce((sum, item) => sum + item.ghostValueAtLastObservedPrice, 0),
      observedNetSwapValueAtLastObservedPrice: priced.reduce((sum, item) => sum + item.observedNetSwapValueAtLastObservedPrice, 0),
      differenceAtLastObservedPrice: priced.reduce((sum, item) => sum + item.differenceAtLastObservedPrice, 0),
      coverage: positions.length && priced.length === positions.length ? 'priced-observed-history' : priced.length ? 'partial-pricing' : 'index-required'
    };
  }

  function render() {
    const host = $('bullDeepIntelligencePanel') || $('intelligenceHistoryRoot')?.parentElement;
    if (!host) return false;
    let root = $('ghostPortfolioRoot');
    if (!root) { root = make('section', 'panel ghost-portfolio-card'); root.id = 'ghostPortfolioRoot'; host.append(root); }
    root.replaceChildren();

    const model = derive();
    const head = make('div', 'ghost-portfolio-head');
    const title = make('div'); title.append(make('small', '', 'COUNTERFACTUAL HISTORY'), make('b', '', 'GHOST PORTFOLIO'));
    head.append(title, make('span', '', model.coverage === 'index-required' ? 'INDEX REQUIRED' : model.coverage.toUpperCase().replace(/-/g, ' ')));
    root.append(head);

    if (!model.positions.length || !model.pricedPositions) {
      root.append(make('p', 'notice', 'Ghost Portfolio needs observed swap-like entries with historical price observations. Transfers and airdrops are intentionally excluded from purchase assumptions.'));
      return true;
    }

    const stats = make('div', 'ghost-portfolio-stats');
    [
      ['IF OBSERVED BUYS WERE NEVER SOLD', usd(model.ghostValueAtLastObservedPrice)],
      ['OBSERVED NET SWAP POSITION', usd(model.observedNetSwapValueAtLastObservedPrice)],
      ['SOLD QUANTITY VALUE @ LAST OBSERVED PRICE', usd(model.differenceAtLastObservedPrice)],
      ['PRICED TOKEN HISTORIES', `${model.pricedPositions}/${model.positions.length}`]
    ].forEach(([label, value]) => { const card = make('article', 'ghost-portfolio-stat'); card.append(make('small', '', label), make('strong', '', value)); stats.append(card); });
    root.append(stats);

    const list = make('div', 'ghost-portfolio-list');
    model.positions.slice(0, 12).forEach(item => {
      const row = make('article', 'ghost-portfolio-row');
      const copy = make('div');
      copy.append(make('b', '', short(item.mint)), make('small', '', `bought ${fmt(item.bought, 6)} · sold ${fmt(item.sold, 6)} · last observed ${item.latestObservedPriceUsd ? usd(item.latestObservedPriceUsd) : 'unpriced'}`));
      row.append(copy, make('strong', '', item.ghostValueAtLastObservedPrice == null ? '—' : usd(item.ghostValueAtLastObservedPrice)));
      list.append(row);
    });
    root.append(list, make('p', 'bull-intel-trust', 'Ghost Portfolio values observed swap entries at each token’s latest price observation in the supplied history. It is not today’s wallet value, not complete lifetime history, and not a recommendation to hold or sell.'));
    return true;
  }

  function injectStyles() {
    if ($('ghostPortfolioStyles')) return;
    const style = document.createElement('style'); style.id = 'ghostPortfolioStyles';
    style.textContent = `.ghost-portfolio-card{display:grid;gap:12px;margin-top:12px}.ghost-portfolio-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ghost-portfolio-head>div{display:grid;gap:2px}.ghost-portfolio-head small{font-size:8px;letter-spacing:.12em;color:var(--muted)}.ghost-portfolio-head>span{font-size:8px;color:var(--g2);letter-spacing:.08em}.ghost-portfolio-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ghost-portfolio-stat{display:grid;gap:4px;padding:10px;border:1px solid var(--line);border-radius:12px}.ghost-portfolio-stat small{font-size:7px;color:var(--muted);line-height:1.35}.ghost-portfolio-stat strong{font-size:12px}.ghost-portfolio-list{display:grid;gap:4px}.ghost-portfolio-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}.ghost-portfolio-row>div{display:grid;gap:3px;min-width:0}.ghost-portfolio-row b{font-size:9px}.ghost-portfolio-row small{font-size:8px;color:var(--muted);overflow:hidden;text-overflow:ellipsis}.ghost-portfolio-row>strong{font-size:10px;color:var(--g2)}@media(max-width:390px){.ghost-portfolio-stats{grid-template-columns:1fr}}`;
    document.head.append(style);
  }

  function init() {
    injectStyles(); render();
    global.addEventListener('bbrs:wallet-analysis-complete', render);
  }

  global.BBRGhostPortfolio = Object.freeze({ init, render, derive, normalize });
})(window);
