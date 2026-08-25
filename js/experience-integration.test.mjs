import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(new URL(path,import.meta.url),'utf8');

test('checked-in experience flags remain disabled',async()=>{
  const config=await read('./config.js');
  assert.match(config,/nextProductShellEnabled:\s*false/);
  assert.match(config,/universeEnabled:\s*false/);
  assert.match(config,/tricksterStudioEnabled:\s*false/);
});

test('page loads the isolated module and scoped styles',async()=>{
  const html=await read('../index.html');
  assert.match(html,/product-shell-vnext\.css/);
  assert.match(html,/universe\.css/);
  assert.match(html,/trickster-studio\.css/);
  assert.match(html,/type="module" src="js\/experience-entry\.mjs/);
});

test('PWA precaches the entire experience graph',async()=>{
  const sw=await read('../sw.js');
  for(const asset of ['experience-entry','product-shell-vnext','universe-experience','trickster-studio']) {
    assert.match(sw,new RegExp(asset));
  }
});
