import { renderStateAtFrame } from './event-story-render-plan.mjs';

const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();

function visibleThrough(items=[],chainTime){if(chainTime==null)return Object.freeze([]);return Object.freeze(items.filter(item=>{const time=finite(item?.timestamp);return time!=null&&time<=chainTime;}));}
function claimMap(manifest={}){return new Map((manifest.claims||[]).map(claim=>[String(claim.id),claim]));}

export function buildEventStoryFrameModel({bundle={},manifest={},renderPlan=[]}={},frame=0){
  const state=renderStateAtFrame(renderPlan,frame);if(!state)return null;
  const scene=(manifest.scenes||[]).find(item=>String(item.id)===state.sceneId)||null;
  const claimsById=claimMap(manifest);const claims=Object.freeze((scene?.claimIds||[]).map(id=>claimsById.get(String(id))).filter(Boolean));
  const events=Array.isArray(bundle.replayEvents)?bundle.replayEvents:[],candles=Array.isArray(bundle.candles)?bundle.candles:[];
  const runtime=(renderPlan||[]).find(item=>item.sceneId===state.sceneId)||{};
  let visibleEvents=Object.freeze([]),visibleCandles=Object.freeze([]);
  if(state.mode==='focus-event')visibleEvents=Object.freeze(events.filter(event=>String(event?.id||event?.signature||'')===String(state.focusId||'')));
  else if(state.mode==='market-window')visibleEvents=visibleThrough(events,state.chainTime);
  if(state.mode==='market-window'||state.mode==='price-aftermath')visibleCandles=visibleThrough(candles,state.chainTime);
  const routes=bundle?.marketContext?.routes||{};
  return Object.freeze({
    state,
    scene:Object.freeze({id:state.sceneId,type:state.type,mode:state.mode,progress:state.progress}),
    claims,
    visibleEvents,
    visibleCandles,
    focusId:state.focusId||null,
    quoteMint:state.quoteMint||null,
    bucketSeconds:state.bucketSeconds??null,
    routeContext:Object.freeze({routeRows:Math.max(0,Math.trunc(Number(runtime.routeRows)||0)),venues:Object.freeze([...(routes.venues||[])]),pools:Object.freeze([...(routes.pools||[])])}),
    evidence:Object.freeze({count:Math.max(0,Math.trunc(Number(runtime.evidenceCount)||0)),coverage:text(manifest?.coverage?.statement),verifiedPercent:finite(manifest?.coverage?.verifiedPercent),sources:Object.freeze([...new Set((manifest.evidence||[]).map(item=>text(item.source)).filter(Boolean))])})
  });
}
