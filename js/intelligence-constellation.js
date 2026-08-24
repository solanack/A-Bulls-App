/* A Bulls App — Wallet Constellation
 * Read-only graph of public-chain relationships returned by the Bull Intelligence Worker.
 * Relationship edges are observed interactions only. They are never ownership or identity claims.
 */
(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  };
  const short = value => {
    const s = String(value || '');
    return s.length > 13 ? `${s.slice(0, 6)}…${s.slice(-5)}` : s || '—';
  };
  const fmt = (value, digits = 2) => Number.isFinite(Number(value))
    ? Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })
    : '—';

  const state = { loading: false, payload: null, error: null };

  function wallet() {
    return String(global.BBRWalletAnalytics?.getState?.().address || '').trim();
  }

  async function load() {
    const address = wallet();
    state.error = null;
    if (!address || !global.BBRSApi?.post) {
      state.payload = null;
      render();
      return;
    }
    state.loading = true;
    render();
    try {
      state.payload = await global.BBRSApi.post('/api/intelligence/wallet-summary', { wallet: address });
    } catch (error) {
      state.error = error?.message || 'Relationship index unavailable.';
      state.payload = null;
    } finally {
      state.loading = false;
      render();
    }
  }

  function normalizedRelationships(payload = state.payload) {
    const address = wallet();
    const rows = Array.isArray(payload?.relationships) ? payload.relationships : [];
    return rows.map(row => {
      const a = String(row.wallet_a || row.walletA || '');
      const b = String(row.wallet_b || row.walletB || '');
      const counterparty = a === address ? b : a;
      return {
        counterparty,
        firstSeen: Number(row.first_seen || row.firstSeen || 0),
        lastSeen: Number(row.last_seen || row.lastSeen || 0),
        interactions: Number(row.interaction_count || row.interactionCount || 0),
        solVolume: Number(row.sol_volume || row.solVolume || 0),
        tokenEvents: Number(row.token_event_count || row.tokenEventCount || 0),
        types: String(row.relationship_types || row.relationshipTypes || '')
      };
    }).filter(row => row.counterparty)
      .sort((a, b) => (b.interactions + b.tokenEvents) - (a.interactions + a.tokenEvents))
      .slice(0, 24);
  }

  function render() {
    const lab = $('intelligenceLabRoot');
    const host = lab?.parentElement || $('bullDeepIntelligencePanel') || $('bullIntelResult')?.parentElement;
    if (!host) return false;

    let root = $('walletConstellationRoot');
    if (!root) {
      root = make('section', 'panel deep-constellation-card');
      root.id = 'walletConstellationRoot';
      const where = $('whereWereYouRoot');
      if (where) where.insertAdjacentElement('afterend', root);
      else if (lab) lab.insertAdjacentElement('afterend', root);
      else host.append(root);
    }
    root.replaceChildren();

    const head = make('div', 'deep-constellation-head');
    const title = make('div');
    title.append(make('small', '', 'PUBLIC RELATIONSHIP GRAPH'), make('b', '', 'WALLET CONSTELLATION'));
    const refresh = make('button', 'secondary deep-constellation-refresh', state.loading ? 'Loading…' : 'Refresh');
    refresh.type = 'button';
    refresh.disabled = state.loading;
    refresh.addEventListener('click', load);
    head.append(title, refresh);
    root.append(head);

    const address = wallet();
    if (!address) {
      root.append(make('div', 'deep-constellation-empty', 'Load a public wallet to inspect indexed relationship edges.'));
      return true;
    }
    if (state.loading) {
      root.append(make('div', 'deep-constellation-empty', 'READING INDEX…'));
      return true;
    }
    if (state.error) {
      root.append(make('div', 'deep-constellation-empty', state.error));
      return true;
    }

    const rows = normalizedRelationships();
    const indexed = state.payload?.indexed;
    if (!rows.length) {
      const text = indexed
        ? 'No indexed wallet-to-wallet interaction edges were found in the currently available history.'
        : 'INDEX REQUIRED — this wallet does not yet have normalized relationship history.';
      root.append(make('div', 'deep-constellation-empty', text));
      return true;
    }

    const field = make('div', 'deep-constellation-field');
    const center = make('div', 'deep-constellation-center');
    center.append(make('small', '', 'FOCUS WALLET'), make('b', '', short(address)));
    field.append(center);

    rows.forEach((row, index) => {
      const node = make('article', 'deep-constellation-node');
      node.style.setProperty('--angle', `${Math.round(index / rows.length * 360)}deg`);
      node.style.setProperty('--radius', `${105 + (index % 4) * 34}px`);
      node.append(make('b', '', short(row.counterparty)));
      node.append(make('small', '', `${fmt(row.interactions, 0)} interactions · ${fmt(row.tokenEvents, 0)} token events`));
      if (row.solVolume > 0) node.append(make('small', '', `${fmt(row.solVolume, 3)} SOL observed`));
      field.append(node);
    });
    root.append(field);

    const meta = make('div', 'deep-constellation-meta');
    meta.append(
      make('span', '', `${rows.length} visible counterparties`),
      make('span', '', indexed?.coverage ? String(indexed.coverage).toUpperCase() : 'INDEXED PARTIAL')
    );
    root.append(meta, make('p', 'bull-intel-trust', 'An edge means public-chain interaction was observed. It does not mean two wallets share an owner, identity, organization, or intent.'));
    return true;
  }

  function injectStyles() {
    if ($('walletConstellationStyles')) return;
    const style = document.createElement('style');
    style.id = 'walletConstellationStyles';
    style.textContent = `
      .deep-constellation-card{display:grid;gap:12px;margin-top:12px}.deep-constellation-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.deep-constellation-head>div{display:grid;gap:2px}.deep-constellation-head small{font-size:8px;letter-spacing:.12em;color:var(--muted)}.deep-constellation-refresh{min-height:32px!important;width:auto!important;padding:5px 10px!important}.deep-constellation-empty{padding:18px 12px;border:1px dashed var(--line);border-radius:12px;text-align:center;color:var(--muted);font-size:10px;line-height:1.5}.deep-constellation-field{position:relative;min-height:430px;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:radial-gradient(circle at center,rgba(255,255,255,.055),transparent 60%)}.deep-constellation-center,.deep-constellation-node{position:absolute;left:50%;top:50%;display:grid;place-items:center;text-align:center;background:var(--card);border:1px solid var(--line);box-shadow:var(--glow)}.deep-constellation-center{z-index:3;width:108px;height:108px;border-radius:50%;transform:translate(-50%,-50%)}.deep-constellation-center small{font-size:7px;color:var(--muted)}.deep-constellation-center b{font-size:10px;color:var(--g2)}.deep-constellation-node{--angle:0deg;--radius:120px;width:92px;min-height:60px;padding:7px;border-radius:12px;transform:translate(-50%,-50%) rotate(var(--angle)) translateX(var(--radius)) rotate(calc(var(--angle) * -1))}.deep-constellation-node b{font-size:9px}.deep-constellation-node small{font-size:7px;color:var(--muted);line-height:1.35}.deep-constellation-meta{display:flex;justify-content:space-between;gap:8px;font-size:8px;color:var(--muted);letter-spacing:.08em}@media(max-width:390px){.deep-constellation-field{min-height:360px}.deep-constellation-node{--radius:90px!important;width:76px;min-height:54px}}
    `;
    document.head.append(style);
  }

  function init() {
    injectStyles();
    let attempts = 0;
    const ready = () => {
      attempts += 1;
      if (render()) { load(); return true; }
      return attempts >= 20;
    };
    if (!ready()) {
      const timer = setInterval(() => { if (ready()) clearInterval(timer); }, 250);
    }
    global.addEventListener('bbrs:wallet-analysis-complete', load);
  }

  global.BBRWalletConstellation = Object.freeze({ init, load, render, normalizedRelationships });
})(window);
