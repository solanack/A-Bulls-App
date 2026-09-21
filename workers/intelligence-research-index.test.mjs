import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapMatchedRoundRow, mapResearchIndexRow, mapWalletSystemRows, walletAddressKind } from './intelligence-research-index.mjs';

test('research index preserves null evidence instead of coercing to zero',()=>{const row=mapResearchIndexRow({id:'trade:1',kind:'trade',title:'Observed trade',source_kind:'observed',payload_json:'{}',created_at:1770000000000,updated_at:1770000000000});assert.equal(row.observedTs,null);assert.equal(row.mint,null);assert.equal(row.wallet,null);assert.equal(row.sourceKind,'observed');});
test('research index keeps provider-reported source distinct',()=>{const row=mapResearchIndexRow({id:'star:fomo:1',kind:'star',wallet:'abc',title:'Trader',source_kind:'provider-reported',source_ref:'fomoapi.io',payload_json:'{"rank":1}',created_at:1770000000000,updated_at:1770000000000});assert.equal(row.sourceKind,'provider-reported');assert.equal(row.sourceRef,'fomoapi.io');assert.equal(row.payload.rank,1);});
test('matched round mapping preserves unknown realized result',()=>{const row=mapMatchedRoundRow({id:'r1',wallet:'w',mint:'m',status:'open',method:'bounded-fifo-observed-swaps-v1',evidence_ids_json:'["a"]',coverage:'partial',created_at:1770000000000,updated_at:1770000000000});assert.equal(row.matchedRealizedSol,null);assert.equal(row.buySol,null);assert.deepEqual(row.evidenceIds,['a']);});
test('trader holdings route reads matched rounds only and does not invent PnL',()=>{
  const source=readFileSync(new URL('./intelligence-research-index.mjs',import.meta.url),'utf8');
  assert.match(source,/\/api\/intelligence\/research\/holdings/);
  assert.match(source,/aggregateTraderHoldings/);
  assert.match(source,/status IN \('closed','open'\)/);
  assert.doesNotMatch(source,/helius/i);
  assert.doesNotMatch(source,/reported_pnl/i);
});



test('wallet system accepts Solana and EVM public addresses only',()=>{
  assert.equal(walletAddressKind('11111111111111111111111111111111'),'solana');
  assert.equal(walletAddressKind('0x1111111111111111111111111111111111111111'),'evm');
  assert.equal(walletAddressKind('not-a-wallet'),null);
});

test('wallet system ranks retained activity and preserves provenance',()=>{
  const rows=mapWalletSystemRows([
    {chain_key:'base',asset_address:'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',event_count:8,trade_count:3,last_event:10,source_kinds:'provider-reported'},
    {chain_key:'ethereum',asset_address:'0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',event_count:5,trade_count:5,last_event:9,source_kinds:'observed-fact,provider-reported'},
  ],{walletKind:'evm',limit:10});
  assert.equal(rows[0]?.chainKey,'ethereum');
  assert.equal(rows[0]?.sourceKind,'observed');
  assert.equal(rows[1]?.sourceKind,'provider-reported');
  assert.equal(rows[1]?.tradeCount,3);
});

test('wallet system route stays read-only and honest-empty',()=>{
  const source=readFileSync(new URL('./intelligence-research-index.mjs',import.meta.url),'utf8');
  assert.match(source,/\/api\/intelligence\/research\/wallet-system/);
  assert.match(source,/No retained wallet\/token observations are indexed/);
  assert.match(source,/No holdings, trades, or PnL were invented/);
  assert.doesNotMatch(source,/wallet_system.*fetch\(/i);
});
