import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../worker.js', import.meta.url), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const worker = (await import(moduleUrl)).default;

// Canonical smoke checks retained in the supplied v8.0.2 package are executed before repository promotion.
assert.ok(worker && typeof worker.fetch === 'function');
assert.ok(typeof worker.scheduled === 'function');
console.log('v8 Worker package load verification passed');


