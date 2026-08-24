/* A Bulls App — chain-reactive Bull Invaders atmosphere
 * Cosmetic presentation only. Never changes game state, collision, scoring, spawn rates,
 * weapons, hitboxes, replay data, movement, timers, or Ranked presentation.
 */
(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  const SAFE_REGIMES = new Set(['clear', 'calm', 'heat', 'heat-wave', 'fog', 'storm', 'migration', 'rotation', 'convergence', 'nft-surge', 'whale-migration']);
  const state = { regime: 'clear', loading: false, timer: null };

  function selectedMode() {
    return document.querySelector('input[name="invaderMode"]:checked')?.value || 'ranked';
  }

  function isCampaign() {
    return selectedMode() === 'arcade';
  }

  function normalizedRegime(value) {
    const key = String(value || 'clear').toLowerCase().trim().replace(/\s+/g, '-');
    return SAFE_REGIMES.has(key) ? key : 'clear';
  }

  function ensureLayer() {
    const area = $('invadersArea');
    if (!area) return null;
    let layer = $('chainWeatherAtmosphere');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'chainWeatherAtmosphere';
      layer.className = 'chain-weather-atmosphere';
      layer.setAttribute('aria-hidden', 'true');
      area.append(layer);
    }
    return layer;
  }

  function apply() {
    const layer = ensureLayer();
    if (!layer) return false;
    const campaign = isCampaign();
    layer.hidden = !campaign;
    layer.dataset.regime = campaign ? state.regime : 'off';
    document.body.dataset.campaignChainWeather = campaign ? state.regime : 'off';
    return true;
  }

  async function refresh() {
    if (state.loading || !global.BBRSApi?.envelope) return;
    state.loading = true;
    try {
      const payload = await global.BBRSApi.envelope('/api/intelligence/weather', { timeoutMs: 8000 });
      if (payload?.state === 'ready' && payload?.weather?.regime) {
        state.regime = normalizedRegime(payload.weather.regime);
      } else {
        state.regime = 'clear';
      }
    } catch (_) {
      // The arcade never depends on analytics availability. A failed weather lookup
      // simply returns campaign presentation to its neutral cosmetic state.
      state.regime = 'clear';
    } finally {
      state.loading = false;
      apply();
    }
  }

  function injectStyles() {
    if ($('chainWeatherAtmosphereStyles')) return;
    const style = document.createElement('style');
    style.id = 'chainWeatherAtmosphereStyles';
    style.textContent = `
      #invadersArea{isolation:isolate}.chain-weather-atmosphere{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;opacity:.34;mix-blend-mode:screen;contain:strict}.chain-weather-atmosphere::before,.chain-weather-atmosphere::after{content:'';position:absolute;inset:-20%;pointer-events:none;opacity:0}.chain-weather-atmosphere[data-regime="clear"]{opacity:.12;background:radial-gradient(circle at 50% 15%,rgba(116,255,218,.18),transparent 38%)}.chain-weather-atmosphere[data-regime="calm"]{opacity:.15;background:linear-gradient(180deg,rgba(83,121,180,.12),transparent 55%)}.chain-weather-atmosphere[data-regime="heat"],.chain-weather-atmosphere[data-regime="heat-wave"]{background:radial-gradient(circle at 50% 105%,rgba(255,130,80,.34),transparent 55%)}.chain-weather-atmosphere[data-regime="heat"]::before,.chain-weather-atmosphere[data-regime="heat-wave"]::before{opacity:.22;background:repeating-linear-gradient(92deg,transparent 0 17px,rgba(255,220,160,.18) 18px 19px);animation:chainHeat 7s linear infinite}.chain-weather-atmosphere[data-regime="fog"]::before{opacity:.28;background:repeating-linear-gradient(0deg,transparent 0 36px,rgba(205,220,230,.16) 37px 54px);filter:blur(8px);animation:chainFog 13s ease-in-out infinite alternate}.chain-weather-atmosphere[data-regime="storm"]{opacity:.38;background:radial-gradient(circle at 30% 20%,rgba(133,100,255,.2),transparent 44%),linear-gradient(180deg,rgba(15,20,42,.32),transparent)}.chain-weather-atmosphere[data-regime="storm"]::after{opacity:.18;background:repeating-linear-gradient(114deg,transparent 0 44px,rgba(210,235,255,.4) 45px 46px);animation:chainStorm 1.8s linear infinite}.chain-weather-atmosphere[data-regime="migration"],.chain-weather-atmosphere[data-regime="rotation"]{background:conic-gradient(from 0deg at 50% 50%,transparent,rgba(81,255,194,.2),transparent,rgba(142,91,255,.18),transparent)}.chain-weather-atmosphere[data-regime="migration"]::before,.chain-weather-atmosphere[data-regime="rotation"]::before{opacity:.34;background:inherit;animation:chainRotate 18s linear infinite}.chain-weather-atmosphere[data-regime="convergence"],.chain-weather-atmosphere[data-regime="whale-migration"]{background:radial-gradient(circle at center,rgba(73,240,214,.25) 0 2%,transparent 3% 17%,rgba(73,240,214,.11) 18% 19%,transparent 20% 36%,rgba(156,112,255,.1) 37% 38%,transparent 39%)}.chain-weather-atmosphere[data-regime="convergence"]::before,.chain-weather-atmosphere[data-regime="whale-migration"]::before{opacity:.32;background:inherit;animation:chainPulse 5s ease-in-out infinite}.chain-weather-atmosphere[data-regime="nft-surge"]{background:radial-gradient(circle at 20% 25%,rgba(255,105,225,.22),transparent 18%),radial-gradient(circle at 76% 38%,rgba(65,229,255,.2),transparent 20%),radial-gradient(circle at 45% 80%,rgba(255,220,93,.16),transparent 18%)}.chain-weather-atmosphere[data-regime="nft-surge"]::after{opacity:.26;background:repeating-conic-gradient(from 45deg,transparent 0 12deg,rgba(255,255,255,.14) 13deg 14deg);animation:chainRotate 28s linear infinite}@keyframes chainHeat{to{transform:translate3d(40px,-18px,0)}}@keyframes chainFog{from{transform:translate3d(-4%,0,0)}to{transform:translate3d(4%,2%,0)}}@keyframes chainStorm{to{transform:translate3d(-30px,45px,0)}}@keyframes chainRotate{to{transform:rotate(360deg)}}@keyframes chainPulse{50%{transform:scale(1.16);opacity:.15}}@media(prefers-reduced-motion:reduce){.chain-weather-atmosphere::before,.chain-weather-atmosphere::after{animation:none!important}}body[data-reduced-motion="true"] .chain-weather-atmosphere::before,body[data-reduced-motion="true"] .chain-weather-atmosphere::after{animation:none!important}
    `;
    document.head.append(style);
  }

  function init() {
    injectStyles();
    ensureLayer();
    apply();
    document.querySelectorAll('input[name="invaderMode"]').forEach(input => input.addEventListener('change', () => {
      apply();
      if (isCampaign()) refresh();
    }));
    refresh();
    // Low-frequency refresh only; gameplay never waits for it and no per-frame analytics work is added.
    state.timer = global.setInterval(refresh, 5 * 60 * 1000);
  }

  global.BBRCampaignChainWeather = Object.freeze({ init, refresh, apply, normalizedRegime, isCampaign });
})(window);
