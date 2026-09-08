import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function tests(dir, suffix) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? tests(path, suffix) : path.endsWith(suffix) ? [path] : [];
  });
}
for (const args of [
  ['--test', ...tests('scripts', '.test.mjs'), ...tests('workers', '.test.mjs'), ...tests('js', '.test.mjs')],
  ['--experimental-strip-types', '--test', ...tests('src', '.test.ts')],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
