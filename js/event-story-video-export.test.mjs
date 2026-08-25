import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEventStoryVideo } from './event-story-video-export.mjs';

const detail={manifest:{storyType:'transaction-replay',output:{aspectRatio:'9:16'}},timeline:{scenes:[{id:'s1'}],totalFrames:10,fps:30},renderPlan:[{sceneId:'s1'}],replayEvents:[],candles:[],marketContext:{},priceSelection:{mode:'time-only'},plan:{mode:'on-device-webcodecs'}};

test('renders on-device when media, encoder and draw pipeline are available',async()=>{
  const media={};let encodedArgs=null;
  const result=await renderEventStoryVideo(detail,{
    mediaLoader:async()=>media,
    negotiate:async()=>({extension:'mp4',videoCodec:'avc1',audioCodec:null}),
    drawerFactory:()=>async()=>{},
    encode:async args=>{encodedArgs=args;return{blob:{size:123},extension:'mp4',mimeType:'video/mp4',width:1080,height:1920,fps:30};}
  });
  assert.equal(result.videoReady,true);assert.equal(result.extension,'mp4');assert.equal(result.width,1080);assert.equal(encodedArgs.media,media);assert.equal(typeof encodedArgs.drawFrame,'function');
});

test('fails closed to server rendering when device plan or encoder is unavailable',async()=>{
  const unsupported=await renderEventStoryVideo({...detail,plan:{mode:'server-render-required'}});assert.equal(unsupported.videoReady,false);assert.equal(unsupported.renderRequired,'server');
  const noEncoder=await renderEventStoryVideo(detail,{mediaLoader:async()=>({}),negotiate:async()=>null});assert.equal(noEncoder.videoReady,false);assert.equal(noEncoder.reason,'encoder_unavailable');
});

test('non Event Story manifests never enter the evidence renderer accidentally',async()=>{
  const result=await renderEventStoryVideo({...detail,manifest:{storyType:'wallet-comparison',output:{aspectRatio:'9:16'}}});
  assert.equal(result.videoReady,false);assert.equal(result.reason,'event_story_render_plan_unavailable');
});
