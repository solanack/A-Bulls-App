import { buildWalletComparisonFrameModel } from './wallet-comparison-frame-model.mjs';
import { drawWalletComparisonFrame } from './wallet-comparison-frame-renderer.mjs';
import { sceneTransitionAtFrame } from './event-story-scene-transition.mjs';
import { buildTricksterCaptionPlan, captionAtFrame } from './trickster-caption-plan.mjs';
import { drawTricksterCaption } from './trickster-caption-renderer.mjs';

function overlay(ctx,transition){if(!transition||!(transition.overlayOpacity>0))return;ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,transition.overlayOpacity));ctx.fillStyle='#07070a';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();}

export function createWalletComparisonCinematicFrameDrawer({bundle,manifest,renderPlan,fadeFrames=10}){
  const timeline={scenes:renderPlan.map(item=>({id:item.sceneId,type:item.type,startFrame:item.startFrame,endFrame:item.endFrame}))},captions=buildTricksterCaptionPlan(manifest,timeline);
  return async function drawFrame(ctx,frame){
    const model=buildWalletComparisonFrameModel({bundle,manifest,renderPlan},frame);if(!model)throw new RangeError('frame is outside the wallet comparison render plan');
    drawWalletComparisonFrame(ctx,model);const caption=captionAtFrame(captions,frame);if(caption)drawTricksterCaption(ctx,caption);
    const transition=sceneTransitionAtFrame(renderPlan,frame,{fadeFrames});overlay(ctx,transition);
    return Object.freeze({model,caption,transition});
  };
}
