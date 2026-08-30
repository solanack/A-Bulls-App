import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventMarketContext, handleEventMarketContextRequest } from './intelligence-event-context.mjs';

const walletA='11111111111111111111111111111111';
const walletB='22222222222222222222222222222222';
const mint='33333333333333333333333333333333';
const quote='44444444444444444444444444444444';

function mockDb(){
  return {prepare(sql){const state={sql,args:[]};return{bind(...args){state.args=args;return this;},async all(){
    if(state.sql.includes('FROM bull_wallet_events'))return{results:[
      {signature:'sig-a',slot:10,block_time:990,wallet:walletA,counterparty:null,program_id:'program-a',mint,event_class:'swap-like',sol_delta:-1,token_delta:5,fee_lamports:5000,source:'rpc-a',confidence:.9},
      {signature:'sig-b',slot:11,block_time:1010,wallet:walletB,counterparty:walletA,program_id:'program-b',mint,event_class:'swap-like',sol_delta:1,token_delta:-2,fee_lamports:6000,source:'rpc-b',confidence:.8}
    ]};
    if(state.sql.includes('FROM intelligence_price_candles'))return{results:[
      {quote_mint:quote,bucket_start:600,bucket_seconds:60,open:.7,high:.9,low:.6,close:.8,swap_count:1,wallet_count:1,confidence:.75,source_set_json:'["archive-b"]'},
      {quote_mint:quote,bucket_start:960,bucket_seconds:60,open:1,high:1.2,low:.9,close:1,swap_count:2,wallet_count:2,confidence:.8,source_set_json:'["rpc-a"]'},
      {quote_mint:quote,bucket_start:1020,bucket_seconds:60,open:1,high:1.5,low:1,close:1.4,swap_count:3,wallet_count:3,confidence:.9,source_set_json:'["rpc-a","archive-b"]'},
      {quote_mint:quote,bucket_start:1320,bucket_seconds:60,open:1.4,high:1.7,low:1.3,close:1.6,swap_count:4,wallet_count:4,confidence:.92,source_set_json:'["rpc-a"]'},
      {quote_mint:quote,bucket_start:1920,bucket_seconds:60,open:1.6,high:2,low:1.5,close:1.8,swap_count:5,wallet_count:5,confidence:.93,source_set_json:'["rpc-a"]'}
    ]};
    if(state.sql.includes('FROM intelligence_trade_routes'))return{results:[
      {signature:'sig-a',wallet:walletA,venue:'Jupiter',pool:'pool-a',input_mint:quote,output_mint:mint,block_time:990,source:'route-index',confidence:.9},
      {signature:'sig-b',wallet:walletB,venue:'Jupiter',pool:'pool-b',input_mint:mint,output_mint:quote,block_time:1010,source:'route-index',confidence:.9}
    ]};
    return{results:[]};
  },async first(){if(state.sql.includes('SELECT request_count'))return null;return null;},async run(){return{success:true};}};}};
}
const env=()=>({DB:mockDb(),PLAYABLE_DATA_ENABLED:'true'});

test('builds bounded all-wallet market context without ownership or intent claims',async()=>{
  const context=await buildEventMarketContext(env(),{mint,timestamp:1000_000,subjectWallet:walletA,signature:'sig-a',windowSeconds:1800});
  assert.equal(context.schemaVersion,'event-market-context-v1');
  assert.equal(context.activity.eventCount,2);
  assert.equal(context.activity.walletCount,2);
  assert.equal(context.activity.buyCount,1);
  assert.equal(context.activity.sellCount,1);
  assert.equal(context.pricePairs[0].quoteMint,quote);
  assert.equal(context.pricePairs[0].candles.length,5);
  assert.equal(context.pricePairs[0].candles[0].timestamp,600000);
  assert.equal(context.pricePairs[0].candles[0].bucketSeconds,60);
  assert.deepEqual(context.pricePairs[0].candles[0].sources,['archive-b']);
  assert.equal(Math.round(context.pricePairs[0].changePercent),125);
  assert.equal(context.routes.venues[0].id,'Jupiter');
  assert.equal(context.selected.signature,'sig-a');
  assert.ok(!/(same owner|coordinated|intended|believed)/i.test(context.observations.join(' ')));
});

test('reports deterministic before and after windows with actual elapsed time',async()=>{
  const context=await buildEventMarketContext(env(),{mint,timestamp:1000_000,windowSeconds:1800});
  const pair=context.pricePairs[0];
  const before5=pair.before.find(item=>item.requestedSeconds===300);
  const after5=pair.after.find(item=>item.requestedSeconds===300);
  assert.equal(before5.sampleTime,600);
  assert.equal(before5.anchorTime,960);
  assert.equal(before5.actualSeconds,360);
  assert.equal(Math.round(before5.changePercent),25);
  assert.equal(after5.sampleTime,1320);
  assert.equal(after5.anchorTime,960);
  assert.equal(after5.actualSeconds,360);
  assert.equal(Math.round(after5.changePercent),60);
});

test('HTTP endpoint is feature-gated and validates input',async()=>{
  const url='https://example.test/api/intelligence/event-context';
  const disabled=await handleEventMarketContextRequest(new Request(url,{method:'POST',body:JSON.stringify({mint,timestamp:1000000})}),{DB:mockDb()});
  assert.equal(disabled.status,404);
  const invalid=await handleEventMarketContextRequest(new Request(url,{method:'POST',body:JSON.stringify({mint:'bad',timestamp:1000000})}),env());
  assert.equal(invalid.status,400);
  const good=await handleEventMarketContextRequest(new Request(url,{method:'POST',body:JSON.stringify({mint,timestamp:1000000})}),env());
  const body=await good.json();
  assert.equal(good.status,200);
  assert.equal(body.ok,true);
  assert.equal(body.context.activity.walletCount,2);
});


