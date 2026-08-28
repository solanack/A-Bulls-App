import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=(path)=>readFile(new URL(path,import.meta.url),'utf8');

test('checked-in replacement shell is canonical on the recovery branch',async()=>{
  const config=await read('./config.js');
  assert.match(config,/nextProductShellEnabled:\s*true/);
  assert.match(config,/universeEnabled:\s*true/);
  assert.match(config,/tricksterStudioEnabled:\s*true/);
});

test('page loads the immersive Particle Universe shell and responsive product styles',async()=>{
  const html=await read('../index.html');
  assert.match(html,/product-shell-vnext\.css/);
  assert.match(html,/universe\.css/);
  assert.match(html,/trickster-studio\.css/);
  assert.match(html,/type="module" src="js\/experience-entry\.mjs\?v=particle-universe/);
  assert.doesNotMatch(html,/bull-invaders|pixi-8\.19\.0/i);
});

test('PWA caches the Particle Universe entry shell without resurrecting the retired arcade runtime',async()=>{
  const sw=await read('../sw.js');
  for(const asset of ['experience-entry.mjs','product-shell-vnext.css','universe.css','field-shell.css','intelligence-workspace-vnext.css','trickster-studio.css']) {
    assert.match(sw,new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
  assert.match(sw,/particle-universe-immersive-1/);
  assert.doesNotMatch(sw,/bull-invaders|bull-invader-ship|pixi-8\.19\.0/i);
});

test('removed products and community brands are absent from the canonical product graph',async()=>{
  const sources=await Promise.all([
    read('./config.js'),
    read('./product-registry.mjs'),
    read('./experience-entry.mjs'),
    read('./field-shell.mjs'),
    read('./intelligence-workspace-vnext.mjs'),
    read('../sw.js')
  ]);
  const active=sources.join('\n');
  assert.doesNotMatch(active,/BBRLife|lifeView|js\/life\.js|id:\s*['"]life['"]/);
  assert.doesNotMatch(active,/Ansem\.io|\$ANSEM|Bullpen|community-integrations|claude-of-duty|Solana Bang Bang/i);
  assert.doesNotMatch(active,/Bull Invaders|bull-invaders|bull-invader-ship/i);
});
