import assert from 'node:assert/strict';
import test from 'node:test';
import { __fomoResultsContract, handleFomoResultsRequest, rankClosedFomoTrades } from './intelligence-fomo-results.mjs';

const wallet='9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU';
const mintA='5761e8gCMZFBHLU4RuFsfkWab96oJEtEr3uoF9A4pump';
const mintB='So11111111111111111111111111111111111111112';
const now=1_789_560_000_000;
const row=(overrides={})=>({handle:'coby',display_name:'Coby',current_rank:1,chain:'solana',solana_wallet:wallet,evm_wallet:null,trade_id:'trade-1',token_address:mintA,symbol:'TEST',status:'closed',realized_pnl_usd:100,avg_entry_price:1,avg_exit_price:2,created_at:1_789_500_000,closed_at:1_789_540_000,observed_indexed:0,chart_indexed:0,...overrides});

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

test('finished outcome discovery rejects incomplete rows but keeps valid EVM closed trades',()=>{
  const evmWallet='0x1111111111111111111111111111111111111111',evmToken='0x2222222222222222222222222222222222222222';
  const result=rankClosedFomoTrades([
    row({trade_id:'open',status:'open'}),
    row({trade_id:'neutral',realized_pnl_usd:0}),
    row({trade_id:'missing-close',closed_at:null}),
    row({trade_id:'base-win',chain:'base',solana_wallet:null,evm_wallet:evmWallet,token_address:evmToken,realized_pnl_usd:125000,observed_indexed:1,chart_indexed:1}),
  ],{nowMs:now});
  assert.deepEqual(result.winners.map(item=>item.tradeId),['base-win']);
  assert.equal(result.winners[0].chain,'base');
  assert.equal(result.winners[0].wallet,evmWallet);
  assert.equal(result.winners[0].mint,evmToken);
  assert.equal(result.winners[0].chartIndexed,true);
  assert.equal(result.losers.length,0);
});

test('page read scans closed trades once and probes evidence only for displayed rows in one batch',async()=>{
  const rows=Array.from({length:30},(_,i)=>row({trade_id:`t${i}`,realized_pnl_usd:i%2?-(i+1):i+1,token_address:i===2?mintB:mintA}));
  const queries=[],batches=[];
  const db={
    prepare(sql){const stmt={sql,args:[],bind(...args){stmt.args=args;return stmt;},async all(){queries.push(sql);return{results:rows};}};return stmt;},
    async batch(statements){batches.push(statements);return statements.map(stmt=>({results:stmt.args.includes(mintB)&&/bull_wallet_events|intelligence_price_candles\b/.test(stmt.sql)?[{hit:1}]:[]}));},
  };
  const response=await handleFomoResultsRequest(new Request('https://intel.test/api/intelligence/fomo/results?limit=3'),{FOMO_GALAXY_ENABLED:'true',INTELLIGENCE_DB:db});
  const body=await response.json();
  assert.equal(queries.length,1);
  assert.doesNotMatch(queries[0],/EXISTS/);
  assert.equal(batches.length,1);
  assert.ok(batches[0].every(stmt=>!/LOWER\(/i.test(stmt.sql)));
  assert.ok(batches[0].length<=6*4);
  assert.deepEqual(body.winners.map(item=>item.tradeId),['t28','t26','t24']);
  assert.equal(body.replayReadyCount,0);
});

test('evidence flags land on the displayed trade they were probed for',async()=>{
  const rows=[row({trade_id:'indexed',realized_pnl_usd:500,token_address:mintB}),row({trade_id:'plain',realized_pnl_usd:400})];
  const db={
    prepare(sql){const stmt={sql,args:[],bind(...args){stmt.args=args;return stmt;},async all(){return{results:rows};}};return stmt;},
    async batch(statements){return statements.map(stmt=>({results:stmt.args.includes(mintB)?[{hit:1}]:[]}));},
  };
  const body=await(await handleFomoResultsRequest(new Request('https://intel.test/api/intelligence/fomo/results'),{FOMO_GALAXY_ENABLED:'true',INTELLIGENCE_DB:db})).json();
  assert.deepEqual(body.winners.map(item=>[item.tradeId,item.observedIndexed,item.chartIndexed]),[['indexed',true,true],['plain',false,false]]);
  assert.equal(body.replayReadyCount,1);
  assert.equal(body.chartReadyCount,1);
});

test('Fomo result surface is closed-only, read-only, and provider-free on page reads',()=>{
  assert.equal(__fomoResultsContract.path,'/api/intelligence/fomo/results');
  assert.equal(__fomoResultsContract.closedOnly,true);
  assert.equal(__fomoResultsContract.requiresFiniteRealizedPnl,true);
  assert.equal(__fomoResultsContract.multiChain,true);
  assert.equal(__fomoResultsContract.currentSnapshotOnly,true);
  assert.equal(__fomoResultsContract.pageReadsProviderFree,true);
  assert.equal(__fomoResultsContract.readOnly,true);
});
