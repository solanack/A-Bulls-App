import test from 'node:test';
import assert from 'node:assert/strict';
import { projectIndexedEventToUniverse,projectIndexedEventsToUniverse } from './intelligence-universe-projection.mjs';

const wallet='11111111111111111111111111111111';
const mint='So11111111111111111111111111111111111111112';
const program='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

test('projects only explicit loaded identifiers from one normalized event',()=>{
  const observations=projectIndexedEventToUniverse({signature:'sig-1',wallet,mint,programId:program,eventClass:'swap-like',blockTime:100,slot:9,tokenDelta:12,source:'yellowstone'});
  assert.deepEqual(observations.map(item=>item.entityKind),['transaction','wallet','token','program']);
  assert.equal(observations[0].category,'swap');
  assert.equal(observations[0].evidence.relations.length,3);
  assert.ok(observations[0].evidence.relations.every(edge=>edge.sourceId==='sig-1'&&edge.evidenceId==='sig-1'));
});

test('does not invent wallet/token/program entities from malformed identifiers',()=>{
  const observations=projectIndexedEventToUniverse({signature:'sig-2',wallet:'unknown',mint:'?',programId:'venue-name',eventClass:'transfer',blockTime:100,source:'rpc'});
  assert.deepEqual(observations.map(item=>item.entityKind),['transaction']);
  assert.deepEqual(observations[0].evidence.relations,[]);
});

test('fails closed for events without a signature, source, or observed chain time',()=>{
  assert.deepEqual(projectIndexedEventToUniverse({source:'rpc',blockTime:100}),[]);
  assert.deepEqual(projectIndexedEventToUniverse({signature:'sig',blockTime:100}),[]);
  assert.deepEqual(projectIndexedEventToUniverse({signature:'sig',source:'rpc'}),[]);
});

test('caps projected observation volume',()=>{
  const events=Array.from({length:500},(_,index)=>({signature:`sig-${index}`,wallet,mint,programId:program,eventClass:'swap-like',blockTime:index+1,source:'yellowstone'}));
  assert.equal(projectIndexedEventsToUniverse(events).length,1000);
});

