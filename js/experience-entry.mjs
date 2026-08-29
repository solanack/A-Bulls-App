import { bootstrapNextExperience } from './experience-bootstrap.mjs';
import { ProductAdapterRegistry } from './product-adapters.mjs';
import { UniverseExperience } from './universe-experience.mjs';
import { IntelligenceWorkspace } from './intelligence-workspace-vnext.mjs';
import { TokenMarketWorkspace } from './token-market-workspace.mjs';
import { TricksterStudio } from './trickster-studio.mjs';
import { installTricksterFieldPlaybackBridge } from './trickster-field-playback.mjs';
import { validateStoryForExport } from './trickster-validation-client.mjs';
import { publishStoryManifest, storyShareUrl } from './trickster-share-client.mjs';
import { renderEventStoryVideo } from './event-story-video-export.mjs';
import { renderWalletComparisonVideo } from './wallet-comparison-video-export.mjs';
import { buildTricksterNarrationPlan } from './trickster-narration-plan.mjs';
import { applyExplicitEventStoryPriceSelection } from './event-story-price-selection.mjs';
import { loadThree } from './experience-dependencies.mjs';
import { attachQueryToField } from './query-field-attach.mjs';

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text != null) item.textContent = text;
  return item;
}

async function setup() {
  if (globalThis.__ABULLS_VNEXT_BOOTED) return;
  globalThis.__ABULLS_VNEXT_BOOTED = true;
  const flags = globalThis.BBR_EXPERIENCE_FLAGS || {};
  if (flags.nextProductShellEnabled !== true && String(flags.NEXT_PRODUCT_SHELL_ENABLED || '').toLowerCase() !== 'true') return;
  const universeRequested = flags.universeEnabled === true || String(flags.UNIVERSE_ENABLED || '').toLowerCase() === 'true';
  const tricksterRequested = flags.tricksterStudioEnabled === true || String(flags.TRICKSTER_STUDIO_ENABLED || '').toLowerCase() === 'true';
  const loadedThreePromise = universeRequested ? loadThree() : Promise.resolve(null);
  const existingThree = (globalThis.THREE && typeof globalThis.THREE.WebGLRenderer === 'function') ? globalThis.THREE : null;
  const THREE = existingThree;
  const legacyApp = document.getElementById('app');
  let app = null;
  let universe = null;
  const host = node('div');
  host.id = 'nextProductShell';
  document.body.append(host);
  const instances = new Map();
  const adapters = new ProductAdapterRegistry();
  let tricksterFieldCleanup = null;
  let queryAttach = null;
  const mount = (content, title, mode) => {
    if (content instanceof Element) app?.shell.mountWorkspace(content, { title, mode });
  };
  const bindTricksterField = (studio) => {
    tricksterFieldCleanup?.();
    const root = instances.get('tricksterHost');
    if (!(root instanceof Element) || !studio) return;
    tricksterFieldCleanup = installTricksterFieldPlaybackBridge({
      root,
      getState: () => studio.getFieldPlaybackState?.() || {}
    });
  };
  function openStory(bundle) {
    const sanitized = applyExplicitEventStoryPriceSelection(bundle);
    globalThis.BBR_TRICKSTER_EVIDENCE = sanitized;
    const content = adapters.activate('trickster', { source: 'create-story' });
    mount(content, 'CREATE · TRICKSTER', 'trickster');
    const studio = instances.get('trickster');
    studio?.loadEvidence(sanitized);
    bindTricksterField(studio);
  }
  function intelligenceProduct(context = {}) {
    const mountNode = node('div', 'intelligence-product-vnext');
    const switcher = node('div', 'intelligence-mode-switcher');
    const surface = node('div', 'intelligence-mode-surface');
    let active = null;
    const walletButton = node('button', 'secondary intelligence-mode-switcher__button', 'WALLET / TRANSACTION');
    const marketButton = node('button', 'secondary intelligence-mode-switcher__button', 'TOKEN MARKET');
    walletButton.type = marketButton.type = 'button';
    switcher.append(walletButton, marketButton);
    mountNode.append(switcher, surface);
    const setActive = (mode) => {
      walletButton.classList.toggle('active', mode === 'wallet');
      marketButton.classList.toggle('active', mode === 'market');
    };
    const destroyActive = () => {
      active?.destroy?.();
      active = null;
      surface.replaceChildren();
    };
    const showWallet = () => {
      destroyActive();
      setActive('wallet');
      active = new IntelligenceWorkspace({
        host: surface,
        apiBase: globalThis.BBRConfig?.apiBase || location.origin,
        onCreateStory: openStory
      });
      if (context.request) active.setRequest(context.request);
    };
    const showMarket = () => {
      const prefill = context.request?.token || context.request?.mint || context.request?.entityId || context.request?.query || '';
      destroyActive();
      setActive('market');
      active = new TokenMarketWorkspace({
        host: surface,
        apiBase: globalThis.BBRConfig?.apiBase || location.origin,
        prefillMint: prefill,
        onCreateStory: openStory
      });
    };
    const kind = String(context.request?.entityKind || context.request?.kind || '').toLowerCase();
    const destination = String(context.request?.destination || '').toLowerCase();
    const startsInMarket = kind === 'token' || kind === 'token-mint' || destination === 'market-sequence' || destination === 'sequences';
    walletButton.addEventListener('click', showWallet);
    marketButton.addEventListener('click', showMarket);
    startsInMarket ? showMarket() : showWallet();
    return { element: mountNode, destroy() { destroyActive(); mountNode.remove(); } };
  }

  adapters.register('universe', { activate() { return node('div'); } });
  adapters.register('intelligence', {
    activate(context = {}) {
      instances.get('intelligence')?.destroy();
      const product = intelligenceProduct(context);
      instances.set('intelligence', product);
      return product.element;
    },
    deactivate() {
      instances.get('intelligence')?.destroy();
      instances.delete('intelligence');
    }
  });
  adapters.register('trickster', {
    activate() {
      if (!tricksterRequested) {
        const n = node('section', 'product-home');
        n.append(node('h1', '', 'Creator unavailable'), node('p', '', 'The evidence-backed creator remains fail-closed until its validation/export path is enabled.'));
        return n;
      }
      tricksterFieldCleanup?.();
      tricksterFieldCleanup = null;
      instances.get('trickster')?.destroy();
      const studioHost = node('div');
      const studio = new TricksterStudio({
        host: studioHost,
        onOpenEvidence: () => {
          const content = adapters.activate('intelligence', { source: 'trickster' });
          mount(content, 'EVIDENCE', 'evidence');
        },
        onShare: async (manifest) => {
          const apiBase = globalThis.BBRConfig?.apiBase || location.origin;
          const published = await publishStoryManifest(manifest, { apiBase });
          const url = storyShareUrl(published.shareId, { origin: location.origin });
          return Object.freeze({ ...published, url });
        },
        onExport: async (detail) => {
          const validation = await validateStoryForExport(detail.manifest, { apiBase: globalThis.BBRConfig?.apiBase || location.origin });
          let rendering = null;
          const narration = validation.validated === true ? buildTricksterNarrationPlan(validation.manifest, detail.timeline) : null;
          const progress = { onProgress: (item) => globalThis.dispatchEvent(new CustomEvent('abulls:trickster-render-progress', { detail: item })) };
          if (validation.validated === true && detail.renderPlan?.length) {
            if (detail.manifest?.storyType === 'transaction-replay' || detail.manifest?.storyType === 'token-sequence') {
              rendering = await renderEventStoryVideo({ ...detail, manifest: validation.manifest }, progress);
            } else if (detail.manifest?.storyType === 'wallet-comparison') {
              rendering = await renderWalletComparisonVideo({ ...detail, manifest: validation.manifest }, progress);
            }
          }
          const result = rendering
            ? Object.freeze({ ...validation, ...rendering, manifest: validation.manifest, narration })
            : Object.freeze({ ...validation, narration });
          globalThis.dispatchEvent(new CustomEvent('abulls:trickster-export', { detail: { ...detail, manifest: validation.manifest, validation, narration, rendering, result } }));
          return result;
        }
      });
      instances.set('trickster', studio);
      instances.set('tricksterHost', studioHost);
      if (globalThis.BBR_TRICKSTER_EVIDENCE) {
        studio.loadEvidence(globalThis.BBR_TRICKSTER_EVIDENCE);
        bindTricksterField(studio);
      }
      return studioHost;
    },
    deactivate() {
      tricksterFieldCleanup?.();
      tricksterFieldCleanup = null;
      instances.get('trickster')?.destroy();
      instances.delete('trickster');
      instances.delete('tricksterHost');
    }
  });

  app = bootstrapNextExperience({
    flags,
    host,
    adapters,
    serviceState: navigator.onLine === false ? 'degraded' : 'ready',
    onSearchRequest: (request) => globalThis.dispatchEvent(new CustomEvent('abulls:universal-search', { detail: request })),
    onFieldCommand: (command) => {
      if (command === 'query') {
        app?.shell?.closeWorkspace?.();
        queryAttach?.open();
      }
    }
  });
  if (!app.mounted) {
    host.remove();
    return;
  }
  legacyApp?.remove();

  queryAttach = attachQueryToField({
    fieldHost: app.shell.fieldHost,
    chromeHost: app.shell.root.querySelector('.field-shell__chrome') || app.shell.root,
    onSubmit: (value) => {
      const content = adapters.activate('intelligence', {
        source: 'query',
        request: { query: value, source: 'query' }
      });
      mount(content, 'INTELLIGENCE', 'intelligence');
    }
  });

  if (universeRequested) {
    universe = new UniverseExperience({
      host: app.shell.fieldHost,
      apiBase: globalThis.BBRConfig?.apiBase || location.origin,
      THREE,
      onDestinationRequest: async (destination, entity) => {
        globalThis.dispatchEvent(new CustomEvent('abulls:universe-selection', { detail: { destination, entity } }));
      }
    });
    universe.start();
    loadedThreePromise.then((loadedThree) => {
      const gpu = loadedThree && typeof loadedThree.WebGLRenderer === 'function' ? loadedThree : null;
      if (!gpu) return;
      globalThis.THREE = gpu;
      universe.promoteRenderer?.(gpu);
    });
  } else {
    const fallback = node('div', 'universe-shell');
    fallback.append(node('p', 'field-disabled', 'Live field rendering is paused. QUERY remains available.'));
    app.shell.fieldHost.replaceChildren(fallback);
  }

  globalThis.addEventListener('abulls:field-return', () => {
    instances.get('intelligence')?.destroy?.();
    instances.delete('intelligence');
    tricksterFieldCleanup?.();
    tricksterFieldCleanup = null;
    instances.get('trickster')?.destroy?.();
    instances.delete('trickster');
    instances.delete('tricksterHost');
  });

  globalThis.BBRNextExperience = Object.freeze({
    ...app,
    loadStory: openStory,
    openQuery: () => queryAttach?.open(),
    destroy() {
      queryAttach?.destroy();
      tricksterFieldCleanup?.();
      universe?.destroy();
      app?.destroy?.();
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
else setup();
