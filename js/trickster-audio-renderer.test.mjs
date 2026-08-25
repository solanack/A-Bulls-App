import test from 'node:test';
import assert from 'node:assert/strict';
import { cueToneSpec, renderTricksterAudioBuffer, audioCueMixInfo } from './trickster-audio-renderer.mjs';

test('uses distinct deterministic tone specs for evidence and simulation cues',()=>{
  assert.deepEqual(cueToneSpec({kind:'buy-impact'}),cueToneSpec({kind:'buy-impact'}));
  assert.notDeepEqual(cueToneSpec({kind:'buy-impact'}),cueToneSpec({kind:'sell-impact'}));
  assert.notDeepEqual(cueToneSpec({kind:'simulation-impact'}),cueToneSpec({kind:'buy-impact'}));
  assert.equal(cueToneSpec({kind:'simulation-impact'}).wave,'square');
});

test('fails open to silent video when offline audio rendering is unavailable',async()=>{
  const audio=await renderTricksterAudioBuffer({durationSeconds:1,cues:[]},{OfflineAudioContextClass:null});
  assert.equal(audio,null);
  assert.deepEqual(audioCueMixInfo({durationSeconds:1,cues:[{kind:'scene-transition'}]},audio),{cueCount:1,durationSeconds:1,embedded:false,sampleRate:null,channels:null});
});

test('schedules deterministic stereo panning when the offline context supports it',async()=>{
  const pans=[];
  class FakeOfflineAudioContext{
    constructor(channels,length,sampleRate){this.destination={};this.channels=channels;this.length=length;this.sampleRate=sampleRate;}
    createOscillator(){return{type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}};}
    createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
    createStereoPanner(){return{pan:{setValueAtTime(value){pans.push(value);}},connect(){}};}
    async startRendering(){return{sampleRate:this.sampleRate,numberOfChannels:this.channels};}
  }
  const buffer=await renderTricksterAudioBuffer({durationSeconds:1,cues:[{kind:'buy-impact',time:.2,pan:-.35},{kind:'sell-impact',time:.5,pan:.35},{kind:'simulation-impact',time:.8,pan:0}]},{OfflineAudioContextClass:FakeOfflineAudioContext});
  assert.deepEqual(pans,[-.35,.35,0]);
  assert.equal(buffer.sampleRate,48000);assert.equal(buffer.numberOfChannels,2);
});
