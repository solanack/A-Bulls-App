const FPS_ALLOWED = new Set([24,30]);

export function buildStoryTimeline(manifest,{fps=30,maxSeconds=90}={}) {
  if(!manifest?.scenes?.length) throw new TypeError('validated story manifest is required');
  if(!FPS_ALLOWED.has(fps)) throw new RangeError('fps must be 24 or 30');
  const maxFrames=Math.max(fps,Math.trunc(Number(maxSeconds)||90)*fps);
  let cursor=0;
  const scenes=[];
  for(const scene of manifest.scenes) {
    if(cursor>=maxFrames) break;
    const requested=Math.max(1,Math.trunc(Number(scene.durationFrames)||1));
    const duration=Math.min(requested,maxFrames-cursor);
    const claims=scene.claimIds.map((id)=>manifest.claims.find((claim)=>claim.id===id)).filter(Boolean);
    scenes.push(Object.freeze({
      id:scene.id,
      type:scene.type,
      startFrame:cursor,
      endFrame:cursor+duration-1,
      durationFrames:duration,
      claims:Object.freeze(claims)
    }));
    cursor+=duration;
  }
  return Object.freeze({
    storyId:manifest.id,
    fps,
    totalFrames:cursor,
    durationSeconds:cursor/fps,
    capped:manifest.scenes.reduce((sum,scene)=>sum+scene.durationFrames,0)>cursor,
    scenes:Object.freeze(scenes)
  });
}

export function frameAt(timeline,frame) {
  const index=Math.max(0,Math.min(timeline.totalFrames-1,Math.trunc(Number(frame)||0)));
  const scene=timeline.scenes.find((item)=>index>=item.startFrame&&index<=item.endFrame);
  if(!scene) return null;
  const sceneFrame=index-scene.startFrame;
  return Object.freeze({
    frame:index,
    timeSeconds:index/timeline.fps,
    scene,
    sceneFrame,
    sceneProgress:scene.durationFrames<=1?1:sceneFrame/(scene.durationFrames-1)
  });
}
