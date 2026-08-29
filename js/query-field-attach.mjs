import { QueryExperience } from './query-experience.mjs';
import { FieldQueryOrganism } from './field-query-organism.mjs';

export function attachQueryToField({ fieldHost, chromeHost } = {}) {
  if (!(fieldHost instanceof Element)) throw new TypeError('fieldHost is required');
  const slotHost = chromeHost instanceof Element ? chromeHost : fieldHost;
  const query = new QueryExperience({
    host: slotHost,
    onSubmit: (value) => {
      globalThis.dispatchEvent(new CustomEvent('abulls:universal-search', {
        detail: { query: value, source: 'query', stayInField: true }
      }));
      globalThis.dispatchEvent(new CustomEvent('abulls:field-query', {
        detail: { query: value }
      }));
    }
  });
  query.open();

  const organism = new FieldQueryOrganism({ host: fieldHost });
  organism.setHeadForm(true);
  fieldHost.classList.add('field-shell__field--query');
  slotHost.closest('.field-shell')?.classList.add('field-shell--one');

  const keepHead = () => organism.setHeadForm(true);
  globalThis.addEventListener('abulls:field-return', keepHead);
  globalThis.addEventListener('abulls:query-open', () => query.open());

  return Object.freeze({
    open() {
      query.open();
      organism.setHeadForm(true);
    },
    close() {
      query.close();
    },
    destroy() {
      globalThis.removeEventListener('abulls:field-return', keepHead);
      organism.destroy();
      query.destroy();
    }
  });
}
