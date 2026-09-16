import assert from 'node:assert/strict';
import test from 'node:test';
import { __fomoResultsContract, rankClosedFomoTrades } from './intelligence-fomo-results.mjs';

const wallet='9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU';
const mintA='5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump';
const mintB='So11111111111111111111111111111111111111112';
const now=1_789_560_000_000;
const row=(overrides={})=>({handle:'coby',display_name:'Coby',current_rank:1,solana_wallet:wallet,trade_id:'trade-1',token_address:mintA,symbol:'TEST',status:'closed',realized_pnl_usd:100,avg_entry_price:1,avg_exit_price:2,created_at:1_789_500_000,closed_at:1_789_540_000,observed_indexed:0,...overrides});

test('closed Fomo outcomes split winners and losses and rank by realized provider PnL',()=>{
  const result=rankClosedFomoTrades([
    row({trade_id:'win-small',realized_pnl_usd:25}),
    row({trade_id:'win-big',realized_pnl_usd:300,token_address:mintB,observed_indexed:1}),
    row({trade_id:'loss-small',realized_pnl_usd:-10}),
    row({trade_id:'loss-big',realized_pnl_usd:-250,token_address:mintB}),
  ],{limit:3,nowMs:now});
  assert.deepEqual(result.winners.map(item=>item.tradeId),['win-big','win-small']);
  assert.deepEqual(result.losers.map(item=>item.tradeId),['loss-big','loss-small']);
  assert.equal(result.winners[0].observedIndexed,true);
  assert.equal(result.winners[0].fromTs,1_789_496_400_000);
  assert.equal(result.winners[0].toTs,1_789_543_600_000);
});

test('finished outcome discovery rejects open, neutral, missing-close, and non-Solana subjects',()=>{
  const result=rankClosedFomoTrades([
    row({trade_id:'open',status:'open'}),
    row({trade_id:'neutral',realized_pnl_usd:0}),
    row({trade_id:'missing-close',closed_at:null}),
    row({trade_id:'evm-wallet',solana_wallet:'0x322f0929c4625ed5bad873c95208d54e1c4f30f2'}),
    row({trade_id:'evm-token',token_address:'0x322f0929c4625ed5bad873c95208d54e1c4f30f2'}),
  ],{nowMs:now});
  assert.equal(result.winners.length,0);
  assert.equal(result.losers.length,0);
});

test('Fomo result surface is closed-only, read-only, and provider-free on page reads',()=>{
  assert.equal(__fomoResultsContract.path,'/api/intelligence/fomo/results');
  assert.equal(__fomoResultsContract.closedOnly,true);
  assert.equal(__fomoResultsContract.requiresFiniteRealizedPnl,true);
  assert.equal(__fomoResultsContract.pageReadsProviderFree,true);
  assert.equal(__fomoResultsContract.readOnly,true);
});
