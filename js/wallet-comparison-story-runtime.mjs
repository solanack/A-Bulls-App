const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();

function replayEvents(bundle={}){return Array.isArray(bundle?.replayEvents)?bundle.replayEvents:Array.isArray(bundle?.replay?.events)?bundle.replay.events:[];}
function replayRange(bundle={},events=[]){const start=finite(bundle?.replay?.startTime)??(events.length?Math.min(...events.map(event=>Number(event.timestamp)||0)):0);const end=finite(bundle?.replay?.endTime)??(events.length?Math.max(...events.map(event=>Number(event.timestamp)||0)):start);return{start,end:Math.max(start,end)};}

export function walletComparisonScenePlan(bundle={}){
  if(bundle?.storyType!=='wallet-comparison')return Object.freeze([]);
  const scenes=[
    Object.freeze({id:'comparison-hook',type:'comparison-hook',durationFrames:75,claimIds:Object.freeze([])}),
    Object.freeze({id:'comparison-replay',type:'synchronized-trade-replay',durationFrames:240,claimIds:Object.freeze((bundle.claims||[]).filter(claim=>claim.kind==='observed').map(claim=>claim.id))}),
    Object.freeze({id:'comparison-differences',type:'calculated-differences',durationFrames:150,claimIds:Object.freeze((bundle.claims||[]).filter(claim=>claim.kind==='calculated'||claim.kind==='estimated').map(claim=>claim.id))})
  ];
  if(Array.isArray(bundle?.whatIf?.events)&&bundle.whatIf.events.length){
    scenes.push(Object.freeze({id:'comparison-what-if',type:'what-if-replay',durationFrames:150,claimIds:Object.freeze((bundle.claims||[]).filter(claim=>claim.kind==='inferred').map(claim=>claim.id))}));
  }
  return Object.freeze(scenes);
}

export function buildWalletComparisonSceneRuntime(bundle={},manifest={}){
  if(bundle?.storyType!=='wallet-comparison')return Object.freeze([]);
  const events=replayEvents(bundle),range=replayRange(bundle,events),comparison=bundle.comparison||{};
  const walletA=text(comparison?.walletA?.wallet),walletB=text(comparison?.walletB?.wallet);
  return Object.freeze((manifest.scenes||[]).map(scene=>{
    const base={sceneId:scene.id,type:scene.type,walletA,walletB};
    if(scene.type==='comparison-hook')return Object.freeze({...base,mode:'comparison-summary',startTime:null,endTime:null});
    if(scene.type==='synchronized-trade-replay')return Object.freeze({...base,mode:'comparison-replay',startTime:range.start,endTime:range.end,eventIds:Object.freeze(events.map(event=>String(event.id||event.signature||'')).filter(Boolean))});
    if(scene.type==='calculated-differences')return Object.freeze({...base,mode:'comparison-metrics',startTime:null,endTime:null});
    if(scene.type==='what-if-replay'&&Array.isArray(bundle?.whatIf?.events)&&bundle.whatIf.events.length)return Object.freeze({...base,mode:'comparison-simulation',startTime:range.start,endTime:range.end,eventIds:Object.freeze(bundle.whatIf.events.map(event=>String(event.id||event.signature||'')).filter(Boolean)),simulationDisclosure:text(bundle.whatIf.disclosure)});
    return Object.freeze({...base,mode:'evidence-close',startTime:null,endTime:null});
  }));
}
