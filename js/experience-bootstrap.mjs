import { resolveExperienceFlags } from './experience-feature-flags.mjs';
import { createProductShell } from './product-shell-vnext.mjs';
import { searchRequest } from './universal-search.mjs';

export function bootstrapNextExperience({
  flags,
  host,
  adapters,
  serviceState = 'ready',
  onSearchRequest,
  initialProduct = 'universe'
}) {
  const resolvedFlags = resolveExperienceFlags(flags);
  if (!resolvedFlags.nextProductShellEnabled) {
    return Object.freeze({
      mounted: false,
      reason: 'feature-disabled',
      flags: resolvedFlags,
      destroy() {}
    });
  }
  if (!(host instanceof Element)) throw new TypeError('isolated vNext host is required');
  if (!adapters?.readiness) throw new TypeError('product adapter registry is required');

  const readiness = adapters.readiness();
  if (!readiness.ready) {
    return Object.freeze({
      mounted: false,
      reason: 'adapters-incomplete',
      missingPrimary: readiness.missingPrimary,
      flags: resolvedFlags,
      destroy() {}
    });
  }

  const shell = createProductShell({
    host,
    activeProduct: initialProduct,
    serviceState,
    onNavigate(productId) {
      const content = adapters.activate(productId, { source: 'product-shell' });
      if (content instanceof Element) shell.mountProduct(content);
    },
    onSearch(value) {
      const request = searchRequest(value);
      onSearchRequest?.(request);
      if (request.kind === 'empty') return;
      const content = adapters.activate('intelligence', { source: 'universal-search', request });
      if (content instanceof Element) shell.mountProduct(content);
      shell.setActiveProduct('intelligence');
    }
  });

  const initialContent = adapters.activate(initialProduct, { source: 'product-shell-bootstrap' });
  if (initialContent instanceof Element) shell.mountProduct(initialContent);

  return Object.freeze({
    mounted: true,
    flags: resolvedFlags,
    shell,
    destroy() {
      shell.destroy();
    }
  });
}
