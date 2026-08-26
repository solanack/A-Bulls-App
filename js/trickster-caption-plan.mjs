const text=value=>String(value==null?'':value).trim();
const LABELS=Object.freeze({observed:'OBSERVED ON CHAIN',calculated:'CALCULATED FROM EVIDENCE',estimated:'ESTIMATE',inferred:'INFERENCE / SIMULATION'});

export function buildTricksterCaptionPlan(manifest={},timeline={}){
  const claims=new Map((manifest.claims||[]).map(claim=>[String(claim.id),claim]));
  const manifestScenes=new Map((manifest.scenes||[]).map(scene=>[String(scene.id),scene]));
  return Object.freeze((timeline.scenes||[]).map(scene=>{
    const source=manifestScenes.get(String(scene.id));
    const sceneClaims=(source?.claimIds||[]).map(id=>claims.get(String(id))).filter(Boolean);
    const primary=sceneClaims[0]||null;
    const isSimulation=scene.type==='what-if-replay';
    return Object.freeze({
      sceneId:String(scene.id),startFrame:Number(scene.startFrame),endFrame:Number(scene.endFrame),
      label:isSimulation?'SIMULATION':primary?LABELS[primary.kind]||String(primary.kind||'').toUpperCase():'EVIDENCE SCENE',
      text:primary?text(primary.statement):text(scene.type).replaceAll('-',' '),
      disclosure:isSimulation?text(primary?.disclosure||'Hypothetical scene; not observed history.'):text(primary?.disclosure),
      claimId:primary?.id||null,kind:primary?.kind||null
    });
  }));
}

export function captionAtFrame(captionPlan=[],frame=0){const index=Math.max(0,Math.trunc(Number(frame)||0));return (captionPlan||[]).find(item=>index>=item.startFrame&&index<=item.endFrame)||null;}
