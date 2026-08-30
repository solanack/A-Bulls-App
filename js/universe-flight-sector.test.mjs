import test from 'node:test';
import assert from 'node:assert/strict';
import {projectionToFlightSector,replayToFlightTimeline,flightMarketStateFromReplay,__universeFlightSectorContract} from './universe-flight-sector.mjs';

test('projection is deterministic, bounded and evidence-preserving',()=>{
  const event={entityKind:'wallet',entityId:'wallet-a',category:'transfer',observedAt:100,magnitudeBand:.7,commitment:'verified',evidence:{signature:'sig-a'}};
  const a=projectionToFlightSector([event],{seed:'same'}),b=projectionToFlightSector([event],{seed:'same'});
  assert.equal(a.particles.length,1);assert.deepEqual(a.particles,b.particles);assert.equal(a.particles[0].evidence.signature,'sig-a');
});

test('duplicate entity ids collapse to strongest projection',()=>{
  const sector=projectionToFlightSector([{entityId:'x',entityKind:'token',magnitudeBand:.2},{entityId:'x',entityKind:'token',magnitudeBand:.9}],{seed:'x'});
  assert.equal(sector.particles.length,1);assert.equal(sector.particles[0].magnitude,.9);
});

test('replay timeline preserves observed trade facts',()=>{
  const timeline=replayToFlightTimeline({events:[{id:'1',timestamp:1000,signature:'sig',wallet:'w',token:'t',kind:'trade',side:'buy',tokenDelta:50,verification:'verified',sources:['helius']}]});
  assert.equal(timeline.length,1);assert.equal(timeline[0].side,'buy');assert.equal(timeline[0].signature,'sig');
});

test('market state is normalized and does not invent prices',()=>{
  const state=flightMarketStateFromReplay({activity:{totalEvents:20},events:[{kind:'trade',side:'buy',tokenDelta:5},{kind:'trade',side:'sell',tokenDelta:-2}]});
  assert.equal(state.buyPressure,.5);assert.ok(state.volume>0&&state.volume<=1);assert.equal(Object.hasOwn(state,'price'),false);
});

test('contract guarantees bounded zero-network adapter',()=>{
  assert.equal(__universeFlightSectorContract.noNetworkCalls,true);assert.equal(__universeFlightSectorContract.observedDataOnly,true);assert.equal(__universeFlightSectorContract.boundedProjectionItems,1000);
});

