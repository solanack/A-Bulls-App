import { buildEventStoryFrameModel } from './event-story-frame-model.mjs';
import { drawEventStoryFrame } from './event-story-frame-renderer.mjs';
import { sceneTransitionAtFrame } from './event-story-scene-transition.mjs';

function drawTransitionOverlay(ctx,transition){
  if(!transition||!(transition.overlayOpacity>0))return;
  ctx.save();
  ctx.globalAlpha=Math.max(0,Math.min(1,transition.overlayOpacity));
  ctx.fillStyle='#07070a';
  ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.restore();
}

export function createEventStoryCinematicFrameDrawer({bundle,manifest,renderPlan,fadeFrames=10}){
  return async function drawFrame(ctx,frame){
    const model=buildEventStoryFrameModel({bundle,manifest,renderPlan},frame);
    if(!model)throw new RangeError('frame is outside the Event Story render plan');
    drawEventStoryFrame(ctx,model);
    const transition=sceneTransitionAtFrame(renderPlan,frame,{fadeFrames});
    drawTransitionOverlay(ctx,transition);
    return Object.freeze({model,transition});
  };
}
