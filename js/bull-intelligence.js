/* A Bulls App — Bull Intelligence v1
 * Read-only behavioral intelligence built only from public wallet analytics already
 * available through the A Bulls App Worker. No signing, custody, identity inference,
 * trading or recommendation language.
 */
(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  const clamp = n => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const addrOk = value => global.BBRWalletAnalytics?.isValidSolanaAddress?.(String(value || '').trim()) === true;
  const fmt = (n, digits = 0) => Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
  const money = n => Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : '—';
  const sol = n => Number.isFinite(Number(n)) ? `${fmt(n, 4)} SOL` : '—';
  const short = value => { const s = String(value || ''); return s.length > 13 ? `${s.slice(0, 6)}…${s.slice(-5)}` : s; };

  const state = { last: null, rival: null };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }

  async function post(path, body) {
    if (!global.BBRSApi?.post) throw new Error('Analytics service is unavailable.');
    return global.BBRSApi.post(path, body);
  }

  async function fetchWallet(address, range = '90d') {
    const [overview, activity] = await Promise.all([
      post('/api/wallet/overview', { address }),
      post('/api/wallet/activity', { address, range, limit: 100 })
    ]);
    return { address, range, overview: overview || {}, activity: activity || {} };
  }

  function coverageOf(bundle) {
    const a = bundle.activity || {};
    const recent = Array.isArray(a.recent) ? a.recent : [];
    return {
      historyComplete: a.historyComplete === true,
      signatures: Number(a.signaturesAnalyzed || 0),
      recentCount: recent.length,
      range: bundle.range || '90d',
      label: a.historyComplete === true ? 'RANGE COVERED' : 'PARTIAL HISTORY'
    };
  }

  function deriveDNA(bundle) {
    const o = bundle.overview || {};
    const a = bundle.activity || {};
    const t = a.trading || {};
    const flow = a.flow || {};
    const tx = Math.max(0, Number(a.signaturesAnalyzed || 0));
    const swaps = Math.max(0, Number(t.swapCount || 0));
    const activeDays = Math.max(0, Number(t.activeDays || 0));
    const uniqueMints = Math.max(0, Number(t.uniqueMints || 0));
    const topPct = Math.max(0, Number(o.topHoldingPercent || 0));
    const failed = Math.max(0, Number(a.failedCount || 0));
    const reliability = tx ? 100 - (failed / tx * 100) : 0;
    const density = activeDays ? tx / activeDays : tx;
    const swapShare = tx ? swaps / tx : 0;
    const transferIn = Number(flow.transferInCount || 0);
    const transferOut = Number(flow.transferOutCount || 0);
    const flowTotal = transferIn + transferOut;
    const balance = flowTotal ? 100 - Math.abs(transferIn - transferOut) / flowTotal * 100 : 50;

    // These are deliberately explainable proxies, not claims about personality.
    const dimensions = [
      {
        key: 'conviction', label: 'CONVICTION',
        score: clamp(topPct * 1.35 + Math.max(0, 35 - uniqueMints) * .55),
        why: `Largest priced holding ${fmt(topPct, 1)}% · ${fmt(uniqueMints)} token mints touched.`
      },
      {
        key: 'curiosity', label: 'CURIOSITY',
        score: clamp(uniqueMints * 5 + Math.min(25, swaps * 1.2)),
        why: `${fmt(uniqueMints)} token mints touched · ${fmt(swaps)} swap-like events in the loaded range.`
      },
      {
        key: 'pacing', label: 'PACING',
        score: clamp(100 - Math.min(100, Math.max(0, density - 1) * 7)),
        why: `${fmt(tx)} transactions across ${fmt(activeDays)} active days (${fmt(density, 1)} per active day).`
      },
      {
        key: 'rotation', label: 'ROTATION',
        score: clamp(swapShare * 150 + Math.min(35, uniqueMints * 2)),
        why: `${fmt(swaps)} swaps among ${fmt(tx)} analyzed transactions.`
      },
      {
        key: 'reliability', label: 'EXECUTION',
        score: clamp(reliability),
        why: `${fmt(a.successCount || 0)} successful · ${fmt(failed)} failed transactions.`
      },
      {
        key: 'flow', label: 'FLOW BALANCE',
        score: clamp(balance),
        why: `${fmt(transferIn)} inbound · ${fmt(transferOut)} outbound transfer events.`
      }
    ];

    const strongest = dimensions.slice().sort((x, y) => y.score - x.score)[0];
    const archetype = archetypeFrom(dimensions, { swaps, uniqueMints, topPct, density });
    return { dimensions, strongest, archetype };
  }

  function archetypeFrom(dimensions, raw) {
    const score = key => dimensions.find(d => d.key === key)?.score || 0;
    if (raw.uniqueMints >= 18 && score('rotation') >= 65) return { name: 'THE TOURIST', line: 'Wide exploration and frequent movement define the loaded history.' };
    if (raw.topPct >= 55 && score('rotation') <= 45) return { name: 'THE DIAMOND BULL', line: 'The visible portfolio is concentrated while loaded rotation stays comparatively restrained.' };
    if (score('pacing') >= 78 && score('conviction') >= 55) return { name: 'THE WATCHTOWER', line: 'The loaded history combines measured activity with visible concentration.' };
    if (score('curiosity') >= 70 && score('pacing') >= 55) return { name: 'THE ARCHAEOLOGIST', line: 'The wallet explores broadly without turning every active day into constant motion.' };
    if (score('rotation') >= 75) return { name: 'THE ROTATOR', line: 'Swap-like activity is a large part of the visible transaction mix.' };
    return { name: 'THE WANDERER', line: 'No single behavior dominates the currently available history.' };
  }

  function deriveMuseum(bundle) {
    const o = bundle.overview || {};
    const a = bundle.activity || {};
    const t = a.trading || {};
    const holdings = Array.isArray(o.holdings) ? o.holdings : [];
    const flows = Array.isArray(a.topFlows) ? a.topFlows : [];
    const recent = Array.isArray(a.recent) ? a.recent : [];
    const oldest = recent.reduce((best, tx) => {
      const time = Number(tx.blockTime || tx.timestamp || 0);
      if (!time) return best;
      return !best || time < best ? time : best;
    }, 0);
    const largest = holdings.slice().sort((x, y) => Number(y.usdValue || 0) - Number(x.usdValue || 0))[0];
    const strongestFlow = flows.slice().sort((x, y) => Math.abs(Number(y.net || 0)) - Math.abs(Number(x.net || 0)))[0];

    return [
      { title: 'CROWN JEWEL', value: largest ? `${largest.symbol || short(largest.mint)} · ${money(largest.usdValue)}` : '—', detail: 'Largest priced holding in the current portfolio snapshot.' },
      { title: 'BUSIEST WINDOW', value: t.busiestWeekday || '—', detail: t.busiestHour != null ? `${String(t.busiestHour).padStart(2, '0')}:00 UTC was the busiest loaded hour.` : 'No busiest hour available.' },
      { title: 'HEAVIEST FLOW', value: strongestFlow ? `${strongestFlow.symbol || short(strongestFlow.mint)} · ${Number(strongestFlow.net || 0) >= 0 ? '+' : ''}${fmt(strongestFlow.net, 4)}` : '—', detail: 'Largest decoded net token movement in the loaded range.' },
      { title: 'VISIBLE RELIC', value: oldest ? new Date(oldest * 1000).toLocaleDateString() : '—', detail: 'Oldest transaction inside the currently returned recent-transaction window—not necessarily the wallet’s first transaction.' },
      { title: 'CHAIN TOLL', value: sol(a.feesSol || 0), detail: 'Total network fees in the loaded analysis range.' },
      { title: 'ACTIVE FOOTPRINT', value: `${fmt(t.activeDays || 0)} days`, detail: `${fmt(a.signaturesAnalyzed || 0)} transactions analyzed across the selected range.` }
    ];
  }

  function renderScoreRing(score) {
    const ring = el('div', 'bull-dna-ring');
    ring.style.setProperty('--score', String(clamp(score)));
    ring.append(el('b', '', String(clamp(score))));
    return ring;
  }

  function renderBundle(bundle) {
    state.last = bundle;
    const root = $('bullIntelResult');
    if (!root) return;
    root.replaceChildren();
    const coverage = coverageOf(bundle);
    const dna = deriveDNA(bundle);
    const museum = deriveMuseum(bundle);

    const head = el('section', 'bull-intel-hero');
    const copy = el('div');
    copy.append(el('small', 'bull-intel-kicker', 'BULL DNA'), el('h3', '', dna.archetype.name), el('p', '', dna.archetype.line));
    const badge = el('span', `bull-intel-coverage ${coverage.historyComplete ? 'is-full' : 'is-partial'}`, coverage.label);
    head.append(copy, badge);
    root.append(head);

    const grid = el('div', 'bull-dna-grid');
    dna.dimensions.forEach(item => {
      const card = el('article', 'bull-dna-card');
      card.append(renderScoreRing(item.score));
      const body = el('div');
      body.append(el('b', '', item.label), el('p', '', item.why));
      card.append(body); grid.append(card);
    });
    root.append(grid);

    const museumHead = el('div', 'bull-intel-section-head');
    museumHead.append(el('small', '', 'WALLET MUSEUM'), el('span', '', `${coverage.range.toUpperCase()} · ${fmt(coverage.signatures)} TX`));
    root.append(museumHead);
    const museumGrid = el('div', 'bull-museum-grid');
    museum.forEach(item => {
      const card = el('article', 'bull-museum-card');
      card.append(el('small', '', item.title), el('strong', '', item.value), el('p', '', item.detail));
      museumGrid.append(card);
    });
    root.append(museumGrid);

    const trust = el('p', 'bull-intel-trust', 'Scores are explainable behavioral proxies from public-chain activity, not personality judgments. Partial history is never presented as complete history.');
    root.append(trust);
  }

  async function analyzePrimary() {
    const input = $('bullIntelWallet');
    const range = $('bullIntelRange')?.value || '90d';
    const address = String(input?.value || global.BBRWalletAnalytics?.getState?.().address || global.profile?.publicWallet || '').trim();
    if (!addrOk(address)) return global.toast?.('Enter a valid public Solana address');
    const button = $('bullIntelRun');
    if (button) { button.disabled = true; button.textContent = 'READING CHAIN…'; }
    const root = $('bullIntelResult'); if (root) root.innerHTML = '<div class="bull-intel-loading">BUILDING WALLET DNA…</div>';
    try {
      renderBundle(await fetchWallet(address, range));
    } catch (error) {
      if (root) root.textContent = error?.message || 'Bull Intelligence unavailable.';
    } finally {
      if (button) { button.disabled = false; button.textContent = 'BUILD BULL DNA'; }
    }
  }

  function rivalryScore(bundle) {
    const dna = deriveDNA(bundle);
    const a = bundle.activity || {};
    const o = bundle.overview || {};
    return {
      dna,
      dimensions: {
        Conviction: dna.dimensions.find(x => x.key === 'conviction')?.score || 0,
        Exploration: dna.dimensions.find(x => x.key === 'curiosity')?.score || 0,
        Pacing: dna.dimensions.find(x => x.key === 'pacing')?.score || 0,
        Execution: dna.dimensions.find(x => x.key === 'reliability')?.score || 0,
        Activity: clamp(Math.log10(Math.max(1, Number(a.signaturesAnalyzed || 0))) * 36),
        Portfolio: clamp(Math.log10(Math.max(1, Number(o.totalUsdValue || 0))) * 20)
      }
    };
  }

  async function runRivalry() {
    const a = String($('bullRivalA')?.value || '').trim();
    const b = String($('bullRivalB')?.value || '').trim();
    const range = $('bullIntelRange')?.value || '90d';
    if (!addrOk(a) || !addrOk(b)) return global.toast?.('Enter two valid public Solana addresses');
    const button = $('bullRivalRun'); if (button) { button.disabled = true; button.textContent = 'MATCHING…'; }
    const root = $('bullRivalResult'); if (root) root.innerHTML = '<div class="bull-intel-loading">SCORING ROUNDS…</div>';
    try {
      const [left, right] = await Promise.all([fetchWallet(a, range), fetchWallet(b, range)]);
      const L = rivalryScore(left), R = rivalryScore(right);
      let lWins = 0, rWins = 0;
      root.replaceChildren();
      const rounds = el('div', 'bull-rival-rounds');
      Object.keys(L.dimensions).forEach(label => {
        const lv = L.dimensions[label], rv = R.dimensions[label];
        if (lv > rv) lWins++; else if (rv > lv) rWins++;
        const row = el('article', 'bull-rival-round');
        row.append(el('b', lv > rv ? 'winner' : '', String(lv)), el('span', '', label), el('b', rv > lv ? 'winner' : '', String(rv)));
        rounds.append(row);
      });
      const outcome = el('div', 'bull-rival-outcome');
      outcome.append(el('small', '', `${short(a)}  VS  ${short(b)}`), el('h3', '', lWins === rWins ? 'DRAW' : lWins > rWins ? `${short(a)} WINS ${lWins}-${rWins}` : `${short(b)} WINS ${rWins}-${lWins}`), el('p', '', 'Entertainment scorecard from transparent public-chain dimensions. No wagering and no prediction.'));
      root.append(outcome, rounds);
      state.rival = { a: left, b: right, lWins, rWins };
    } catch (error) {
      if (root) root.textContent = error?.message || 'Wallet Rivalry unavailable.';
    } finally {
      if (button) { button.disabled = false; button.textContent = 'START RIVALRY'; }
    }
  }

  function injectStyles() {
    if ($('bullIntelligenceStyles')) return;
    const style = document.createElement('style');
    style.id = 'bullIntelligenceStyles';
    style.textContent = `
      #bullDeepIntelligencePanel{display:grid;gap:14px}.bull-intel-controls{display:grid;grid-template-columns:1fr auto;gap:8px}.bull-intel-controls select{grid-column:1/-1}.bull-intel-result{display:grid;gap:14px}.bull-intel-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.025)}.bull-intel-hero h3{margin:3px 0 5px;font-size:23px}.bull-intel-hero p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}.bull-intel-kicker,.bull-intel-section-head small{color:var(--g2);font-weight:900;letter-spacing:.14em}.bull-intel-coverage{white-space:nowrap;padding:6px 8px;border:1px solid var(--line);border-radius:999px;font-size:9px;font-weight:900;letter-spacing:.08em}.bull-intel-coverage.is-full{color:var(--g2)}.bull-intel-coverage.is-partial{color:#f4c46f}.bull-dna-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.bull-dna-card{display:flex;gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:15px;background:rgba(255,255,255,.02)}.bull-dna-card>div:last-child{min-width:0}.bull-dna-card b{font-size:10px;letter-spacing:.08em}.bull-dna-card p{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.35}.bull-dna-ring{--score:0;display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;border-radius:50%;background:conic-gradient(var(--g2) calc(var(--score)*1%),rgba(255,255,255,.08) 0);position:relative}.bull-dna-ring::after{content:'';position:absolute;inset:5px;border-radius:50%;background:var(--panel,#111)}.bull-dna-ring b{position:relative;z-index:1;font-size:14px}.bull-intel-section-head{display:flex;justify-content:space-between;align-items:center}.bull-intel-section-head span{color:var(--muted);font-size:9px}.bull-museum-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.bull-museum-card{padding:13px;border:1px solid var(--line);border-radius:15px;background:rgba(255,255,255,.02)}.bull-museum-card small{color:var(--muted);font-size:9px;letter-spacing:.1em}.bull-museum-card strong{display:block;margin-top:6px;font-size:15px;overflow-wrap:anywhere}.bull-museum-card p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.4}.bull-intel-trust{margin:0;color:var(--muted);font-size:10px;line-height:1.45}.bull-intel-rivalry{display:grid;gap:10px;padding-top:8px;border-top:1px solid var(--line)}.bull-rival-inputs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bull-rival-inputs button{grid-column:1/-1}.bull-rival-result{display:grid;gap:10px}.bull-rival-outcome{text-align:center;padding:13px}.bull-rival-outcome h3{margin:5px 0}.bull-rival-outcome p{margin:0;color:var(--muted);font-size:10px}.bull-rival-rounds{display:grid;gap:6px}.bull-rival-round{display:grid;grid-template-columns:50px 1fr 50px;align-items:center;gap:8px;padding:9px 11px;border:1px solid var(--line);border-radius:11px;text-align:center}.bull-rival-round span{font-size:10px;letter-spacing:.08em;color:var(--muted)}.bull-rival-round b{font-size:13px}.bull-rival-round b.winner{color:var(--g2)}.bull-intel-loading{padding:25px;text-align:center;color:var(--muted);font-size:10px;font-weight:900;letter-spacing:.12em}.bull-intel-capabilities{display:flex;flex-wrap:wrap;gap:6px}.bull-intel-capabilities span{padding:6px 8px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:9px}.bull-intel-capabilities span.live{color:var(--g2)}
      @media(min-width:700px){.bull-intel-controls{grid-template-columns:1fr auto auto}.bull-intel-controls select{grid-column:auto}.bull-dna-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.bull-museum-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.bull-rival-inputs{grid-template-columns:1fr 1fr auto}.bull-rival-inputs button{grid-column:auto}}
    `;
    document.head.append(style);
  }

  function injectPanel() {
    if ($('bullDeepIntelligencePanel')) return true;
    const switcher = document.querySelector('#intelligencePanel .analytics-switch');
    const hub = document.querySelector('#intelligencePanel .intelligence-hub');
    if (!switcher || !hub) return false;

    const tab = el('button', 'tab', 'Bull Intelligence');
    tab.type = 'button'; tab.role = 'tab'; tab.dataset.analyticsTarget = 'bullDeepIntelligencePanel'; tab.setAttribute('aria-selected', 'false');
    tab.addEventListener('click', openPanel);
    switcher.append(tab);

    const panel = el('section', 'analytics-pane nft-subsection');
    panel.id = 'bullDeepIntelligencePanel'; panel.hidden = true;
    panel.innerHTML = `
      <div class="bull-intel-capabilities" aria-label="Bull Intelligence capabilities"><span class="live">BULL DNA · LIVE</span><span class="live">WALLET MUSEUM · LIVE</span><span class="live">RIVALRIES · LIVE</span><span>TIME MACHINE · ARCHIVAL</span><span>GHOST PORTFOLIO · ARCHIVAL</span><span>RADAR · INDEXER</span></div>
      <div class="bull-intel-controls"><input class="input" id="bullIntelWallet" placeholder="Public Solana wallet" autocomplete="off" spellcheck="false"/><select id="bullIntelRange"><option value="30d">30 days</option><option value="90d" selected>90 days</option><option value="all">Available history</option></select><button class="primary" id="bullIntelRun" type="button">BUILD BULL DNA</button></div>
      <div class="bull-intel-result" id="bullIntelResult"><p class="notice">Enter a public wallet to build its explainable Bull DNA and Wallet Museum.</p></div>
      <section class="bull-intel-rivalry"><div class="bull-intel-section-head"><small>WALLET RIVALRY</small><span>PUBLIC ADDRESSES ONLY</span></div><div class="bull-rival-inputs"><input class="input" id="bullRivalA" placeholder="Wallet A" autocomplete="off" spellcheck="false"/><input class="input" id="bullRivalB" placeholder="Wallet B" autocomplete="off" spellcheck="false"/><button class="secondary" id="bullRivalRun" type="button">START RIVALRY</button></div><div class="bull-rival-result" id="bullRivalResult"></div></section>`;
    hub.append(panel);

    $('bullIntelRun')?.addEventListener('click', analyzePrimary);
    $('bullIntelWallet')?.addEventListener('keydown', e => { if (e.key === 'Enter') analyzePrimary(); });
    $('bullRivalRun')?.addEventListener('click', runRivalry);
    return true;
  }

  function openPanel() {
    document.querySelectorAll('#intelligencePanel .analytics-switch .tab').forEach(button => {
      const active = button.dataset.analyticsTarget === 'bullDeepIntelligencePanel';
      button.classList.toggle('active', active); button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#intelligencePanel .analytics-pane').forEach(panel => {
      const active = panel.id === 'bullDeepIntelligencePanel'; panel.hidden = !active; panel.classList.toggle('active', active);
    });
    const known = global.BBRWalletAnalytics?.getState?.().address || global.profile?.publicWallet || '';
    if (known && $('bullIntelWallet') && !$('bullIntelWallet').value) $('bullIntelWallet').value = known;
    if (known && $('bullRivalA') && !$('bullRivalA').value) $('bullRivalA').value = known;
  }

  function init() {
    injectStyles();
    if (!injectPanel()) {
      setTimeout(() => injectPanel(), 600);
    }
    global.addEventListener('bbrs:wallet-analysis-complete', () => {
      const s = global.BBRWalletAnalytics?.getState?.();
      if (s?.address && $('bullIntelWallet') && !$('bullIntelWallet').value) $('bullIntelWallet').value = s.address;
    });
  }

  global.BBRBullIntelligence = Object.freeze({ init, deriveDNA, deriveMuseum, fetchWallet, getState: () => ({ ...state }) });
})(window);
