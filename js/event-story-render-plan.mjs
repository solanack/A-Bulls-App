const finite=value=>Number.isFinite(Number(value))?Number(value):null;

export function buildEventStoryRenderPlan(timeline={},sceneRuntime=[]){
  const runtimeById=new Map((sceneRuntime||[]).map(item=>[String(item.sceneId||''),item]));
  return Object.freeze((timeline?.scenes||[]).map((scene,index)=>{
    const runtime=runtimeById.get(String(scene.id||''))||null;
    const from=finite(runtime?.from),to=finite(runtime?.to);
    return Object.freeze({
      sceneId:String(scene.id||`scene-${index+1}`),
      type:String(scene.type||runtime?.type||'scene'),
      startFrame:Math.max(0,Math.trunc(Number(scene.startFrame)||0)),
      endFrame:Math.max(0,Math.trunc(Number(scene.endFrame)||0)),
      durationFrames:Math.max(1,Math.trunc(Number(scene.durationFrames)||1)),
      mode:String(runtime?.mode||'template'),
      chainTimeFrom:from,
      chainTimeTo:to,
      focusId:runtime?.focusId?String(runtime.focusId):null,
      eventIds:Object.freeze([...(runtime?.eventIds||[])].map(String)),
      quoteMint:runtime?.quoteMint?String(runtime.quoteMint):null,
      bucketSeconds:finite(runtime?.bucketSeconds),
      routeRows:Math.max(0,Math.trunc(Number(runtime?.routeRows)||0)),
      evidenceCount:Math.max(0,Math.trunc(Number(runtime?.evidenceCount)||0)),
      candleCount:Math.max(0,Math.trunc(Number(runtime?.candleCount)||0))
    });
  }));
}

export function renderStateAtFrame(renderPlan=[],frame=0){
  const index=Math.max(0,Math.trunc(Number(frame)||0));
  const scene=(renderPlan||[]).find(item=>index>=item.startFrame&&index<=item.endFrame)||null;
  if(!scene)return null;
  const localFrame=index-scene.startFrame;
  const progress=scene.durationFrames<=1?1:localFrame/(scene.durationFrames-1);
  const hasTime=scene.chainTimeFrom!=null&&scene.chainTimeTo!=null;
  const chainTime=hasTime?scene.chainTimeFrom+(scene.chainTimeTo-scene.chainTimeFrom)*progress:null;
  return Object.freeze({sceneId:scene.sceneId,type:scene.type,mode:scene.mode,frame:index,localFrame,progress,chainTime,focusId:scene.focusId,quoteMint:scene.quoteMint,bucketSeconds:scene.bucketSeconds});
}
