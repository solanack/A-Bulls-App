import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('search children receive only the environment they need', () => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const result = spawnSync('/usr/bin/python3', ['-'], {
    cwd: root,
    encoding: 'utf8',
    input: `
import importlib.util, json
spec = importlib.util.spec_from_file_location('social_reach_runner', 'scripts/social-reach/runner.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
captured = {}
def fake_run(cmd, **kwargs):
    captured[cmd[0]] = kwargs.get('env')
    class Result:
        returncode = 0
        stdout = '{"data":[]}'
        stderr = ''
    return Result()
runner.subprocess.run = fake_run
runner.shutil.which = lambda name: '/usr/bin/' + name
twitter = runner.twitter_env()
runner.twitter_search('query', '2026-01-01', '2026-01-02', twitter)
runner.exa_search({'symbol': 'M', 'name': 'Mars', 'mint': 'mint'}, '2026-01-01', '2026-01-02')
forbidden = ['SOCIAL_INGEST_TOKEN', 'GITHUB_OIDC_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_URL']
print(json.dumps({
    'twitter': captured['twitter'],
    'mcporter': captured['mcporter'],
    'forbidden': forbidden,
}))
`,
    env: {
      PYTHONDONTWRITEBYTECODE: '1',
      PATH: '/usr/bin',
      HOME: '/tmp/social-reach-home',
      LANG: 'C.UTF-8',
      SOCIAL_INGEST_TOKEN: 'ingest-secret',
      GITHUB_OIDC_TOKEN: 'oidc-secret',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'actions-request',
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.invalid/token',
      TWITTER_AUTH_TOKEN: 'auth-secret',
      TWITTER_CT0: 'ct0-secret',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  for (const name of ['twitter', 'mcporter']) {
    for (const key of body.forbidden) assert.equal(body[name][key], undefined, `${name} inherited ${key}`);
    assert.equal(body[name].PATH, '/usr/bin');
    assert.equal(body[name].HOME, '/tmp/social-reach-home');
  }
  assert.equal(body.twitter.TWITTER_AUTH_TOKEN, 'auth-secret');
  assert.equal(body.twitter.TWITTER_CT0, 'ct0-secret');
  assert.equal(body.mcporter.TWITTER_AUTH_TOKEN, undefined);
  assert.equal(body.mcporter.TWITTER_CT0, undefined);
  assert.deepEqual(Object.keys(body.twitter).sort(), ['HOME', 'LANG', 'PATH', 'TWITTER_AUTH_TOKEN', 'TWITTER_CT0']);
  assert.deepEqual(Object.keys(body.mcporter).sort(), ['HOME', 'LANG', 'PATH']);
});
