import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFlightDestination,planFlightDestination,destinationPrompt,__universeFlightDestinationContract} from './universe-flight-destination.mjs';

const ADDRESS='11111111111111111111111111111111';
const SIG='2'.repeat(64);

test('classifies exact public identifiers only',()=>{
  assert.equal(classifyFlightDestination(ADDRESS).kind,'solana-address');
  assert.equal(classifyFlightDestination(SIG).kind,'transaction-signature');
  assert.equal(classifyFlightDestination('some token').kind,'search-text');
});

test('resolved indexed destination becomes flight ready',()=>{
  const plan=planFlightDestination({query:ADDRESS},{resolution:{ok:true,state:'resolved',kind:'solana-address',label:'token-mint'},index:{indexed:true,eventCount:12}});
  assert.equal(plan.state,'ready');assert.equal(plan.entityKind,'token');assert.equal(plan.destinationVisible,true);assert.equal(destinationPrompt(plan),'DESTINATION LOCKED');
});

test('resolved but unindexed destination becomes fog, never fake data',()=>{
  const plan=planFlightDestination({query:ADDRESS},{resolution:{ok:true,state:'resolved',kind:'solana-address',label:'system-account'},index:{indexed:false,eventCount:0}});
  assert.equal(plan.state,'resolved-not-indexed');assert.equal(plan.fog,true);assert.equal(plan.next,'offer-bounded-index-job');
});

test('destination layer stays read-only and local',()=>{
  assert.equal(__universeFlightDestinationContract.noWalletConnect,true);assert.equal(__universeFlightDestinationContract.noSigning,true);assert.equal(__universeFlightDestinationContract.noNetworkCalls,true);
});

