import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeObservation,positionForEntity,sampleUniverseObservations,universeSnapshot } from './intelligence-universe-runtime.mjs';
import { handleUniverseRequest } from './intelligence-universe-router.mjs';

test('entity positions are stable across snapshots',()=>{assert.deepEqual(positionForEntity('wallet-1'),positionForEntity('wallet-1'));assert.notDeepEqual(positionForEntity('wallet-1'),positionForEntity('wallet-2'));});

test('observation normalization fails closed and clamps magnitude',()=>{const item=normalizeObservation({eventId:'event-1',entityKind:'wallet',entityId:'wallet-1',category:'transfer',observedAt:100,commitment:'confirmed',magnitudeBand:2,source:'yellowstone'});assert.equal(item.magnitudeBand,1);assert.equal(item.commitment,'confirmed');assert.throws(()=>normalizeObservation({entityId:'wallet-1'}),/required/);});

test('sampling is capped and retains category diversity',()=>{const rows=Array.from({length:100},(_,index)=>({event_id:`event-${index}`,category:index%2?'swap':'nft',magnitude_band:index/100,observed_at:index}));const sampled=sampleUniverseObservations(rows,20);assert.equal(sampled.length,20);assert.deepEqual(new Set(sampled.map(({category})=>category)),new Set(['swap','nft']));});

test('missing database returns an honest empty snapshot',async()=>{const snapshot=await universeSnapshot({},{now:1000,windowSeconds:60});assert.equal(snapshot.observedEventCount,0);assert.equal(snapshot.particles.length,0);assert.deepEqual(snapshot.relations,[]);assert.match(snapshot.coverageStatement,/No live observations/);});

test('explicit evidence relations survive a bounded live snapshot',async()=>{const rows=[{event_id:'event-a',entity_kind:'wallet',entity_id:'wallet-a',category:'transfer',observed_at:995,commitment:'verified',magnitude_band:.5,source:'yellowstone',evidence_json:JSON.stringify({relations:[{sourceId:'wallet-a',targetId:'tx-b',evidenceId:'sig-1',kind:'transaction'}]})},{event_id:'event-b',entity_kind:'transaction',entity_id:'tx-b',category:'swap',observed_at:996,commitment:'confirmed',magnitude_band:.7,source:'yellowstone',evidence_json:'{}'}];const db={prepare(){return{bind(){return{async all(){return{results:rows};}};}};}};const snapshot=await universeSnapshot({INTELLIGENCE_DB:db},{now:1000,windowSeconds:60,limit:10});assert.equal(snapshot.particles.length,2);assert.equal(snapshot.relations.length,1);assert.equal(snapshot.relations[0].evidenceId,'sig-1');assert.equal(snapshot.relations[0].sourceId,'wallet-a');assert.equal(snapshot.relations[0].targetId,'tx-b');});

test('endpoint is disabled unless explicitly enabled',async()=>{const response=await handleUniverseRequest(new Request('https://example.test/api/intelligence/universe-snapshot'),{});assert.equal(response.status,404);assert.equal((await response.json()).error,'feature_disabled');});
