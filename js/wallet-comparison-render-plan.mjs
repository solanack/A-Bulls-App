const finite=value=>Number.isFinite(Number(value))?Number(value):null;

export function buildWalletComparisonRenderPlan(timeline={},runtime=[]){
  const byId=new Map((runtime||[]).map(item=>[String(item.sceneId),item]));
  return Object.freeze((timeline.scenes||[]).map(scene=>{
    const state=byId.get(String(scene.id))||{};
    return Object.freeze({
      sceneId:String(scene.id),type:String(scene.type),mode:String(state.mode||'evidence-close'),
      startFrame:Number(scene.startFrame),endFrame:Number(scene.endFrame),durationFrames:Number(scene.durationFrames),
      chainTimeFrom:finite(state.startTime),chainTimeTo:finite(state.endTime),
      walletA:String(state.walletA||''),walletB:String(state.walletB||''),
      eventIds:Object.freeze([...(state.eventIds||[])]),simulationDisclosure:state.simulationDisclosure||null
    });
  }));
}

export function walletComparisonRenderStateAtFrame(renderPlan=[],frame=0){
  const index=Math.max(0,Math.trunc(Number(frame)||0));
  const scene=(renderPlan||[]).find(item=>index>=item.startFrame&&index<=item.endFrame);if(!scene)return null;
  const local=index-scene.startFrame,progress=scene.durationFrames<=1?1:local/(scene.durationFrames-1);
  let chainTime=null;
  if(scene.chainTimeFrom!=null&&scene.chainTimeTo!=null)chainTime=scene.chainTimeFrom+(scene.chainTimeTo-scene.chainTimeFrom)*progress;
  return Object.freeze({...scene,frame:index,localFrame:local,progress,chainTime});
}
