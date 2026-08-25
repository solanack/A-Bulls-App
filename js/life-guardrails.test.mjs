import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('LIFE has no legacy advice or personality path',async()=>{
  const source=await readFile(new URL('./life.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/function adviceSet|bullVisionAdvice|bullIntelligenceAdvice/);
  assert.match(source,/reflectiveQuestions/);
  assert.match(source,/question\.endsWith\('\?'\)/);
});

test('LIFE retains read-only public wallet language',async()=>{
  const source=await readFile(new URL('./life.js',import.meta.url),'utf8');
  assert.match(source,/public Solana wallet address/i);
  assert.doesNotMatch(source,/signTransaction|sendTransaction|privateKey|secretKey/);
});
