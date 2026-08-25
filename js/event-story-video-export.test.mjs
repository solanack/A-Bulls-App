import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEventStoryVideo } from './event-story-video-export.mjs';

const detail={manifest:{storyType:'transaction-replay',output:{aspectRatio:'9:16'}},timeline:{scenes:[{id:'s1'}],totalFrames:10,fps:30},renderPlan:[{sceneId:'s1',mode:'focus-event',startFrame:0,endFrame:9,durationFrames:10,chainTimeFrom:1000,chainTimeTo:1000,focusId:'a',eventIds:['a']}],replayEvents:[{id:'a',timestamp:1000,side:'buy'}],candles:[],marketContext:{},priceSelection:{mode:'time-only'},plan:{mode:'on-device-webcodecs'}};

test('renders on-device and passes synthesized audio into encoder when codec is available',async()=>{
  const media={};let encodedArgs=null;const fakeAudio={sampleRate:48000,numberOfChannels:2};
  const result=await renderEventStoryVideo(detail,{
    mediaLoader:async()=>media,
    negotiate:async()=>({extension:'mp4',videoCodec:'avc1',audioCodec:'aac'}),
    drawerFactory:()=>async()=>{},
    audioRenderer:async()=>fakeAudio,
    encode:async args=>{encodedArgs=args;return{blob:{size:123},extension:'mp4',mimeType:'video/mp4',width:1080,height:1920,fps:30};}
  });
  assert.equal(result.videoReady,true);assert.equal(result.extension,'mp4');assert.equal(result.width,1080);assert.equal(encodedArgs.media,media);assert.equal(encodedArgs.audioBuffer,fakeAudio);assert.equal(result.audio.embedded,true);assert.ok(result.audio.cueCount>=2);
});

test('exports silent video when no audio codec is negotiated',async()=>{
  let encodedArgs=null;
  const result=await renderEventStoryVideo(detail,{mediaLoader:async()=>({}),negotiate:async()=>({extension:'mp4',videoCodec:'avc1',audioCodec:null}),drawerFactory:()=>async()=>{},audioRenderer:async()=>{throw new Error('should not render audio');},encode:async args=>{encodedArgs=args;return{blob:{size:1},extension:'mp4',mimeType:'video/mp4',width:1080,height:1920,fps:30};}});
  assert.equal(result.videoReady,true);assert.equal(encodedArgs.audioBuffer,null);assert.equal(result.audio.embedded,false);
});

test('fails closed to server rendering when device plan or encoder is unavailable',async()=>{
  const unsupported=await renderEventStoryVideo({...detail,plan:{mode:'server-render-required'}});assert.equal(unsupported.videoReady,false);assert.equal(unsupported.renderRequired,'server');
  const noEncoder=await renderEventStoryVideo(detail,{mediaLoader:async()=>({}),negotiate:async()=>null});assert.equal(noEncoder.videoReady,false);assert.equal(noEncoder.reason,'encoder_unavailable');
});

test('non Event Story manifests never enter the evidence renderer accidentally',async()=>{
  const result=await renderEventStoryVideo({...detail,manifest:{storyType:'wallet-comparison',output:{aspectRatio:'9:16'}}});
  assert.equal(result.videoReady,false);assert.equal(result.reason,'event_story_render_plan_unavailable');
});
