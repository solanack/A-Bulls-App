import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTricksterAudioCuePlan, cueSummary } from './trickster-audio-cues.mjs';

const timeline={fps:30,totalFrames:120};
const renderPlan=[
  {sceneId:'focus',mode:'focus-event',startFrame:0,endFrame:29,durationFrames:30,chainTimeFrom:1000,chainTimeTo:1000,focusId:'buy-a',eventIds:['buy-a']},
  {sceneId:'market',mode:'market-window',startFrame:30,endFrame:89,durationFrames:60,chainTimeFrom:1000,chainTimeTo:3000},
  {sceneId:'sim',mode:'comparison-simulation',startFrame:90,endFrame:119,durationFrames:30,chainTimeFrom:1000,chainTimeTo:3000}
];
const replayEvents=[{id:'buy-a',timestamp:1000,side:'buy'},{id:'sell-b',timestamp:2500,side:'sell'},{id:'transfer',timestamp:2800,side:'transfer'}];
const whatIf={events:[{id:'sim-a',timestamp:2000,side:'buy',hypothetical:true,verification:'simulation'}]};

test('maps evidence events to deterministic frame-accurate cue times',()=>{
  const first=buildTricksterAudioCuePlan({timeline,renderPlan,replayEvents,whatIf});
  const second=buildTricksterAudioCuePlan({timeline,renderPlan,replayEvents,whatIf});
  assert.deepEqual(first,second);
  assert.equal(first.cues.find(c=>c.sceneId==='focus'&&c.kind==='buy-impact').frame,7);
  assert.equal(first.cues.find(c=>c.eventId==='sell-b').frame,74);
  assert.equal(first.cues.find(c=>c.eventId==='sim-a').frame,105);
  assert.equal(first.cues.some(c=>c.eventId==='transfer'),false);
});

test('keeps simulation cues distinct from observed buy and sell impacts',()=>{
  const plan=buildTricksterAudioCuePlan({timeline,renderPlan,replayEvents,whatIf});
  const summary=cueSummary(plan);
  assert.equal(summary.buyImpacts,2);
  assert.equal(summary.sellImpacts,1);
  assert.equal(summary.simulationImpacts,1);
  assert.equal(summary.sceneTransitions,2);
  assert.equal(summary.simulationTransitions,1);
});

test('places Wallet A left and Wallet B right while simulations remain centered',()=>{
  const plan=buildTricksterAudioCuePlan({timeline:{fps:30,totalFrames:60},renderPlan:[{sceneId:'compare',mode:'comparison-replay',startFrame:0,endFrame:59,durationFrames:60,chainTimeFrom:1000,chainTimeTo:3000,walletA:'A',walletB:'B'}],replayEvents:[{id:'a',wallet:'A',timestamp:1500,side:'buy'},{id:'b',wallet:'B',timestamp:2500,side:'sell'}]});
  assert.equal(plan.cues.find(c=>c.eventId==='a').pan,-.35);
  assert.equal(plan.cues.find(c=>c.eventId==='b').pan,.35);
  assert.equal(buildTricksterAudioCuePlan({timeline,renderPlan,replayEvents,whatIf}).cues.find(c=>c.eventId==='sim-a').pan,0);
});
