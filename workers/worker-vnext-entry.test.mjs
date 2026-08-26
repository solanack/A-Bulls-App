import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, ['scripts/reconstruct-worker-8.2.0.mjs'], { cwd: new URL('..', import.meta.url), stdio: 'inherit' });
const mod = await import('./worker-vnext-entry.mjs');
const worker = mod.default;

assert.equal(mod.__workerVNextContract.baselineVersion, '8.2.0');
assert.equal(mod.__workerVNextContract.baselineRuntime, 'retained-system-auth-bull-invaders');
assert.deepEqual(new Set(mod.__workerVNextContract.retainedBaselinePaths),new Set(['/api/health','/api/auth/google/config','/api/auth/google','/api/auth/google/session','/api/auth/player-session','/api/leaderboard/top','/api/leaderboard/challenge','/api/leaderboard/submit']));
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

// Baseline system/game support remains reachable through the retained 8.2.0 implementation.
const health = await worker.fetch(new Request('https://api.example/api/health'), env, {});
assert.notEqual(health.status, 404, 'baseline /api/health must remain reachable');
const leaderboard = await worker.fetch(new Request('https://api.example/api/leaderboard/top'), env, {});
assert.notEqual(leaderboard.status, 404, 'Bull Invaders leaderboard route must remain reachable');

// A new vNext route owns its disabled-state 404; it is never reinterpreted by the baseline.
const replay = await worker.fetch(new Request('https://api.example/api/intelligence/replay-bundle', {
  method: 'POST',
  headers: { 'content-type': 'application/json', Origin: 'https://abullsapp.com' },
  body: JSON.stringify({ wallet: '11111111111111111111111111111111', token: '11111111111111111111111111111111' })
}), env, {});
assert.equal(replay.status, 404);
assert.equal((await jsonOf(replay)).error, 'feature_disabled');
assert.equal(replay.headers.get('access-control-allow-origin'), 'https://abullsapp.com');

console.log('Worker vNext retained-baseline compatibility contract passed');
