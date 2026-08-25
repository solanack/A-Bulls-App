const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

function eventId(event={}){return text(event.id||event.signature||event.evidenceId);}
function eventSide(event={}){const side=text(event.side).toLowerCase();return side==='buy'||side==='sell'?side:null;}
function sceneSecond(frame,fps){return Math.max(0,Number(frame)||0)/Math.max(1,Number(fps)||30);}
function eventFrame(scene,event){
  const start=Number(scene.startFrame)||0,duration=Math.max(1,Number(scene.durationFrames)||1),timestamp=finite(event?.timestamp),from=finite(scene.chainTimeFrom),to=finite(scene.chainTimeTo);
  if(timestamp==null)return null;
  if(from!=null&&to!=null&&to>from){const progress=clamp01((timestamp-from)/(to-from));return start+Math.round(progress*Math.max(0,duration-1));}
  if(from!=null&&to!=null&&timestamp===from)return start+Math.min(Math.max(1,Math.round(duration*.22)),Math.max(0,duration-1));
  return null;
}
function sceneEvents(scene,replayEvents=[],whatIf=null){
  if(scene.mode==='comparison-simulation')return Array.isArray(whatIf?.events)?whatIf.events:[];
  if(scene.mode==='focus-event'){
    const ids=new Set([scene.focusId,...(scene.eventIds||[])].filter(Boolean).map(String));
    return replayEvents.filter(event=>ids.has(eventId(event)));
  }
  if(scene.mode==='market-window'||scene.mode==='price-aftermath'||scene.mode==='comparison-replay'){
    const from=finite(scene.chainTimeFrom),to=finite(scene.chainTimeTo);
    return replayEvents.filter(event=>{const timestamp=finite(event?.timestamp);return timestamp!=null&&(from==null||timestamp>=from)&&(to==null||timestamp<=to);});
  }
  return [];
}

export function buildTricksterAudioCuePlan({timeline={},renderPlan=[],replayEvents=[],whatIf=null}={}){
  const fps=Math.max(1,Number(timeline?.fps)||30),totalFrames=Math.max(0,Number(timeline?.totalFrames)||0),cues=[];
  for(const scene of renderPlan||[]){
    const startFrame=Math.max(0,Number(scene.startFrame)||0);
    cues.push(Object.freeze({kind:scene.mode==='comparison-simulation'?'simulation-transition':'scene-transition',sceneId:String(scene.sceneId||''),frame:startFrame,time:sceneSecond(startFrame,fps)}));
    for(const event of sceneEvents(scene,replayEvents,whatIf)){
      const side=eventSide(event);if(!side)continue;
      const frame=eventFrame(scene,event);if(frame==null)continue;
      const simulated=scene.mode==='comparison-simulation'||event?.hypothetical===true||text(event?.verification)==='simulation';
      cues.push(Object.freeze({kind:simulated?'simulation-impact':`${side}-impact`,side,simulated,eventId:eventId(event),sceneId:String(scene.sceneId||''),frame,time:sceneSecond(frame,fps)}));
    }
  }
  cues.sort((a,b)=>a.frame-b.frame||a.kind.localeCompare(b.kind)||a.eventId?.localeCompare?.(b.eventId||'')||0);
  return Object.freeze({fps,totalFrames,durationSeconds:totalFrames/fps,cues:Object.freeze(cues)});
}

export function cueSummary(plan={}){
  const counts={sceneTransitions:0,buyImpacts:0,sellImpacts:0,simulationImpacts:0,simulationTransitions:0};
  for(const cue of plan.cues||[]){if(cue.kind==='scene-transition')counts.sceneTransitions+=1;else if(cue.kind==='buy-impact')counts.buyImpacts+=1;else if(cue.kind==='sell-impact')counts.sellImpacts+=1;else if(cue.kind==='simulation-impact')counts.simulationImpacts+=1;else if(cue.kind==='simulation-transition')counts.simulationTransitions+=1;}
  return Object.freeze(counts);
}
