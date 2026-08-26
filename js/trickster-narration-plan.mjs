const text=value=>String(value==null?'':value).trim();
const SPOKEN_LABELS=Object.freeze({observed:'Observed on chain.',calculated:'Calculated from indexed evidence.',estimated:'Estimate.',inferred:'Inference or simulation.'});
function words(value){return text(value).split(/\s+/).filter(Boolean).length;}

export function buildTricksterNarrationPlan(manifest={},timeline={}, {wordsPerSecond=2.25}={}){
  const claims=new Map((manifest.claims||[]).map(claim=>[String(claim.id),claim]));
  const manifestScenes=new Map((manifest.scenes||[]).map(scene=>[String(scene.id),scene]));
  const fps=Math.max(1,Number(timeline?.fps)||30);
  const scenes=(timeline.scenes||[]).map(scene=>{
    const source=manifestScenes.get(String(scene.id)),sceneClaims=(source?.claimIds||[]).map(id=>claims.get(String(id))).filter(Boolean);
    const durationSeconds=Math.max(0,(Number(scene.durationFrames)||0)/fps),wordBudget=Math.max(0,Math.floor(durationSeconds*Math.max(.5,Number(wordsPerSecond)||2.25)));
    const segments=[];let usedWords=0;
    for(const claim of sceneClaims){
      const statement=text(claim.statement);if(!statement)continue;
      const label=scene.type==='what-if-replay'?'Simulation.':SPOKEN_LABELS[claim.kind]||'Evidence-backed statement.';
      const line=`${label} ${statement}`.trim(),lineWords=words(line);
      if(segments.length&&usedWords+lineWords>wordBudget)break;
      segments.push(Object.freeze({claimId:String(claim.id),kind:String(claim.kind||''),text:line,disclosure:text(claim.disclosure),words:lineWords}));usedWords+=lineWords;
    }
    return Object.freeze({sceneId:String(scene.id),sceneType:String(scene.type||''),startFrame:Number(scene.startFrame)||0,endFrame:Number(scene.endFrame)||0,durationSeconds,wordBudget,usedWords,overflow:usedWords>wordBudget,segments:Object.freeze(segments),silent:segments.length===0});
  });
  return Object.freeze({fps,wordsPerSecond:Number(wordsPerSecond)||2.25,scenes:Object.freeze(scenes),disclosure:'Narration is assembled only from validated manifest claims. Claim-free scenes remain silent rather than inventing narration.'});
}

export function narrationAtFrame(plan={},frame=0){const index=Math.max(0,Math.trunc(Number(frame)||0));return (plan.scenes||[]).find(scene=>index>=scene.startFrame&&index<=scene.endFrame)||null;}
