import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseFlightSession,__universeFlightSessionContract} from './universe-flight-session.mjs';

const ADDRESS='11111111111111111111111111111111';

test('session composes destination, sector, replay, recording and movie',()=>{
  const session=createUniverseFlightSession();
  const plan=session.planDestination(ADDRESS,{resolution:{ok:true,state:'resolved',kind:'solana-address',label:'token-mint'},index:{indexed:true,eventCount:1}});
  assert.equal(plan.state,'ready');
  session.lockDestination({kind:'token',id:ADDRESS});
  const sector=session.loadProjection([{entityId:ADDRESS,entityKind:'token',category:'swap',observedAt:100,magnitudeBand:.9,evidence:{signature:'sig1'}}]);
  assert.equal(sector.entityCount,1);
  const replay=session.loadReplay({activity:{totalEvents:1},events:[{id:'sig1',signature:'sig1',timestamp:100000,token:ADDRESS,kind:'trade',side:'buy',tokenDelta:100,verification:'verified',sources:['helius']}]});
  assert.equal(replay.timeline.length,1);
  session.startRecording(1000);session.attachEvidence({id:'sig1',signature:'sig1',source:'helius',blockTime:100});session.sampleFlight({x:1,y:2,a:.2},1000);session.cue('trade-event',{evidenceId:'sig1'},1100);session.stopRecording(1200);
  const movie=session.buildMovie({id:'movie',storyType:'massive-win',coverage:{from:100,to:100,verifiedPercent:100,statement:'Indexed evidence for selected event.'}});
  assert.equal(movie.storyType,'massive-win');assert.equal(movie.evidence[0].signature,'sig1');
});

test('session contract keeps networking outside the game core',()=>{
  assert.equal(__universeFlightSessionContract.networkInjectedExternally,true);assert.equal(__universeFlightSessionContract.clientPhysicsIndependent,true);
});

