import { bootstrapNextExperience } from './experience-bootstrap.mjs';
import { ProductAdapterRegistry } from './product-adapters.mjs';
import { createFieldShell } from './field-shell.mjs';
import { attachQueryToField } from './query-field-attach.mjs';

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text != null) item.textContent = text;
  return item;
}

function stay(title, copy) {
  const page = node('section', 'product-home');
  page.append(node('h1', '', title), node('p', '', copy));
  return page;
}

function log(message) {
  globalThis.__abullsBootLog?.(message);
}

async function setup() {
  if (globalThis.__ABULLS_VNEXT_BOOTED) return;
  globalThis.__ABULLS_VNEXT_BOOTED = true;

  const host = node('div');
  host.id = 'nextProductShell';
  document.body.append(host);

  const adapters = new ProductAdapterRegistry();
  adapters.register('universe', { activate() { return node('div'); } });
  adapters.register('intelligence', {
    activate() { return stay('Stay in the Field', 'QUERY does not leave the Field.'); }
  });
  adapters.register('trickster', {
    activate() { return stay('Story later', 'Trickster waits for a Field receipt.'); }
  });

  let app = null;
  try {
    app = bootstrapNextExperience({
      flags: { nextProductShellEnabled: true, universeEnabled: true, tricksterStudioEnabled: true },
      host,
      adapters,
      serviceState: navigator.onLine === false ? 'degraded' : 'ready',
      onSearchRequest() {},
      onFieldCommand(command) {
        if (command === 'query' || command === 'explore') app?.shell?.closeWorkspace?.();
      }
    });
  } catch (error) {
    log(error?.message || error);
  }

  if (!app?.mounted) {
    try {
      app = { shell: createFieldShell({ host, serviceState: 'ready', onCommand() {}, onSearch() {} }), mounted: true };
    } catch (error) {
      log(error?.message || error);
      return;
    }
  }

  document.getElementById('app')?.remove();

  try {
    const queryAttach = attachQueryToField({
      fieldHost: app.shell.fieldHost,
      chromeHost: app.shell.root.querySelector('.field-shell__chrome') || app.shell.root
    });
    globalThis.BBRNextExperience = Object.freeze({
      ...app,
      openQuery: () => queryAttach.open(),
      destroy() {
        queryAttach.destroy();
        app.destroy?.();
      }
    });
  } catch (error) {
    log(error?.message || error);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
else setup();
