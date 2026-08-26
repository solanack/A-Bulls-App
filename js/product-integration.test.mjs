import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductAdapterRegistry } from './product-adapters.mjs';
import { classifyPublicChainQuery, searchRequest } from './universal-search.mjs';

test('adapter registry treats the persistent field as the shell, not a separate primary product', () => {
  const registry = new ProductAdapterRegistry();
  registry.register('intelligence', { activate() {} });
  assert.equal(registry.readiness().ready, false);
  assert.deepEqual(registry.readiness().missingPrimary, ['trickster','games']);
});

test('adapter activation deactivates the previous product', () => {
  const events = [];
  const registry = new ProductAdapterRegistry()
    .register('universe', { activate: () => events.push('universe:on'), deactivate: () => events.push('universe:off') })
    .register('intelligence', { activate: () => events.push('intelligence:on') });
  registry.activate('universe');
  registry.activate('intelligence');
  assert.deepEqual(events, ['universe:on','universe:off','intelligence:on']);
});

test('addresses remain neutral until resolved', () => {
  const result = classifyPublicChainQuery('11111111111111111111111111111111');
  assert.equal(result.kind, 'solana-address');
  assert.equal(result.destination, 'resolve-address');
});

test('search is always read-only', () => {
  const result = searchRequest('11111111111111111111111111111111');
  assert.equal(result.readOnly, true);
  assert.equal(result.permitsSigning, false);
  assert.equal(result.permitsSubmission, false);
});
