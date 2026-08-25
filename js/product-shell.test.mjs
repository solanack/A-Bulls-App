import test from 'node:test';
import assert from 'node:assert/strict';
import { primaryProducts, productById, productRegistry } from './product-registry.mjs';

test('all four primary products are visible in locked order', () => {
  assert.deepEqual(primaryProducts().map(({ id }) => id), [
    'universe','intelligence','trickster','games'
  ]);
});

test('removed LIFE product is unavailable', () => {
  assert.equal(productById('life'), null);
});

test('legacy community product is fully unavailable', () => {
  assert.equal(productById('communities'), null);
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
