/* A Bulls App — Where Were You?
 * Read-only timeline built only from public wallet timestamps already loaded by the app.
 * It never invents missing history and never infers real-world identity or location.
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
    return s.length > 13 ? `${s.slice(0, 6)}…${s.slice(-5)}` : s;
  };

  function stateOf() {
    return global.BBRWalletAnalytics?.getState?.() || {};
  }

  function timestampOf(row = {}) {
    const raw = row.blockTime ?? row.timestamp ?? row.time ?? 0;
    if (typeof raw === 'number') return raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
  }

  function derive(state = stateOf()) {
    const activity = state.activity || {};
    const trading = activity.trading || {};
    const recent = (Array.isArray(activity.recent) ? activity.recent : [])
      .map(row => ({ ...row, _time: timestampOf(row) }))
      .filter(row => row._time > 0)
      .sort((a, b) => a._time - b._time);

    if (!state.address || !recent.length) {
      return {
        address: state.address || '',
        coverage: activity.historyComplete === true ? 'range-covered' : 'partial',
        events: [],
        note: 'Load a public wallet with timestamped activity to build this timeline.'
      };
    }

    const first = recent[0];
    const last = recent[recent.length - 1];
    const spanDays = Math.max(0, Math.round((last._time - first._time) / 86400));
    const events = [
      {
        key: 'earliest-loaded',
        label: 'EARLIEST LOADED TRACE',
        time: first._time,
        detail: 'Oldest timestamp in the currently returned transaction window.'
      },
      {
        key: 'busiest-weekday',
        label: 'BUSIEST LOADED DAY',
        value: trading.busiestWeekday || '—',
        detail: trading.busiestHour != null
          ? `${String(trading.busiestHour).padStart(2, '0')}:00 UTC was the busiest loaded hour.`
          : 'No busiest-hour statistic is available for this range.'
      },
      {
        key: 'latest-loaded',
        label: 'LATEST LOADED TRACE',
        time: last._time,
        detail: 'Most recent timestamp in the currently returned transaction window.'
      },
      {
        key: 'visible-span',
        label: 'VISIBLE SPAN',
        value: `${spanDays.toLocaleString()} days`,
        detail: `${Number(activity.signaturesAnalyzed || recent.length).toLocaleString()} transactions were analyzed in the selected range.`
      }
    ];

    return {
      address: state.address,
      range: state.range || activity.range || '',
      coverage: activity.historyComplete === true ? 'range-covered' : 'partial',
      events,
      note: activity.historyComplete === true
        ? 'The selected analysis range is covered. This still does not claim to be the wallet’s complete lifetime history.'
        : 'Partial history: only timestamps actually returned by the analytics service are shown.'
    };
  }

  function render() {
    const lab = $('intelligenceLabRoot');
    const host = lab?.parentElement || $('bullDeepIntelligencePanel') || $('bullIntelResult')?.parentElement;
    if (!host) return false;

    let root = $('whereWereYouRoot');
    if (!root) {
      root = make('section', 'panel where-were-you-card');
      root.id = 'whereWereYouRoot';
      const environment = $('bullEnvironmentRoot');
      if (environment) environment.insertAdjacentElement('afterend', root);
      else if (lab) lab.insertAdjacentElement('afterend', root);
      else host.append(root);
    }

    const model = derive();
    root.replaceChildren();

    const head = make('div', 'where-were-you-head');
    const copy = make('div');
    copy.append(make('small', '', 'PUBLIC WALLET TIMELINE'), make('b', '', 'WHERE WERE YOU?'));
    head.append(copy);
    if (model.address) head.append(make('span', '', short(model.address)));
    root.append(head);

    if (!model.events.length) {
      root.append(make('div', 'where-were-you-empty', model.note));
      return true;
    }

    const timeline = make('div', 'where-were-you-timeline');
    model.events.forEach(event => {
      const row = make('article', 'where-were-you-row');
      const marker = make('span', 'where-were-you-marker');
      const body = make('div');
      body.append(make('small', '', event.label));
      const value = event.time
        ? new Date(event.time * 1000).toLocaleString()
        : event.value || '—';
      body.append(make('strong', '', value), make('p', '', event.detail));
      row.append(marker, body);
      timeline.append(row);
    });
    root.append(timeline, make('p', 'bull-intel-trust', model.note));
    return true;
  }

  function injectStyles() {
    if ($('whereWereYouStyles')) return;
    const style = document.createElement('style');
    style.id = 'whereWereYouStyles';
    style.textContent = `
      .where-were-you-card{display:grid;gap:12px;margin-top:12px}.where-were-you-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.where-were-you-head>div{display:grid;gap:2px}.where-were-you-head small{font-size:8px;letter-spacing:.12em;color:var(--muted)}.where-were-you-head>b,.where-were-you-head div>b{font-size:15px}.where-were-you-head>span{font-size:9px;color:var(--g2)}.where-were-you-empty{padding:16px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);font-size:10px;line-height:1.5}.where-were-you-timeline{position:relative;display:grid;gap:4px}.where-were-you-timeline::before{content:'';position:absolute;left:8px;top:12px;bottom:12px;width:1px;background:var(--line)}.where-were-you-row{position:relative;display:grid;grid-template-columns:17px 1fr;gap:10px;padding:9px 0}.where-were-you-marker{z-index:1;width:9px;height:9px;margin-top:5px;border-radius:50%;border:1px solid var(--g2);background:var(--card);box-shadow:var(--glow)}.where-were-you-row>div{display:grid;gap:3px}.where-were-you-row small{font-size:8px;letter-spacing:.08em;color:var(--muted)}.where-were-you-row strong{font-size:12px}.where-were-you-row p{margin:0;color:var(--muted);font-size:9px;line-height:1.45}
    `;
    document.head.append(style);
  }

  function init() {
    injectStyles();
    let attempts = 0;
    const ready = () => {
      attempts += 1;
      if (render()) return true;
      return attempts >= 20;
    };
    if (!ready()) {
      const timer = setInterval(() => { if (ready()) clearInterval(timer); }, 250);
    }
    global.addEventListener('bbrs:wallet-analysis-complete', render);
  }

  global.BBRWhereWereYou = Object.freeze({ init, render, derive, timestampOf });
})(window);
