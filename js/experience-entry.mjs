import { bootstrapNextExperience } from './experience-bootstrap.mjs';
import { ProductAdapterRegistry } from './product-adapters.mjs';
import { attachQueryToField } from './query-field-attach.mjs';

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text != null) item.textContent = text;
  return item;
}

function stayInField(title, copy) {
  const page = node('section', 'product-home');
  page.append(node('h1', '', title), node('p', '', copy));
  return page;
}

async function setup() {
  if (globalThis.__ABULLS_VNEXT_BOOTED) return;
  globalThis.__ABULLS_VNEXT_BOOTED = true;
  const flags = globalThis.BBR_EXPERIENCE_FLAGS || {};
  if (flags.nextProductShellEnabled !== true && String(flags.NEXT_PRODUCT_SHELL_ENABLED || '').toLowerCase() !== 'true') return;

  const host = node('div');
  host.id = 'nextProductShell';
  document.body.append(host);
  const adapters = new ProductAdapterRegistry();
  adapters.register('universe', { activate() { return node('div'); } });
  adapters.register('intelligence', {
    activate() {
      return stayInField('Stay in the Field', 'QUERY does not leave the Field. Use the slot under the head.');
    }
  });
  adapters.register('trickster', {
    activate() {
      return stayInField('Story later', 'Trickster stays closed until a Field receipt exists.');
    }
  });

  let queryAttach = null;
  const app = bootstrapNextExperience({
    flags,
    host,
    adapters,
    serviceState: navigator.onLine === false ? 'degraded' : 'ready',
    onSearchRequest: (request) => {
      globalThis.dispatchEvent(new CustomEvent('abulls:field-query', { detail: request }));
    },
    onFieldCommand: (command) => {
      if (command === 'query' || command === 'explore') {
        app?.shell?.closeWorkspace?.();
        queryAttach?.open();
      }
    }
  });
  if (!app.mounted) {
    host.remove();
    return;
  }
  document.getElementById('app')?.remove();

  queryAttach = attachQueryToField({
    fieldHost: app.shell.fieldHost,
    chromeHost: app.shell.root.querySelector('.field-shell__chrome') || app.shell.root
  });

  globalThis.BBRNextExperience = Object.freeze({
    ...app,
    openQuery: () => queryAttach?.open(),
    destroy() {
      queryAttach?.destroy();
      app?.destroy?.();
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
else setup();
