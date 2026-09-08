import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFieldMarkets } from './intelligence-field-markets.mjs';

test('field enrichment batches exact Solana mints and caches positive and empty results',async()=>{
  const a='A'.repeat(32), b='a'.repeat(32), rows=new Map();
  let calls=0;
  const db={prepare(sql){return {bind(...values){return {values,all:async()=>({results:values.map(key=>rows.get(key)).filter(Boolean)})};}}},batch:async statements=>{
    for(const {values:v} of statements)rows.set(v[0],{cache_key:v[0],payload_json:v[1],expires_at:v[4]});
  }};
  const fetchImpl=async url=>{calls++;assert.ok(url.endsWith(`${a},${b}`));return Response.json([{chainId:'solana',baseToken:{address:a,symbol:'A'},priceUsd:'1',marketCap:600000,fdv:900000,volume:{m5:1200},liquidity:{usd:20000}}]);};
  const first=await loadFieldMarkets({INTELLIGENCE_DB:db},[a,a,b],{fetchImpl,now:1000000});
  assert.equal(first[a].marketCapUsd,600000);
  assert.equal(first[a].fdvUsd,900000);
  assert.equal(first[a].volumeUsd.h1,null);
  assert.equal(first[b],undefined);
  assert.deepEqual(await loadFieldMarkets({INTELLIGENCE_DB:db},[a,b],{fetchImpl,now:1001000}),first);
  assert.equal(calls,1);
});

test('malformed provider responses fail instead of clearing cached evidence',async()=>{
  await assert.rejects(loadFieldMarkets({},['A'.repeat(32)],{fetchImpl:async()=>Response.json({error:'bad'})}),/invalid_response/);
});
