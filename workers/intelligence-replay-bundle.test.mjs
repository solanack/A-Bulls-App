import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveReplayBucketSeconds, aggregateReplayCandleRows, buildReplayBundle, handleReplayBundleRequest } from './intelligence-replay-bundle.mjs';

const walletA='11111111111111111111111111111111';
const walletB='22222222222222222222222222222222';
const mint='33333333333333333333333333333333';
const quote='44444444444444444444444444444444';

function mockDb({coverageComplete=true,completedWindowJob=false}={}){
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
          if(state.sql.includes('FROM intelligence_index_coverage'))return {wallet:state.args[0],complete_to_genesis:coverageComplete?1:0,status:coverageComplete?'complete':'bounded-window-complete',indexed_events:100,indexed_transactions:80,source_set_json:'["rpc-a"]'};
          if(state.sql.includes("state IN ('queued','running','waiting-external')"))return null;
          if(state.sql.includes("state='complete'")&&state.sql.includes('FROM intelligence_index_jobs')&&completedWindowJob)return {id:9,state:'complete',requested_from:100,requested_to:200};
          if(state.sql.includes('SELECT request_count'))return null;
          if(state.sql.includes('FROM intelligence_scheduler_leases'))return null;
          return null;
        },
        async run(){return {success:true,meta:{changes:1,last_row_id:10}};}
      };
    }
  };
}

const env=(options={})=>({INTELLIGENCE_DB:mockDb(options),PLAYABLE_DATA_ENABLED:'true'});

test('builds a synchronized two-wallet chain-qualified Solana replay with route-backed prices',async()=>{
  const bundle=await buildReplayBundle(env(),{wallets:[walletA,walletB],mint,quoteMint:quote,from:100,to:200,bucketSeconds:60});
  assert.equal(bundle.schemaVersion,'replay-bundle-v2');
  assert.equal(bundle.subject.chain,'solana');
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

test('aggregates retained finer candles into the adaptive Replay bucket without inventing OHLC',()=>{
  const rows=[
    {bucket_start:0,bucket_seconds:60,open:1,high:2,low:.8,close:1.5,volume_base:10,volume_quote:20,swap_count:2,wallet_count:2,confidence:.9,source_set_json:'["rpc-a"]'},
    {bucket_start:60,bucket_seconds:60,open:1.5,high:3,low:1.4,close:2.5,volume_base:15,volume_quote:30,swap_count:3,wallet_count:3,confidence:.8,source_set_json:'["rpc-b"]'}
  ];
  const candles=aggregateReplayCandleRows(rows,300);
  assert.equal(candles.length,1);
  assert.equal(candles[0].bucket_seconds,300);
  assert.equal(candles[0].open,1);
  assert.equal(candles[0].high,3);
  assert.equal(candles[0].low,.8);
  assert.equal(candles[0].close,2.5);
  assert.equal(candles[0].volume_base,25);
  assert.equal(candles[0].swap_count,5);
  assert.deepEqual(JSON.parse(candles[0].source_set_json),['rpc-a','rpc-b']);
});

test('adaptive Replay buckets preserve detail for short windows and bound long histories',()=>{
  assert.equal(adaptiveReplayBucketSeconds(0,2*86400,0),900);
  assert.equal(adaptiveReplayBucketSeconds(0,10*86400,60),3600);
  assert.equal(adaptiveReplayBucketSeconds(0,90*86400,60),43200);
  assert.equal(adaptiveReplayBucketSeconds(0,5*365*86400,60),86400);
});

test('marks a completed bounded Replay window ready without pretending genesis coverage',async()=>{
  const endpoint='https://example.test/api/intelligence/replay-bundle';
  const response=await handleReplayBundleRequest(new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({wallet:walletA,mint,quoteMint:quote,from:100,to:200,bucketSeconds:60})}),env({coverageComplete:false,completedWindowJob:true}));
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.bundle.coverage.complete,false);
  assert.equal(body.bundle.indexing.requested,false);
  assert.equal(body.bundle.indexing.windowComplete,true);
  assert.equal(body.bundle.indexing.state,'window-ready');
  assert.match(body.bundle.indexing.disclosure,/selected Replay window has completed/i);
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