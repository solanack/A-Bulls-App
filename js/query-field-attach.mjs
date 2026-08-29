import { QueryExperience } from './query-experience.mjs';
import { FieldQueryOrganism } from './field-query-organism.mjs';
import { askFieldQuery } from './field-query-worker.mjs';

export function attachQueryToField({ fieldHost, chromeHost } = {}) {
  if (!(fieldHost instanceof Element)) throw new TypeError('fieldHost is required');
  const slotHost = chromeHost instanceof Element ? chromeHost : fieldHost;
  const query = new QueryExperience({
    host: slotHost,
    onSubmit: async (value) => {
      organism.setHeadForm(true);
      query.setStatus('reading chain…');
      const result = await askFieldQuery(value);
      query.setStatus(result.line);
      globalThis.dispatchEvent(new CustomEvent('abulls:field-query', {
        detail: { ...result, stayInField: true }
      }));
    }
  });

  const organism = new FieldQueryOrganism({
    host: fieldHost,
    onFocus: (focus) => {
      if (!focus) {
        query.setStatus('');
        return;
      }
      query.setStatus(focus.line);
    }
  });
  organism.setHeadForm(false);
  fieldHost.classList.add('field-shell__field--query');
  slotHost.closest('.field-shell')?.classList.add('field-shell--one');

  const returnToField = () => organism.setHeadForm(false);
  globalThis.addEventListener('abulls:field-return', returnToField);
  globalThis.addEventListener('abulls:query-open', () => query.open());

  return Object.freeze({
    open() {
      query.open();
    },
    close() {
      query.close();
      organism.setHeadForm(false);
    },
    destroy() {
      globalThis.removeEventListener('abulls:field-return', returnToField);
      organism.destroy();
      query.destroy();
    }
  });
}
