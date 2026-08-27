import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const sourceDir=join(here,'baseline-8.2.0');
const manifest=JSON.parse(await readFile(join(sourceDir,'manifest.json'),'utf8'));
const files=(await readdir(sourceDir)).filter(name=>/^part-\d+\.b64$/.test(name)).sort();
if(JSON.stringify(files)!==JSON.stringify(manifest.parts))throw new Error(`Worker baseline part set mismatch: ${files.join(', ')}`);
const encoded=(await Promise.all(files.map(name=>readFile(join(sourceDir,name),'utf8')))).join('').replace(/\s+/g,'');
let source;
try{source=gunzipSync(Buffer.from(encoded,'base64'));}catch(error){throw new Error(`Worker baseline decode failed: ${error?.message||error}`);}
const sha=createHash('sha256').update(source).digest('hex');
if(sha!==manifest.workerSourceSha256)throw new Error(`Worker 8.2.0 SHA-256 mismatch: ${sha}`);
if(source.length!==manifest.workerSourceBytes)throw new Error(`Worker 8.2.0 byte-size mismatch: ${source.length}`);
const text=source.toString('utf8');
if(!text.includes("const VERSION = '8.2.0';"))throw new Error('Worker baseline does not declare VERSION 8.2.0');
if(!text.includes('export default'))throw new Error('Worker baseline default export is missing');
const output=join(here,manifest.generatedPath);
if(process.argv.includes('--check')){
  console.log(`Worker ${manifest.version} baseline verified ${sha}`);
}else{
  await writeFile(output,source);
  console.log(`Reconstructed ${manifest.generatedPath} · Worker ${manifest.version} · ${sha}`);
}
