import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReplayBundle, handleReplayBundleRequest } from './intelligence-replay-bundle.mjs';

const walletA='11111111111111111111111111111111';
const walletB='22222222222222222222222222222222';
const mint='33333333333333333333333333333333';
const quote='44444444444444444444444444444444';

function mockDb(){
  return {
    prepare(sql){
      const state={sql,args:[]};
      return {
        bind(...args){state.args=args;return this;},
        async all(){
          if(state.sql.includes('FROM bull_wallet_events')){
            const wallet=state.args[0];
            return {results:[{
              signature:`sig-${wallet.slice(0,2)}`,slot:12,block_time:150,wallet,counterparty:null,
              program_id:'program',mint,event_class:'swap-like',sol_delta:0,token_delta:wallet===walletA?10:-4,
              fee_lamports:5000,source:'rpc-a',confidence:.92,verified:1,provenance_sources:'rpc-a,archive-b',commitments:'finalized'
            }]};
          }
          if(state.sql.includes('FROM intelligence_trade_routes')){
            const wallet=state.args[0];
            return {results:[wallet===walletA?{
              signature:'sig-11',wallet,hop_index:0,venue:'Jupiter',pool:'pool-a',input_mint:quote,output_mint:mint,
              input_amount:20,output_amount:10,block_time:150,source:'route-index',confidence:.97
            }:{
              signature:'sig-22',wallet,hop_index:0,venue:'Jupiter',pool:'pool-b',input_mint:mint,output_mint:quote,
              input_amount:4,output_amount:12,block_time:150,source:'route-index',confidence:.96
            }]};
          }
          if(state.sql.includes('FROM intelligence_price_candles')){
            return {results:[{bucket_start:120,bucket_seconds:60,open:1,high:3,low:.8,close:2.5,volume_base:50,volume_quote:100,swap_count:4,wallet_count:3,confidence:.9,source_set_json:'["rpc-a"]'}]};
          }
          return {results:[]};
        },
        async first(){
          if(state.sql.includes('FROM intelligence_index_coverage'))return {wallet:state.args[0],complete_to_genesis:1,status:'complete',indexed_events:100,indexed_transactions:80,source_set_json:'["rpc-a"]'};
          if(state.sql.includes('SELECT request_count'))return null;
          return null;
        },
        async run(){return {success:true};}
      };
    }
  };
}

const env=()=>({INTELLIGENCE_DB:mockDb(),PLAYABLE_DATA_ENABLED:'true'});

test('builds a synchronized two-wallet replay with route-backed prices',async()=>{
  const bundle=await buildReplayBundle(env(),{wallets:[walletA,walletB],mint,quoteMint:quote,from:100,to:200,bucketSeconds:60});
  assert.equal(bundle.schemaVersion,'replay-bundle-v1');
  assert.equal(bundle.subject.kind,'wallet-comparison');
  assert.equal(bundle.events.length,2);
  assert.equal(bundle.events[0].side,'buy');
  assert.equal(bundle.events[0].price,2);
  assert.equal(bundle.events[1].side,'sell');
  assert.equal(bundle.events[1].price,3);
  assert.equal(bundle.candles.length,1);
  assert.equal(bundle.coverage.complete,true);
  assert.equal(bundle.verification.verified,2);
});

test('does not invent execution prices without a quote mint',async()=>{
  const bundle=await buildReplayBundle(env(),{wallet:walletA,mint,from:100,to:200});
  assert.equal(bundle.events[0].side,'buy');
  assert.equal(bundle.events[0].price,null);
  assert.equal(bundle.candles.length,0);
  assert.match(bundle.caveats.join(' '),/not inferred/i);
});

test('HTTP route is fail-closed and validates input',async()=>{
  const endpoint='https://example.test/api/intelligence/replay-bundle';
  const disabled=await handleReplayBundleRequest(new Request(endpoint,{method:'POST',body:JSON.stringify({wallet:walletA,mint})}),{INTELLIGENCE_DB:mockDb()});
  assert.equal(disabled.status,404);
  const invalid=await handleReplayBundleRequest(new Request(endpoint,{method:'POST',body:JSON.stringify({wallet:'bad',mint})}),env());
  assert.equal(invalid.status,400);
  const good=await handleReplayBundleRequest(new Request(endpoint,{method:'POST',body:JSON.stringify({wallet:walletA,mint,from:100,to:200})}),env());
  const body=await good.json();
  assert.equal(good.status,200);
  assert.equal(body.ok,true);
  assert.equal(body.bundle.eventCount,1);
});
