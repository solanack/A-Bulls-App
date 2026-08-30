import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightRecorder,recordingToMovieInputs,__flightRecorderContract} from './universe-flight-recorder.mjs';

test('recorder samples bounded camera/ship path and evidence cues',()=>{
  const r=createFlightRecorder({sampleMs:100,maxFrames:120});
  r.start(1000);r.attachEvidence({id:'e1',signature:'sig',source:'helius'});r.sample({x:1,y:2,a:.5},1000);r.sample({x:3,y:4,a:.6},1050);r.sample({x:5,y:6,a:.7},1100);r.cue('trade-event',{evidenceId:'e1',side:'buy'},1150);
  const recording=r.stop(1200),inputs=recordingToMovieInputs(recording);
  assert.equal(recording.frames.length,2);assert.equal(inputs.evidence.length,1);assert.equal(inputs.replayEvents[0].evidenceId,'e1');
});

test('recorder refuses evidence without provenance reference',()=>{
  const r=createFlightRecorder();r.start(1);assert.throws(()=>r.attachEvidence({id:'x'}),/source required/);
});

test('contract keeps recording cheap and client-only',()=>{
  assert.equal(__flightRecorderContract.clientOnly,true);assert.equal(__flightRecorderContract.boundedFrames,true);assert.equal(__flightRecorderContract.defaultMaxFrames,3600);
});


