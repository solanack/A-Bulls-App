import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function jobs(workflow) {
  const body = workflow.split(/\njobs:\n/)[1] ?? "";
  const map = new Map();
  for (const part of body.split(/\n(?=  [a-z0-9-]+:\n)/)) {
    const name = part.match(/^  ([a-z0-9-]+):\n/)?.[1];
    if (name) map.set(name, part);
  }
  return map;
}

const releaseGate = read(".github/workflows/main-release-gate.yml");
const releaseJobs = jobs(releaseGate);
const verify = releaseJobs.get("verify");
const production = releaseJobs.get("production-evidence");
const gate = releaseJobs.get("gate");

test("pull requests still run the secret-free release checks", () => {
  assert.match(releaseGate, /pull_request:\n\s+branches: \[main\]/);
  assert.equal(releaseJobs.size, 3);
  assert.ok(verify);
  assert.doesNotMatch(verify, /github\.event_name != 'pull_request'/);
  assert.doesNotMatch(verify, /secrets\./);
  assert.doesNotMatch(verify, /CLOUDFLARE_/);
  for (const command of [
    "npm install --ignore-scripts --no-fund --no-audit",
    "npm run verify:release",
    "npm run typecheck",
    "npm test",
    "npm run build",
    "npx wrangler deploy --dry-run --config workers/wrangler.production.toml",
    "node scripts/check-worker-migrations.mjs",
    "npx wrangler deploy --dry-run",
  ]) {
    assert.match(verify, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Cloudflare credentials stay on the non-pull_request production job", () => {
  assert.ok(production);
  assert.match(production, /github\.event_name != 'pull_request'/);
  assert.match(production, /needs\.verify\.result == 'success'/);
  assert.match(production, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(production, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
  assert.match(production, /npx wrangler secret list --config workers\/wrangler\.production\.toml/);
  assert.match(production, /node scripts\/audit-fomo-replay-coverage\.mjs/);
  assert.doesNotMatch(production, /npm test/);
  assert.doesNotMatch(production, /continue-on-error:\s*true/);
  const guarded = [...releaseJobs.entries()].filter(([, body]) => /github\.event_name != 'pull_request'/.test(body));
  assert.deepEqual(guarded.map(([name]) => name), ["production-evidence"]);
  for (const [name, body] of releaseJobs) {
    if (name === "production-evidence") continue;
    assert.doesNotMatch(body, /secrets\.CLOUDFLARE_/, `${name} must not receive Cloudflare secrets`);
  }
});

test("the existing release-gate check fails unless production evidence passed outside pull requests", () => {
  assert.ok(gate);
  assert.match(gate, /name: verify \+ typecheck \+ test/);
  assert.match(gate, /needs: \[verify, production-evidence\]/);
  assert.match(gate, /PRODUCTION_RESULT" != "success"/);
  assert.match(gate, /PRODUCTION_RESULT" != "skipped"/);
  assert.doesNotMatch(gate, /secrets\./);
  assert.doesNotMatch(gate, /actions\/checkout/);
  assert.doesNotMatch(gate, /npm /);
});

test("Deploy Cloudflare remains a main-only publish workflow", () => {
  const deploy = read(".github/workflows/deploy-cloudflare.yml");
  const deployJobs = jobs(deploy);
  assert.doesNotMatch(deploy, /pull_request:/);
  assert.match(deploy, /branches: \[main\]/);
  assert.match(deployJobs.get("release-checks") ?? "", /npm run verify:release/);
  assert.match(deployJobs.get("release-checks") ?? "", /npx wrangler deploy --dry-run --config workers\/wrangler\.production\.toml/);
  assert.doesNotMatch(deployJobs.get("release-checks") ?? "", /CLOUDFLARE_/);
  const publish = deployJobs.get("deploy") ?? "";
  assert.match(publish, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(publish, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
  assert.match(publish, /npx wrangler deploy --config workers\/wrangler\.production\.toml/);
  assert.match(publish, /npx wrangler deploy\n/);
  assert.match(publish, /node scripts\/check-golden-fixtures\.mjs https:\/\/www\.abullsapp\.com/);
  assert.match(publish, /node scripts\/audit-fomo-replay-coverage\.mjs/);
});
