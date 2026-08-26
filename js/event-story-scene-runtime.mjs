import { resolveEventStoryFocus } from './event-story-focus.mjs';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const finite=value=>Number.isFinite(Number(value))?Number(value):null;

function replayBounds(bundle={}){
  const start=finite(bundle?.replay?.startTime)??finite(bundle?.marketContext?.window?.from)*1000;
  const end=finite(bundle?.replay?.endTime)??finite(bundle?.marketContext?.window?.to)*1000;
  return{start:Number.isFinite(start)?start:0,end:Number.isFinite(end)?end:Math.max(0,Number.isFinite(start)?start:0)};
}

function boundedWindow(center,before,after,bounds){
  if(!Number.isFinite(center))return{from:bounds.start,to:bounds.end};
  return{from:clamp(center-before,bounds.start,bounds.end),to:clamp(center+after,bounds.start,bounds.end)};
}

export function buildEventStorySceneRuntime(bundle={},manifest={}){
  if(bundle?.storyType!=='transaction-replay')return Object.freeze([]);
  const focus=resolveEventStoryFocus(bundle),bounds=replayBounds(bundle),events=Array.isArray(bundle.replayEvents)?bundle.replayEvents:[],pair=bundle?.marketContext?.selectedPricePair||null;
  const eventIds=Object.freeze(events.map(event=>String(event?.id||event?.signature||'')).filter(Boolean));
  const aftermathEnd=pair?.after?.length?Math.max(...pair.after.map(item=>finite(item.sampleTime)).filter(Number.isFinite))*1000:null;
  return Object.freeze((manifest?.scenes||[]).map(scene=>{
    if(scene.type==='event-hook'){
      const window=boundedWindow(focus.timestamp,60_000,60_000,bounds);
      return Object.freeze({sceneId:scene.id,type:scene.type,mode:'focus-event',from:window.from,to:window.to,focusId:focus.id||null,eventIds:Object.freeze(focus.id?[focus.id]:[]),quoteMint:null,bucketSeconds:null});
    }
    if(scene.type==='market-window-replay')return Object.freeze({sceneId:scene.id,type:scene.type,mode:'market-window',from:bounds.start,to:bounds.end,focusId:focus.id||null,eventIds,quoteMint:bundle?.priceSelection?.quoteMint||null,bucketSeconds:bundle?.priceSelection?.bucketSeconds||null});
    if(scene.type==='execution-context'){
      const window=boundedWindow(focus.timestamp,120_000,120_000,bounds);
      return Object.freeze({sceneId:scene.id,type:scene.type,mode:'route-context',from:window.from,to:window.to,focusId:focus.id||null,eventIds:Object.freeze([]),quoteMint:null,bucketSeconds:null,routeRows:Number(bundle?.marketContext?.routes?.routeRows||0)});
    }
    if(scene.type==='market-aftermath')return Object.freeze({sceneId:scene.id,type:scene.type,mode:'price-aftermath',from:Number.isFinite(focus.timestamp)?focus.timestamp:bounds.start,to:clamp(aftermathEnd??bounds.end,bounds.start,bounds.end),focusId:focus.id||null,eventIds:Object.freeze([]),quoteMint:bundle?.priceSelection?.quoteMint||null,bucketSeconds:bundle?.priceSelection?.bucketSeconds||null,candleCount:Array.isArray(bundle.candles)?bundle.candles.length:0});
    return Object.freeze({sceneId:scene.id,type:scene.type,mode:'evidence-close',from:null,to:null,focusId:focus.id||null,eventIds:Object.freeze([]),quoteMint:null,bucketSeconds:null,evidenceCount:Array.isArray(bundle.evidence)?bundle.evidence.length:0});
  }));
}
