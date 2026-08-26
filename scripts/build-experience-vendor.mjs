import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'vendor/experience');
const assets = Object.freeze([
  {
    package: 'three',
    version: '0.185.0',
    license: 'MIT',
    source: 'node_modules/three/build/three.module.min.js',
    target: 'three-0.185.0.module.min.js'
  },
  {
    package: 'mediabunny',
    version: '1.55.2',
    license: 'MPL-2.0',
    source: 'node_modules/mediabunny/dist/bundles/mediabunny.min.mjs',
    target: 'mediabunny-1.55.2.min.mjs'
  },
  {
    package: 'three-license',
    version: '0.185.0',
    license: 'MIT',
    source: 'node_modules/three/LICENSE',
    target: 'THREE-LICENSE.txt'
  },
  {
    package: 'mediabunny-license',
    version: '1.55.2',
    license: 'MPL-2.0',
    source: 'node_modules/mediabunny/LICENSE',
    target: 'MEDIABUNNY-LICENSE.txt'
  }
]);

await mkdir(output, { recursive: true });
const manifest = [];
for (const asset of assets) {
  const source = resolve(root, asset.source);
  const target = resolve(output, asset.target);
  await copyFile(source, target);
  const bytes = await readFile(target);
  manifest.push({
    package: asset.package,
    version: asset.version,
    license: asset.license,
    file: asset.target,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}
await writeFile(
  resolve(output, 'manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), assets: manifest }, null, 2) + '\n'
);
console.log(JSON.stringify({ output, assets: manifest }, null, 2));
