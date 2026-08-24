/* A Bulls App — Time Machine + Parallel Universe
 * Read-only historical exploration. Uses only normalized/visible public-chain observations.
 * Missing archival prices or position deltas are shown as unavailable rather than invented.
 */
(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  const fmt = (value, digits = 2) => Number.isFinite(Number(value))
    ? Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })
    : '—';
  const usd = value => Number.isFinite(Number(value))
    ? Number(value).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    : '—';

  function walletState() {
    return global.BBRWalletAnalytics?.getState?.() || {};
  }

  function observedEvents(state = walletState()) {
    const activity = state.activity || {};
    const source = Array.isArray(activity.normalizedEvents) && activity.normalizedEvents.length
      ? activity.normalizedEvents
      : Array.isArray(activity.events) && activity.events.length
        ? activity.events
        : Array.isArray(activity.recent) ? activity.recent : [];
    return source.map(tx => ({
      ...tx,
      wallet: tx.wallet || state.address || '',
      feeLamports: tx.feeLamports ?? tx.fee_lamports ?? (Number.isFinite(Number(tx.feeSol)) ? Math.round(Number(tx.feeSol) * 1_000_000_000) : undefined)
    }));
  }

  function eventBounds(events = []) {
    const times = events.map(row => Number(row.blockTime || row.block_time || row.timestamp || 0)).filter(value => value > 0).sort((a, b) => a - b);
    return times.length ? { first: times[0], last: times[times.length - 1] } : { first: null, last: null };
  }

  function reconstruct(events, timestamp) {
    return global.BBRIntelligenceCore?.reconstructAt?.(events, timestamp) || null;
  }

  function simulate(events, holdSeconds) {
    return global.BBRIntelligenceCore?.simulateFixedHold?.(events, { holdSeconds }) || null;
  }

  function make(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function formatDate(timestamp) {
    return timestamp ? new Date(timestamp * 1000).toLocaleString() : '—';
  }

  function renderSliceOutput(root, events, timestamp) {
    const slice = reconstruct(events, timestamp);
    if (!slice) return;
    root.replaceChildren();
    const stats = make('div', 'time-machine-stats');
    [
      ['VISIBLE DATE', formatDate(timestamp)],
      ['EVENTS SEEN', fmt(slice.eventCount)],
      ['NETWORK FEES', `${fmt(slice.feesSol, 6)} SOL`],
      ['POSITION DELTAS', fmt(slice.positions?.length || 0)]
    ].forEach(([label, value]) => {
      const item = make('div', 'time-machine-stat');
      item.append(make('small', '', label), make('b', '', value));
      stats.append(item);
    });
    root.append(stats);

    if (slice.positions?.length) {
      const positions = make('div', 'time-machine-positions');
      slice.positions.slice(0, 8).forEach(position => {
        const row = make('div', 'time-machine-position');
        row.append(make('span', '', position.mint || 'TOKEN'), make('b', '', `${position.quantityDelta >= 0 ? '+' : ''}${fmt(position.quantityDelta, 6)}`));
        positions.append(row);
      });
      root.append(positions);
    } else {
      root.append(make('p', 'notice', 'This loaded transaction window contains timestamps and fees, but not enough decoded token deltas to reconstruct historical positions yet.'));
    }
    root.append(make('p', 'bull-intel-trust', 'This is a time slice of the observations currently loaded in the app. It is not represented as the wallet’s complete historical state.'));
  }

  function renderTimeMachine(root, state) {
    const events = observedEvents(state);
    const bounds = eventBounds(events);
    const card = make('section', 'panel intelligence-history-card');
    const head = make('div', 'intelligence-lab-head');
    head.append(make('b', '', 'WALLET TIME MACHINE'), make('small', '', bounds.first ? 'VISIBLE HISTORY' : 'INDEX REQUIRED'));
    card.append(head);

    if (!bounds.first || bounds.first === bounds.last) {
      card.append(make('p', 'notice', 'Load wallet activity with multiple timestamps to explore a visible-history time slice. Deep history activates when the normalized index is available.'));
      root.append(card);
      return;
    }

    const control = make('div', 'time-machine-control');
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(bounds.first);
    range.max = String(bounds.last);
    range.step = '1';
    range.value = String(bounds.last);
    range.setAttribute('aria-label', 'Wallet Time Machine timestamp');
    const dates = make('div', 'time-machine-dates');
    dates.append(make('span', '', formatDate(bounds.first)), make('span', '', formatDate(bounds.last)));
    control.append(range, dates);
    card.append(control);
    const output = make('div', 'time-machine-output');
    card.append(output);
    renderSliceOutput(output, events, Number(range.value));
    range.addEventListener('input', () => renderSliceOutput(output, events, Number(range.value)));
    root.append(card);
  }

  function renderSimulationOutput(root, events, seconds) {
    const result = simulate(events, seconds);
    root.replaceChildren();
    if (!result || !result.buyLegs) {
      root.append(make('p', 'notice', 'Parallel Universe requires observed swap-like entries plus historical price observations. Those prices are not available in the current wallet payload.'));
      return;
    }
    const stats = make('div', 'time-machine-stats');
    [
      ['OBSERVED ENTRIES', fmt(result.buyLegs)],
      ['PRICED LEGS', fmt(result.pricedLegs)],
      ['SIMULATED P/L', usd(result.simulatedPnlUsd)],
      ['SIMULATED RETURN', result.returnPercent == null ? '—' : `${fmt(result.returnPercent, 2)}%`]
    ].forEach(([label, value]) => {
      const item = make('div', 'time-machine-stat');
      item.append(make('small', '', label), make('b', '', value));
      stats.append(item);
    });
    root.append(stats, make('p', 'bull-intel-trust', result.coverage?.statement || 'Historical simulation uses only supplied observations.'));
  }

  function renderParallelUniverse(root, state) {
    const events = observedEvents(state);
    const card = make('section', 'panel intelligence-history-card');
    const head = make('div', 'intelligence-lab-head');
    head.append(make('b', '', 'PARALLEL UNIVERSE'), make('small', '', 'HISTORICAL RULE LAB'));
    card.append(head);

    const controls = make('div', 'parallel-controls');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Historical fixed holding period');
    [
      ['1 day', 86400],
      ['7 days', 604800],
      ['30 days', 2592000],
      ['90 days', 7776000]
    ].forEach(([label, value]) => {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = `Hold every observed entry for ${label}`;
      select.append(option);
    });
    controls.append(select);
    card.append(controls);
    const output = make('div', 'parallel-output');
    card.append(output);
    renderSimulationOutput(output, events, Number(select.value));
    select.addEventListener('change', () => renderSimulationOutput(output, events, Number(select.value)));
    card.append(make('p', 'bull-intel-trust', 'Parallel Universe replays a user-selected rule against observed historical data. It does not recommend a strategy or predict future performance.'));
    root.append(card);
  }

  function injectStyles() {
    if ($('intelligenceTimeMachineStyles')) return;
    const style = document.createElement('style');
    style.id = 'intelligenceTimeMachineStyles';
    style.textContent = `
      #intelligenceHistoryRoot{display:grid;gap:12px;margin-top:12px}.intelligence-history-card{display:grid;gap:12px}.time-machine-control{display:grid;gap:7px}.time-machine-control input[type=range]{width:100%;accent-color:var(--g2)}.time-machine-dates{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:9px}.time-machine-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.time-machine-stat{display:grid;gap:4px;padding:10px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.018)}.time-machine-stat small{font-size:8px;color:var(--muted)}.time-machine-stat b{font-size:12px}.time-machine-positions{display:grid;gap:5px}.time-machine-position{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:8px;border-bottom:1px solid var(--line);font-size:10px}.time-machine-position span{overflow:hidden;text-overflow:ellipsis}.parallel-controls select{width:100%}@media(max-width:380px){.time-machine-stats{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function render() {
    const host = $('bullDeepIntelligencePanel') || $('intelligenceLabRoot')?.parentElement;
    if (!host || !global.BBRIntelligenceCore) return false;
    let root = $('intelligenceHistoryRoot');
    if (!root) {
      root = make('div', 'intelligence-history-root');
      root.id = 'intelligenceHistoryRoot';
      host.append(root);
    }
    root.replaceChildren();
    const state = walletState();
    renderTimeMachine(root, state);
    renderParallelUniverse(root, state);
    return true;
  }

  function init() {
    injectStyles();
    render();
    global.addEventListener('bbrs:wallet-analysis-complete', render);
    global.addEventListener('bbrs:journey-unlocked', render);
  }

  global.BBRIntelligenceHistory = Object.freeze({ init, render, observedEvents, eventBounds, reconstruct, simulate });
})(window);
