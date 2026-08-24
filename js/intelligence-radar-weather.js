/* A Bulls App — Bull Radar + Solana Weather UI
 * Read-only visualization of Worker-computed aggregate public-chain observations.
 * Never converts anomaly/weather data into trading instructions.
 */
(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  const api = path => global.BBRSApi?.envelope
    ? global.BBRSApi.envelope(path, { timeoutMs: 12_000 })
    : Promise.reject(new Error('API unavailable'));
  const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));
  const pct = value => `${Math.round(clamp(Number(value) <= 1 ? Number(value) * 100 : value))}%`;

  const WEATHER = Object.freeze({
    clear: { symbol: '◯', label: 'CLEAR SKIES' },
    calm: { symbol: '◯', label: 'CALM' },
    heat: { symbol: '☀', label: 'HEAT WAVE' },
    'heat-wave': { symbol: '☀', label: 'HEAT WAVE' },
    fog: { symbol: '≋', label: 'FOG' },
    storm: { symbol: 'ϟ', label: 'STORM' },
    migration: { symbol: '⇢', label: 'MIGRATION' },
    rotation: { symbol: '↻', label: 'ROTATION' },
    convergence: { symbol: '◎', label: 'CONVERGENCE' },
    'nft-surge': { symbol: '◇', label: 'NFT SURGE' }
  });

  const state = { capabilities: null, radar: null, weather: null, loading: false };

  function make(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function weatherIdentity(regime) {
    const key = String(regime || 'calm').toLowerCase().replace(/\s+/g, '-');
    return WEATHER[key] || { symbol: '◌', label: key.replace(/-/g, ' ').toUpperCase() || 'OBSERVED' };
  }

  function evidenceObject(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (_) { return {}; }
  }

  function renderWeather(root) {
    const card = make('section', 'panel bull-weather-card');
    const head = make('div', 'bull-environment-head');
    head.append(make('b', '', 'SOLANA WEATHER'));
    card.append(head);

    const payload = state.weather || {};
    if (payload.state && payload.state !== 'ready') {
      card.append(make('div', 'bull-environment-locked', 'INDEX REQUIRED'));
      root.append(card);
      return;
    }
    const weather = payload.weather;
    if (!weather) {
      card.append(make('div', 'bull-environment-locked', state.loading ? 'LOADING' : 'NO AGGREGATE WINDOW'));
      root.append(card);
      return;
    }

    const id = weatherIdentity(weather.regime);
    const hero = make('div', 'bull-weather-hero');
    hero.append(make('span', 'bull-weather-symbol', id.symbol));
    const copy = make('div');
    copy.append(make('strong', '', id.label));
    const bucket = Number(weather.bucket_start || weather.bucketStart || 0);
    if (bucket) copy.append(make('time', '', new Date(bucket * 1000).toLocaleString()));
    hero.append(copy);
    card.append(hero);

    const metrics = [
      ['ACTIVITY', weather.activity_score ?? weather.activityScore],
      ['VOLATILITY', weather.volatility_score ?? weather.volatilityScore],
      ['CONCENTRATION', weather.concentration_score ?? weather.concentrationScore],
      ['ROTATION', weather.rotation_score ?? weather.rotationScore],
      ['CONVERGENCE', weather.convergence_score ?? weather.convergenceScore],
      ['NFT', weather.nft_activity_score ?? weather.nftActivityScore]
    ].filter(([, value]) => Number.isFinite(Number(value)));
    const grid = make('div', 'bull-weather-metrics');
    metrics.forEach(([name, value]) => {
      const row = make('div', 'bull-weather-metric');
      const line = make('span', 'bull-weather-meter');
      line.style.setProperty('--value', `${clamp(value)}%`);
      row.append(make('small', '', name), line, make('b', '', pct(value)));
      grid.append(row);
    });
    card.append(grid);
    root.append(card);
  }

  function renderRadar(root) {
    const card = make('section', 'panel bull-radar-card');
    const head = make('div', 'bull-environment-head');
    head.append(make('b', '', 'BULL RADAR'));
    const refresh = make('button', 'secondary bull-environment-refresh', state.loading ? 'Refreshing…' : 'Refresh');
    refresh.type = 'button';
    refresh.disabled = state.loading;
    refresh.addEventListener('click', () => load(true));
    head.append(refresh);
    card.append(head);

    const payload = state.radar || {};
    if (payload.state && payload.state !== 'ready') {
      card.append(make('div', 'bull-environment-locked', 'INDEX REQUIRED'));
      root.append(card);
      return;
    }
    const anomalies = Array.isArray(payload.anomalies) ? payload.anomalies : [];
    if (!anomalies.length) {
      card.append(make('div', 'bull-environment-locked', state.loading ? 'SCANNING' : 'NO ACTIVE ANOMALIES'));
      root.append(card);
      return;
    }

    const list = make('div', 'bull-radar-list');
    anomalies.slice(0, 12).forEach(item => {
      const row = make('article', 'bull-radar-row');
      const severity = clamp(Number(item.severity || 0) <= 1 ? Number(item.severity || 0) * 100 : item.severity);
      const copy = make('div');
      const title = String(item.anomaly_key || item.key || 'unusual activity').replace(/[-_]+/g, ' ').toUpperCase();
      copy.append(make('b', '', title));
      const scope = [item.scope_type, item.scope_value].filter(Boolean).join(' · ');
      if (scope) copy.append(make('small', '', scope));
      const evidence = evidenceObject(item.evidence_json || item.evidence);
      const sample = Number(item.sample_size || evidence.sampleSize || 0);
      if (sample) copy.append(make('small', '', `${sample.toLocaleString()} observed wallets`));
      const meter = make('span', 'bull-radar-severity');
      meter.style.setProperty('--severity', `${severity}%`);
      const score = make('strong', '', `${Math.round(severity)}`);
      row.append(copy, meter, score);
      list.append(row);
    });
    card.append(list);
    root.append(card);
  }

  function render() {
    const lab = $('intelligenceLabRoot');
    const host = lab?.parentElement || $('bullDeepIntelligencePanel') || $('bullIntelResult')?.parentElement;
    if (!host) return false;
    let root = $('bullEnvironmentRoot');
    if (!root) {
      root = make('div', 'bull-environment-root');
      root.id = 'bullEnvironmentRoot';
      if (lab) lab.insertAdjacentElement('afterend', root); else host.append(root);
    }
    root.replaceChildren();
    renderWeather(root);
    renderRadar(root);
    return true;
  }

  async function load(force = false) {
    if (state.loading) return;
    state.loading = true;
    render();
    try {
      const suffix = force ? '?refresh=1' : '';
      const [cap, radar, weather] = await Promise.allSettled([
        api('/api/intelligence/capabilities'),
        api(`/api/intelligence/radar${suffix}`),
        api(`/api/intelligence/weather${suffix}`)
      ]);
      if (cap.status === 'fulfilled') state.capabilities = cap.value?.capabilities || cap.value;
      state.radar = radar.status === 'fulfilled' ? radar.value : { state: 'worker-update-required', anomalies: [] };
      state.weather = weather.status === 'fulfilled' ? weather.value : { state: 'worker-update-required', weather: null };
    } finally {
      state.loading = false;
      render();
    }
  }

  function injectStyles() {
    if ($('bullEnvironmentStyles')) return;
    const style = document.createElement('style');
    style.id = 'bullEnvironmentStyles';
    style.textContent = `
      .bull-environment-root{display:grid;gap:12px;margin-top:12px}.bull-environment-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.bull-environment-refresh{min-height:32px!important;padding:5px 10px!important;width:auto!important}.bull-environment-locked{padding:18px 12px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);font-size:10px;font-weight:900;text-align:center;letter-spacing:.12em}.bull-weather-hero{display:flex;align-items:center;gap:14px;padding:14px 0}.bull-weather-symbol{display:grid;place-items:center;width:62px;height:62px;border:1px solid var(--line);border-radius:50%;font-size:30px;color:var(--g2);box-shadow:var(--glow)}.bull-weather-hero div{display:grid;gap:4px}.bull-weather-hero strong{font-size:20px;letter-spacing:.05em}.bull-weather-hero time{color:var(--muted);font-size:9px}.bull-weather-metrics{display:grid;gap:8px}.bull-weather-metric{display:grid;grid-template-columns:92px minmax(0,1fr) 40px;align-items:center;gap:8px}.bull-weather-metric small{font-size:8px;letter-spacing:.08em}.bull-weather-metric>b{text-align:right;font-size:10px}.bull-weather-meter,.bull-radar-severity{position:relative;height:5px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}.bull-weather-meter::after{content:'';display:block;width:var(--value);height:100%;background:linear-gradient(90deg,var(--g2),var(--g));border-radius:inherit}.bull-radar-list{display:grid;gap:6px}.bull-radar-row{display:grid;grid-template-columns:minmax(0,1fr) 70px 28px;align-items:center;gap:8px;padding:10px;border-bottom:1px solid var(--line)}.bull-radar-row>div{display:grid;gap:3px}.bull-radar-row small{font-size:8px;color:var(--muted)}.bull-radar-row strong{text-align:right;color:var(--g2);font-size:11px}.bull-radar-severity::after{content:'';display:block;width:var(--severity);height:100%;background:var(--g2)}@media(max-width:390px){.bull-weather-metric{grid-template-columns:80px minmax(0,1fr) 36px}.bull-radar-row{grid-template-columns:minmax(0,1fr) 54px 24px}}
    `;
    document.head.append(style);
  }

  function init() {
    injectStyles();
    let attempts = 0;
    const ready = () => {
      attempts += 1;
      if (render()) { load(false); return true; }
      return attempts >= 20;
    };
    if (!ready()) {
      const timer = setInterval(() => { if (ready()) clearInterval(timer); }, 250);
    }
    global.addEventListener('bbrs:wallet-analysis-complete', () => load(false));
  }

  global.BBRRadarWeather = Object.freeze({ init, load, render, weatherIdentity });
})(window);
