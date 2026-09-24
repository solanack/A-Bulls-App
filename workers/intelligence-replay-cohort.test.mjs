import test from 'node:test';
import assert from 'node:assert/strict';
import { readReplayCohort, shapeCohort, __replayCohortContract } from './intelligence-replay-cohort.mjs';

const W='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',B='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',M='0xfe189e97832da1573e4e4ff034f4ffc3a15c7777';

test('cohort keeps only other wallets buying after the first print and never claims follow or copy',()=>{
  const out=shapeCohort([{id:'1',wallet:W,time:200},{id:'2',wallet:B,time:150},{id:'3',wallet:B.toUpperCase().replace('0X','0x'),time:250,callsign:'@bee'},{id:'3',wallet:B,time:250}],{room:'fomo',chain:'bsc',wallet:W,after:200,to:1000});
  assert.equal(out.count,1);assert.equal(out.items[0].callsign,'@bee');assert.equal(out.items[0].time,250_000);
  assert.doesNotMatch(JSON.stringify(out),/follow|copied|copy/i);
  assert.equal(__replayCohortContract.followCopyClaimed,false);
});

test('FOMO cohort reads only same-chain fomo trades on the mint',async()=>{
  const binds=[];const db={prepare:sql=>({bind:(...args)=>{binds.push({sql,args});return{all:async()=>({results:sql.includes('fomo_trader_trades')?[{handle:'Bee',trade_id:'t1',chain:'bsc',created_at:300,avg_entry_price:0.11,evm_wallet:B},{handle:'Other',trade_id:'t2',chain:'base',created_at:310,evm_wallet:'0xcccccccccccccccccccccccccccccccccccccccc'},{handle:'Self',trade_id:'t3',chain:'bsc',created_at:320,evm_wallet:W}]:[]})};}})};
  const out=await readReplayCohort({INTELLIGENCE_DB:db},{room:'fomo',chain:'bsc',mint:M,wallet:W,after:200,to:1000});
  assert.equal(out.count,1);assert.equal(out.items[0].callsign,'@Bee');assert.equal(out.items[0].source,'fomoapi.io/trades');
  assert.ok(binds.every(item=>!item.sql.includes('bull_wallet_events')));
});

test('invalid room is refused rather than mixing rooms',async()=>{
  const out=await readReplayCohort({},{room:'all',chain:'bsc',mint:M,wallet:W,after:200});
  assert.equal(out.ok,false);assert.equal(out.items.length,0);
});
