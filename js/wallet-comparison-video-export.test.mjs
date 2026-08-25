import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWalletComparisonVideo } from './wallet-comparison-video-export.mjs';

const detail={manifest:{storyType:'wallet-comparison',output:{aspectRatio:'9:16'}},timeline:{scenes:[{id:'s1'}],totalFrames:10,fps:30},renderPlan:[{sceneId:'s1'}],replayEvents:[],candles:[],comparison:{walletA:{wallet:'A'},walletB:{wallet:'B'}},plan:{mode:'on-device-webcodecs'}};

test('renders wallet comparison on-device through injected deterministic drawer',async()=>{let encoded=null;const result=await renderWalletComparisonVideo(detail,{mediaLoader:async()=>({}),negotiate:async()=>({extension:'mp4',videoCodec:'avc1',audioCodec:null}),drawerFactory:()=>async()=>{},encode:async args=>{encoded=args;return{blob:{size:1},extension:'mp4',mimeType:'video/mp4',width:1080,height:1920,fps:30};}});assert.equal(result.videoReady,true);assert.equal(result.extension,'mp4');assert.equal(typeof encoded.drawFrame,'function');});
test('comparison exporter fails closed when local rendering is unsupported',async()=>{const result=await renderWalletComparisonVideo({...detail,plan:{mode:'server-render-required'}});assert.equal(result.videoReady,false);assert.equal(result.renderRequired,'server');});
test('non comparison story never enters comparison renderer',async()=>{const result=await renderWalletComparisonVideo({...detail,manifest:{storyType:'transaction-replay',output:{aspectRatio:'9:16'}}});assert.equal(result.videoReady,false);assert.equal(result.reason,'wallet_comparison_render_plan_unavailable');});
