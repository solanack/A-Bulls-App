const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));

export function sceneTransitionAtFrame(renderPlan=[],frame=0,{fadeFrames=10}={}){
  const index=Math.max(0,Math.trunc(Number(frame)||0));
  const fade=Math.max(1,Math.trunc(Number(fadeFrames)||10));
  const scene=(renderPlan||[]).find(item=>index>=Number(item.startFrame)&&index<=Number(item.endFrame));
  if(!scene)return null;
  const into=index-Number(scene.startFrame),remaining=Number(scene.endFrame)-index;
  const inOpacity=into<fade?1-clamp(into/fade):0;
  const outOpacity=remaining<fade?1-clamp(remaining/fade):0;
  const overlayOpacity=Math.max(inOpacity,outOpacity);
  const phase=inOpacity>=outOpacity&&inOpacity>0?'fade-in':outOpacity>0?'fade-out':'steady';
  return Object.freeze({sceneId:String(scene.sceneId||''),phase,overlayOpacity,fadeFrames:fade,frame:index});
}
