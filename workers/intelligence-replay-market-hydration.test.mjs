import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseExactReplayPool, normalizeGeckoOhlcvRows } from './intelligence-replay-market-hydration.mjs';

const mint='33333333333333333333333333333333';
const quote='44444444444444444444444444444444';
const pool='55555555555555555555555555555555';

test('selects only an exact Solana base/quote pool for Replay',()=>{
  const payload={data:[
    {id:'solana_66666666666666666666666666666666',attributes:{address:'66666666666666666666666666666666'},relationships:{base_token:{data:{id:`solana_${mint}`}},quote_token:{data:{id:'77777777777777777777777777777777'}}}},
    {id:`solana_${pool}`,attributes:{address:pool},relationships:{base_token:{data:{id:`solana_${quote}`}},quote_token:{data:{id:`solana_${mint}`}}}}
  ]};
  assert.deepEqual(chooseExactReplayPool(payload,mint,quote),{address:pool,base:quote,quote:mint});
  assert.equal(chooseExactReplayPool(payload,mint,'88888888888888888888888888888888'),null);
});

test('normalizes only finite positive OHLC rows inside the Replay window',()=>{
  const rows=normalizeGeckoOhlcvRows([
    [90,1,2,.5,1.5,100],
    [120,1,2,.75,1.7,120],
    [120,1.1,2.1,.8,1.8,125],
    [180,1.8,2.2,1.7,2,140],
    [240,0,2,1,1.5,100]
  ],60,100,200);
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0],{bucket_start:120,bucket_seconds:60,open:1.1,high:2.1,low:.8,close:1.8});
  assert.equal(rows[1].bucket_start,180);
});
