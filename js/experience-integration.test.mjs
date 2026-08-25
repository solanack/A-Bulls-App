import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(new URL(path,import.meta.url),'utf8');

test('checked-in replacement shell is canonical on the feature branch',async()=>{
  const config=await read('./config.js');
  assert.match(config,/nextProductShellEnabled:\s*true/);
  assert.match(config,/universeEnabled:\s*true/);
  assert.match(config,/tricksterStudioEnabled:\s*true/);
});

test('page loads the replacement module and responsive product styles',async()=>{
  const html=await read('../index.html');
  assert.match(html,/product-shell-vnext\.css/);
  assert.match(html,/universe\.css/);
  assert.match(html,/trickster-studio\.css/);
  assert.match(html,/type="module" src="js\/experience-entry\.mjs/);
});

test('PWA precaches the complete replacement experience graph',async()=>{
  const sw=await read('../sw.js');
  for(const asset of ['experience-entry','product-shell-vnext','universe-experience','trickster-studio','replay-bundle-client','intelligence-workspace-vnext']) {
    assert.match(sw,new RegExp(asset));
  }
});

test('removed products and community brands are absent from the canonical product graph',async()=>{
  const sources=await Promise.all([
    read('./config.js'),
    read('./product-registry.mjs'),
    read('./experience-entry.mjs'),
    read('./intelligence-workspace-vnext.mjs'),
    read('../sw.js')
  ]);
  const active=sources.join('\n');
  assert.doesNotMatch(active,/BBRLife|lifeView|js\/life\.js|id:\s*['"]life['"]/);
  assert.doesNotMatch(active,/Ansem\.io|\$ANSEM|Bullpen|community-integrations|claude-of-duty|Solana Bang Bang/i);
});
