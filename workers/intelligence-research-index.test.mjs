import test from 'node:test';
import assert from 'node:assert/strict';
import { mapResearchIndexRow } from './intelligence-research-index.mjs';

test('research index preserves null evidence instead of coercing to zero',()=>{
  const row=mapResearchIndexRow({id:'trade:1',kind:'trade',title:'Observed trade',source_kind:'observed',payload_json:'{}',created_at:1770000000000,updated_at:1770000000000});
  assert.equal(row.observedTs,null);assert.equal(row.mint,null);assert.equal(row.wallet,null);assert.equal(row.sourceKind,'observed');
});

test('research index keeps provider-reported source distinct',()=>{
  const row=mapResearchIndexRow({id:'star:fomo:1',kind:'star',wallet:'abc',title:'Trader',source_kind:'provider-reported',source_ref:'fomoapi.io',payload_json:'{"rank":1}',created_at:1770000000000,updated_at:1770000000000});
  assert.equal(row.sourceKind,'provider-reported');assert.equal(row.sourceRef,'fomoapi.io');assert.equal(row.payload.rank,1);
});
