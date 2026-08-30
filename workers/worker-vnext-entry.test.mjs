import assert from 'node:assert/strict';
const mod = await import('./worker-vnext-entry.mjs');
const worker = mod.default;

assert.equal(mod.__workerVNextContract.runtime, 'living-universe-read-only');
assert.deepEqual(mod.__workerVNextContract.retainedPaths, ['/api/health']);
assert.ok(worker && typeof worker.fetch === 'function');
assert.ok(typeof worker.scheduled === 'function');

const env = {
  ALLOWED_ORIGINS: 'https://abullsapp.com',
  UNIVERSE_ENABLED: 'false',
  TRICKSTER_STUDIO_ENABLED: 'false',
  PLAYABLE_DATA_ENABLED: 'false',
  INTELLIGENCE_MESH_ENABLED: 'false'
};

async function jsonOf(response) { return JSON.parse(await response.text()); }

const preflight = await worker.fetch(new Request('https://api.example/api/intelligence/mesh-status', {
  method: 'OPTIONS',
  headers: { Origin: 'https://abullsapp.com', 'Access-Control-Request-Method': 'GET' }
}), env, {});
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://abullsapp.com');
assert.match(preflight.headers.get('access-control-allow-methods') || '', /GET/);

// Retired/replaced product APIs can never reach the retained 8.2.0 baseline runtime.
for (const path of [
  '/api/ansem/analytics',
  '/api/ansemio/snapshot',
  '/api/bull-vision',
  '/api/bull-vision/life-signals',
  '/api/nft/collection-stats',
  '/api/nft/ecosystem-stats',
  '/api/intelligence/community-integrations',
  '/api/wallet/overview',
  '/api/wallet/activity'
]) {
  const response = await worker.fetch(new Request(`https://api.example${path}`, { headers: { Origin: 'https://abullsapp.com' } }), env, {});
  assert.equal(response.status, 404, `${path} must remain retired/replaced`);
  assert.deepEqual(await jsonOf(response), { ok: false, error: 'not_found' });
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://abullsapp.com');
}

// Only the neutral health route remains outside the Intelligence router.
const health = await worker.fetch(new Request('https://api.example/api/health'), env, {});
assert.equal(health.status, 200, '/api/health must remain reachable');
const leaderboard = await worker.fetch(new Request('https://api.example/api/leaderboard/top'), env, {});
assert.equal(leaderboard.status, 404, 'competitive leaderboard route must remain retired');

// A new vNext route owns its disabled-state 404; it is never reinterpreted by the baseline.
const replay = await worker.fetch(new Request('https://api.example/api/intelligence/replay-bundle', {
  method: 'POST',
  headers: { 'content-type': 'application/json', Origin: 'https://abullsapp.com' },
  body: JSON.stringify({ wallet: '11111111111111111111111111111111', token: '11111111111111111111111111111111' })
}), env, {});
assert.equal(replay.status, 404);
assert.equal((await jsonOf(replay)).error, 'feature_disabled');
assert.equal(replay.headers.get('access-control-allow-origin'), 'https://abullsapp.com');

// Configured production rate limiting is enforced before vNext route execution.
const limited = await worker.fetch(new Request('https://api.example/api/intelligence/mesh-status', {
  headers: { Origin: 'https://abullsapp.com', 'CF-Connecting-IP': '203.0.113.10' }
}), { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } }, {});
assert.equal(limited.status, 429);
assert.equal((await jsonOf(limited)).error, 'rate_limited');
assert.equal(limited.headers.get('retry-after'), '60');
assert.equal(limited.headers.get('access-control-allow-origin'), 'https://abullsapp.com');

console.log('Worker living-universe read-only contract passed');
