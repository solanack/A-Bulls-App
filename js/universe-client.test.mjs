import test from 'node:test';
import assert from 'node:assert/strict';
import { UniverseClient } from './universe-client.mjs';

const snapshot = {
  windowStart:1,
  windowEnd:2,
  observedEventCount:1,
  samplingPolicy:'all bounded observations',
  coverageStatement:'1 of 1 shown',
  sources:['rpc'],
  particles:[{
    id:'entity-1',
    kind:'transaction',
    verificationState:'confirmed',
    observedAt:1,
    category:'swap',
    magnitudeBand:.5,
    position:[1,2,3]
  }]
};

test('client validates a successful read-only snapshot', async () => {
  const events=[];
  const client=new UniverseClient({
    baseUrl:'https://example.test',
    fetchImpl:async()=>new Response(JSON.stringify({ok:true,readOnly:true,completeChainRepresentation:false,snapshot}),{status:200})
  });
  client.subscribe((event)=>events.push(event));
  const result=await client.refresh();
  assert.equal(result.state,'ready');
  assert.equal(result.readOnly,true);
  assert.equal(result.completeChainRepresentation,false);
  assert.equal(client.lastSnapshot.particles.length,1);
  assert.deepEqual(events.map(({state})=>state),['loading','ready']);
});

test('client keeps the last valid snapshot during source degradation', async () => {
  let fail=false;
  const client=new UniverseClient({
    baseUrl:'https://example.test',
    fetchImpl:async()=>fail
      ? new Response(JSON.stringify({ok:false,error:'source_degraded'}),{status:503})
      : new Response(JSON.stringify({ok:true,snapshot}),{status:200})
  });
  await client.refresh();
  fail=true;
  const result=await client.refresh();
  assert.equal(result.state,'degraded');
  assert.equal(result.snapshot.particles.length,1);
});
