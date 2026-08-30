import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineDir = path.join(root, 'workers', 'baseline-8.2.0');
const manifestPath = path.join(baselineDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const RETAINED_BASELINE_ROUTES = new Set([
  'GET /api/health',
  'GET /api/auth/google/config',
  'POST /api/auth/google',
  'GET /api/auth/google/session',
  'POST /api/auth/player-session',
  'GET /api/leaderboard/top',
  'POST /api/leaderboard/challenge',
  'POST /api/leaderboard/submit'
]);

if (manifest.version !== '8.2.0') throw new Error(`Unexpected Worker baseline version: ${manifest.version}`);
if (manifest.encoding !== 'gzip+base64') throw new Error(`Unsupported baseline encoding: ${manifest.encoding}`);
if (!Array.isArray(manifest.parts) || manifest.parts.length !== 7) throw new Error('Worker 8.2.0 baseline part set is incomplete.');

let encoded = '';
for (const filename of manifest.parts) {
  const value = await readFile(path.join(baselineDir, filename), 'utf8');
  encoded += value.replace(/\s+/g, '');
}

const compressed = Buffer.from(encoded, 'base64');
const source = gunzipSync(compressed);
const digest = createHash('sha256').update(source).digest('hex');

if (source.byteLength !== manifest.workerSourceBytes) throw new Error(`Worker 8.2.0 byte-length mismatch: expected ${manifest.workerSourceBytes}, got ${source.byteLength}`);
if (digest !== manifest.workerSourceSha256) throw new Error(`Worker 8.2.0 SHA-256 mismatch: expected ${manifest.workerSourceSha256}, got ${digest}`);

const text = source.toString('utf8');
if (!text.includes("const VERSION = '8.2.0';")) throw new Error('Reconstructed Worker does not declare VERSION 8.2.0.');
if (!/export\s+default\s*\{/.test(text)) throw new Error('Reconstructed Worker does not expose the expected default Worker export.');

// Keep the exact verified artifact available only as ignored build output/provenance.
const exactOutputPath = path.join(root, 'workers', manifest.generatedPath);
await writeFile(exactOutputPath, source);

// Generate the active compatibility runtime from the verified artifact by retaining only
// system/auth/Bull Invaders leaderboard routes. All wallet/intelligence product behavior
// is owned by vNext; retired community/Ansem/Bullpen/Bull Vision routes never enter the
// active baseline route table.
const routeStart = text.indexOf('const ROUTES = Object.freeze({');
const routeEndMarker = '\n});';
const routeEnd = text.indexOf(routeEndMarker, routeStart);
if (routeStart < 0 || routeEnd < 0) throw new Error('Worker 8.2.0 ROUTES block could not be located.');
const routeBlockEnd = routeEnd + routeEndMarker.length;
const originalRouteBlock = text.slice(routeStart, routeBlockEnd);
const retainedRouteBlock = originalRouteBlock.split('\n').filter(line => {
  const match = line.match(/^\s*'((?:GET|POST|PUT|DELETE|PATCH) [^']+)'\s*:/);
  return !match || RETAINED_BASELINE_ROUTES.has(match[1]);
}).join('\n');
let retained = text.slice(0, routeStart) + retainedRouteBlock + text.slice(routeBlockEnd);

// The wrapper owns all scheduled work. Removing the baseline cron body ensures old
// community refresh jobs can never execute and makes those dependencies unreachable
// to the Wrangler tree-shaker.
const scheduledPattern = /  async scheduled\(event, env, ctx\) \{[\s\S]*?\n  \}\n\};/;
if (!scheduledPattern.test(retained)) throw new Error('Worker 8.2.0 scheduled handler could not be isolated.');
retained = retained.replace(scheduledPattern, '  async scheduled() {}\n};');

const retainedRouteKeys = [...retainedRouteBlock.matchAll(/'((?:GET|POST|PUT|DELETE|PATCH) [^']+)'\s*:/g)].map(match => match[1]);
if (retainedRouteKeys.length !== RETAINED_BASELINE_ROUTES.size || retainedRouteKeys.some(key => !RETAINED_BASELINE_ROUTES.has(key))) {
  throw new Error(`Retained Worker route contract mismatch: ${retainedRouteKeys.join(', ')}`);
}
for (const forbidden of ['/api/ansem/', '/api/ansemio/', '/api/bull-vision', '/api/nft/collection-stats', '/api/nft/ecosystem-stats', '/api/wallet/overview', '/api/wallet/activity', '/api/intelligence/community-integrations']) {
  if (retainedRouteBlock.includes(forbidden)) throw new Error(`Retired route leaked into active baseline route table: ${forbidden}`);
}

const retainedOutputPath = path.join(root, 'workers', 'worker-baseline-retained.mjs');
await writeFile(retainedOutputPath, retained, 'utf8');
console.log(`Verified Worker 8.2.0 provenance → ${path.relative(root, exactOutputPath)} (${source.byteLength} bytes, ${digest})`);
console.log(`Generated retained runtime → ${path.relative(root, retainedOutputPath)} (${retainedRouteKeys.length} baseline routes)`);


