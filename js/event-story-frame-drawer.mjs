import { buildEventStoryFrameModel } from './event-story-frame-model.mjs';
import { drawEventStoryFrame } from './event-story-frame-renderer.mjs';
import { sceneTransitionAtFrame } from './event-story-scene-transition.mjs';
import { buildTricksterCaptionPlan, captionAtFrame } from './trickster-caption-plan.mjs';
import { drawTricksterCaption } from './trickster-caption-renderer.mjs';

function drawTransitionOverlay(ctx,transition){if(!transition||!(transition.overlayOpacity>0))return;ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,transition.overlayOpacity));ctx.fillStyle='#07070a';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();}

export function createEventStoryCinematicFrameDrawer({bundle,manifest,renderPlan,fadeFrames=10}){
  const timeline={scenes:renderPlan.map(item=>({id:item.sceneId,type:item.type,startFrame:item.startFrame,endFrame:item.endFrame}))},captions=buildTricksterCaptionPlan(manifest,timeline);
  return async function drawFrame(ctx,frame){
    const model=buildEventStoryFrameModel({bundle,manifest,renderPlan},frame);if(!model)throw new RangeError('frame is outside the Event Story render plan');
    drawEventStoryFrame(ctx,model);const caption=captionAtFrame(captions,frame);if(caption)drawTricksterCaption(ctx,caption);
    const transition=sceneTransitionAtFrame(renderPlan,frame,{fadeFrames});drawTransitionOverlay(ctx,transition);
    return Object.freeze({model,caption,transition});
  };
}
