import test from 'node:test';
import assert from 'node:assert/strict';
import { primaryProducts, productById, productRegistry } from './product-registry.mjs';

test('all five primary products are visible in locked order', () => {
  assert.deepEqual(primaryProducts().map(({ id }) => id), [
    'universe','intelligence','trickster','life','games'
  ]);
});

test('legacy communities do not occupy primary navigation', () => {
  assert.equal(productById('communities').tier, 'secondary');
  assert.equal(primaryProducts().some(({ id }) => id === 'communities'), false);
});

test('every product explains itself in plain language', () => {
  for (const product of productRegistry()) {
    assert.ok(product.label.length > 0);
    assert.ok(product.description.length >= 20);
  }
});

test('old community brands are not standalone products', () => {
  const ids = productRegistry().map(({ id }) => id);
  assert.equal(ids.includes('ansem'), false);
  assert.equal(ids.includes('bullpen'), false);
});
