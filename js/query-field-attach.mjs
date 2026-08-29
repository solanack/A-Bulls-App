import { QueryExperience } from './query-experience.mjs';

export function attachQueryToField({ fieldHost, chromeHost, onSubmit } = {}) {
  if (!(chromeHost instanceof Element)) throw new TypeError('chromeHost is required');
  const query = new QueryExperience({
    host: chromeHost,
    onSubmit: (value) => {
      onSubmit?.(value);
      globalThis.dispatchEvent(new CustomEvent('abulls:universal-search', {
        detail: { query: value, source: 'query' }
      }));
    }
  });

  let organism = null;
  const onState = async (event) => {
    const active = event?.detail?.active === true;
    fieldHost?.classList.toggle('field-shell__field--query', active);
    if (!active) {
      organism?.setActive?.(false);
      return;
    }
    if (organism) {
      organism.setActive(true);
      return;
    }
    const THREE = globalThis.THREE;
    if (!THREE) return;
    try {
      const mod = await import('./quantum/isolated-organism-controller.mjs');
      organism = new mod.IsolatedQuantumOrganismController({ host: fieldHost, THREE });
      organism.setActive(true);
    } catch (error) {
      console.warn('[QUERY organism]', error);
    }
  };

  const open = () => query.open();
  const close = () => query.close();
  globalThis.addEventListener('abulls:query-state', onState);
  globalThis.addEventListener('abulls:query-open', open);
  globalThis.addEventListener('abulls:field-return', close);

  return Object.freeze({
    open,
    close,
    destroy() {
      globalThis.removeEventListener('abulls:query-state', onState);
      globalThis.removeEventListener('abulls:query-open', open);
      globalThis.removeEventListener('abulls:field-return', close);
      organism?.destroy?.();
      organism = null;
      query.destroy();
    }
  });
}
