import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineDir = path.join(root, 'workers', 'baseline-8.2.0');
const manifestPath = path.join(baselineDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

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

if (source.byteLength !== manifest.workerSourceBytes) {
  throw new Error(`Worker 8.2.0 byte-length mismatch: expected ${manifest.workerSourceBytes}, got ${source.byteLength}`);
}
if (digest !== manifest.workerSourceSha256) {
  throw new Error(`Worker 8.2.0 SHA-256 mismatch: expected ${manifest.workerSourceSha256}, got ${digest}`);
}

const text = source.toString('utf8');
if (!text.includes("const VERSION = '8.2.0';")) throw new Error('Reconstructed Worker does not declare VERSION 8.2.0.');
if (!/export\s+default\s*\{/.test(text)) throw new Error('Reconstructed Worker does not expose the expected default Worker export.');

const outputPath = path.join(root, 'workers', manifest.generatedPath);
await writeFile(outputPath, source);
console.log(`Reconstructed verified Worker 8.2.0 → ${path.relative(root, outputPath)} (${source.byteLength} bytes, ${digest})`);
