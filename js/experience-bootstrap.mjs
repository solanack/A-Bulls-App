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
      adapters.activate(productId, { source: 'product-shell' });
    },
    onSearch(value) {
      const request = searchRequest(value);
      onSearchRequest?.(request);
      if (request.destination === 'transaction' || request.destination === 'resolve-address') {
        adapters.activate('intelligence', { source: 'universal-search', request });
        shell.setActiveProduct('intelligence');
      }
    }
  });

  adapters.activate(initialProduct, { source: 'product-shell-bootstrap' });

  return Object.freeze({
    mounted: true,
    flags: resolvedFlags,
    shell,
    destroy() {
      shell.destroy();
    }
  });
}
