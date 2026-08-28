/* A Bulls App — Dusk Atelier shared interaction layer. */
(function duskAtelierInteractions(global) {
  'use strict';

  const CARD_SELECTOR = [
    '.signal-card',
    '.ecosystem-stat-card',
    '.notable-wallet-row',
    '#trackView .metric-grid > article',
    '#trackView .metric-grid > div',
    '#trackView .nft-window-grid > article',
    '#trackView .nft-window-grid > div'
  ].join(',');

  const INTERACTIVE_CHILD = 'a,button,input,select,textarea,summary,[role="button"]';
  let inspector;
  let labelNode;
  let valueNode;
  let contextNode;
  let activeCard;
  let returnFocus;

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function firstText(card, selectors) {
    for (const selector of selectors) {
      const node = card.querySelector(selector);
      const text = clean(node?.textContent);
      if (text) return text;
    }
    return '';
  }

  function describe(card) {
    const label = clean(card.dataset.insightLabel) || firstText(card, [
      ':scope > small',
      '.ecosystem-card-head b',
      ':scope > b',
      '.left b',
      '.sym'
    ]) || 'Analytics detail';
    const value = clean(card.dataset.insightValue) || firstText(card, [
      ':scope > strong',
      ':scope > b',
      '.buyback-stat-grid strong',
      '.right strong',
      '.right b'
    ]) || 'Live value unavailable';
    const context = clean(card.dataset.insight) || firstText(card, [
      ':scope > span:not(.ecosystem-source-mark)',
      ':scope > time',
      '.right small',
      ':scope > p'
    ]) || 'This value reflects the latest public data currently loaded by A Bulls App.';
    return { label, value, context };
  }

  function buildInspector() {
    inspector = document.createElement('div');
    inspector.className = 'analytics-inspector';
    inspector.id = 'analyticsInspector';
    inspector.setAttribute('role', 'dialog');
    inspector.setAttribute('aria-modal', 'true');
    inspector.setAttribute('aria-labelledby', 'analyticsInspectorLabel');
    inspector.setAttribute('aria-hidden', 'true');
    inspector.innerHTML = [
      '<section class="analytics-inspector__sheet">',
      '  <header class="analytics-inspector__head">',
      '    <div><small>ANALYTICS DETAIL</small><h2 id="analyticsInspectorLabel"></h2></div>',
      '    <button class="analytics-inspector__close" type="button" aria-label="Close analytics detail">×</button>',
      '  </header>',
      '  <div class="analytics-inspector__value"></div>',
      '  <p class="analytics-inspector__context"></p>',
      '</section>'
    ].join('');
    document.getElementById('app')?.appendChild(inspector);
    labelNode = inspector.querySelector('#analyticsInspectorLabel');
    valueNode = inspector.querySelector('.analytics-inspector__value');
    contextNode = inspector.querySelector('.analytics-inspector__context');
    inspector.querySelector('.analytics-inspector__close')?.addEventListener('click', closeInspector);
    inspector.addEventListener('pointerdown', event => {
      if (event.target === inspector) closeInspector();
    });
  }

  function openInspector(card) {
    if (!inspector) buildInspector();
    if (!inspector) return;
    const detail = describe(card);
    if (activeCard && activeCard !== card) {
      activeCard.classList.remove('is-inspecting');
      activeCard.setAttribute('aria-expanded', 'false');
    }
    activeCard = card;
    returnFocus = document.activeElement;
    card.classList.add('is-inspecting');
    card.setAttribute('aria-expanded', 'true');
    labelNode.textContent = detail.label;
    valueNode.textContent = detail.value;
    contextNode.textContent = detail.context;
    inspector.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      inspector.classList.add('is-open');
      inspector.querySelector('.analytics-inspector__close')?.focus({ preventScroll: true });
    });
  }

  function closeInspector() {
    if (!inspector?.classList.contains('is-open')) return;
    inspector.classList.remove('is-open');
    inspector.setAttribute('aria-hidden', 'true');
    if (activeCard) {
      activeCard.classList.remove('is-inspecting');
      activeCard.setAttribute('aria-expanded', 'false');
    }
    const target = returnFocus;
    activeCard = null;
    returnFocus = null;
    setTimeout(() => target?.focus?.({ preventScroll: true }), 180);
  }

  function decorate(root) {
    const nodes = [];
    if (root.nodeType === 1 && root.matches?.(CARD_SELECTOR)) nodes.push(root);
    root.querySelectorAll?.(CARD_SELECTOR).forEach(node => nodes.push(node));
    nodes.forEach(card => {
      if (card.dataset.duskInspectable === 'true') return;
      card.dataset.duskInspectable = 'true';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-expanded', 'false');
      const name = describe(card).label;
      if (!card.getAttribute('aria-label')) card.setAttribute('aria-label', `Inspect ${name}`);
    });
  }

  function activateFromEvent(event) {
    const card = event.target.closest?.(CARD_SELECTOR);
    if (!card || !document.getElementById('trackView')?.contains(card)) return;
    const interactive = event.target.closest?.(INTERACTIVE_CHILD);
    if (interactive && interactive !== card) return;
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    if (event.type === 'keydown') event.preventDefault();
    openInspector(card);
  }

  function init() {
    document.documentElement.classList.add('dusk-atelier-direction');
    document.body.classList.add('dusk-atelier-direction');
    buildInspector();
    const trackView = document.getElementById('trackView');
    if (!trackView) return;
    decorate(trackView);
    trackView.addEventListener('click', activateFromEvent);
    trackView.addEventListener('keydown', activateFromEvent);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeInspector();
    });
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) decorate(node);
      }));
    });
    observer.observe(trackView, { childList: true, subtree: true });
  }

  global.DuskAtelier = Object.freeze({ init, openInspector, closeInspector });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
