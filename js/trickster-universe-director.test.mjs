import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTricksterDirectorCues,buildTricksterSimulationCue,__tricksterUniverseDirectorContract} from './trickster-universe-director.mjs';

test('observed director cues stay bounded and evidence referenced',()=>{
  const timeline=Array.from({length:100},(_,i)=>({id:`e${i}`,signature:`sig${i}`,timestamp:1000+i,kind:'trade',side:i%2?'buy':'sell',magnitude:.6,token:'TokenAddressExample123456789',wallet:'WalletAddressExample123456789'}));
  const cues=buildTricksterDirectorCues(timeline);
  assert.ok(cues.length<=24);assert.ok(cues.every(c=>c.claimKind==='observed'&&c.evidenceId));
});

test('simulation cue is unmistakably disclosed',()=>{
  const cue=buildTricksterSimulationCue({at:5,summary:'Held instead of selling'});
  assert.equal(cue.claimKind,'simulated');assert.match(cue.disclosure,/not an observed blockchain event/i);
});

test('director contract makes no network calls',()=>{
  assert.equal(__tricksterUniverseDirectorContract.noNetworkCalls,true);assert.equal(__tricksterUniverseDirectorContract.simulationAlwaysDisclosed,true);
});

