import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRelationships } from './intelligence-research-relationships.mjs';
const rows=[{id:'a',wallet:'w1',mint:'m1',status:'closed',entry_ts:10,exit_ts:20,evidence_ids_json:'["e1"]'},{id:'b',wallet:'w1',mint:'m2',status:'open',entry_ts:30,exit_ts:null,evidence_ids_json:'["e2"]'},{id:'c',wallet:'w2',mint:'m1',status:'closed',entry_ts:12,exit_ts:22,evidence_ids_json:'[]'},{id:'d',wallet:'w2',mint:'m2',status:'closed',entry_ts:32,exit_ts:42,evidence_ids_json:'[]'},{id:'e',wallet:'w3',mint:'m9',status:'closed',entry_ts:40,exit_ts:50,evidence_ids_json:'[]'}];
test('relationships require observed shared token exposure',()=>{const x=deriveRelationships(rows,'w1');assert.equal(x.relationships.length,1);assert.equal(x.relationships[0].wallet,'w2');assert.equal(x.relationships[0].sharedTokenCount,2);assert.equal(x.relationships[0].relation,'observed shared token exposure');});
test('sequences preserve subject chronology and receipts',()=>{const x=deriveRelationships(rows,'w1');assert.deepEqual(x.sequences.map(r=>r.roundId),['a','b']);assert.deepEqual(x.sequences[0].evidenceIds,['e1']);});
