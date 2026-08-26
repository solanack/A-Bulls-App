import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('Cloudflare Pages headers file is policy syntax rather than stale HTML',async()=>{
  const headers=await read('_headers');
  assert.doesNotMatch(headers,/<!doctype|<html|<body/i);
  assert.match(headers,/X-Content-Type-Options: nosniff/);
  assert.match(headers,/Permissions-Policy:/);
  assert.match(headers,/\/sw\.js[\s\S]*no-cache/);
});

test('release entry remains free of permanently retired products',async()=>{
  const index=await read('index.html');
  assert.doesNotMatch(index,/Ansem|Bullpen|Solana Bang Bang|Claude of Duty|data-view=["']life/i);
  assert.match(index,/experience-entry\.mjs\?v=8/);
});

test('install manifest stays standalone and read-only product aligned',async()=>{
  const manifest=JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.name,'A Bulls App');
  assert.equal(manifest.display,'standalone');
  assert.match(manifest.description,/read-only Solana/i);
});
