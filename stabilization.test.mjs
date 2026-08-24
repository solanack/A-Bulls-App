import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('./worker.js', import.meta.url), 'utf8');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
const env = {
  ALLOWED_ORIGINS: 'https://abullsapp.com',
  AUTH_SESSION_SECRET: 'test-only-secret-with-sufficient-entropy',
  LEADERBOARD_DB: {},
  GOOGLE_PLAY_SERVICE_ACCOUNT: '{"legacy":true}',
  STRIPE_SECRET_KEY: 'legacy',
  STRIPE_WEBHOOK_SECRET: 'legacy',
  COMMERCE_ENABLED: 'false'
};
const request = (path, init = {}) => new Request(`https://api.example${path}`, {
  ...init,
  headers: { Origin: 'https://abullsapp.com', ...(init.headers || {}) }
});

const sessionResponse = await worker.fetch(request('/api/auth/player-session', { method: 'POST' }), env, {});
assert.equal(sessionResponse.status, 200);
const sessionBody = await sessionResponse.json();
assert.match(sessionBody.data.sessionToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

const challengeResponse = await worker.fetch(request('/api/leaderboard/challenge', {
  method: 'POST',
  headers: { Authorization: `Bearer ${sessionBody.data.sessionToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ game: 'bull-invaders', mode: 'ranked' })
}), env, {});
assert.equal(challengeResponse.status, 200);
const challenge = (await challengeResponse.json()).data;
assert.match(challenge.challengeId, /^[0-9a-f-]{36}$/i);
assert.ok(challenge.challengeToken);

const billingResponse = await worker.fetch(request('/api/billing/config'), env, {});
assert.equal(billingResponse.status, 404, 'legacy payment secrets must not enable commerce');

const healthResponse = await worker.fetch(request('/api/health'), env, {});
assert.equal(healthResponse.status, 200);
const healthBody = await healthResponse.json();
assert.equal(healthBody.ok, true);
assert.equal(healthBody.data.version, '8.0.2');
assert.equal(healthBody.data.services.monetization, false);
assert.equal(healthBody.data.services.leaderboard, true);

console.log('worker stabilization checks passed');
