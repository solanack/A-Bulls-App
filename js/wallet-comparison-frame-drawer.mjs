import { buildWalletComparisonFrameModel } from './wallet-comparison-frame-model.mjs';
import { drawWalletComparisonFrame } from './wallet-comparison-frame-renderer.mjs';
import { sceneTransitionAtFrame } from './event-story-scene-transition.mjs';

function overlay(ctx,transition){if(!transition||!(transition.overlayOpacity>0))return;ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,transition.overlayOpacity));ctx.fillStyle='#07070a';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();}

export function createWalletComparisonCinematicFrameDrawer({bundle,manifest,renderPlan,fadeFrames=10}){
  return async function drawFrame(ctx,frame){
    const model=buildWalletComparisonFrameModel({bundle,manifest,renderPlan},frame);
    if(!model)throw new RangeError('frame is outside the wallet comparison render plan');
    drawWalletComparisonFrame(ctx,model);
    const transition=sceneTransitionAtFrame(renderPlan,frame,{fadeFrames});overlay(ctx,transition);
    return Object.freeze({model,transition});
  };
}
