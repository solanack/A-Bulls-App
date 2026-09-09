import test from 'node:test';
import assert from 'node:assert/strict';
import { ghostSimilarityScore } from './intelligence-ghost-similarity.mjs';

const base={id:'a',wallet:'w1',mint:'m1',status:'closed',entry_ts:1_760_000_000_000,exit_ts:1_760_003_600_000,buy_sol:10};
test('Ghost rewards comparable retained round structure without predicting',()=>{const match=ghostSimilarityScore(base,{...base,id:'b',wallet:'w2',mint:'m2',entry_ts:1_750_000_000_000,exit_ts:1_750_003_300_000,buy_sol:9});assert.ok(match);assert.ok(match.score>.65);assert.ok(match.reasons.includes('similar observed hold duration'));});
test('Ghost rejects the subject itself',()=>assert.equal(ghostSimilarityScore(base,base),null));
test('Ghost does not fabricate similarity from missing evidence',()=>{const match=ghostSimilarityScore(base,{id:'c',wallet:'w9',mint:'m9',status:'open',entry_ts:1_750_000_000_000,exit_ts:null,buy_sol:null});assert.ok(match===null||match.score<.52);});
