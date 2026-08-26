const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();

function replayBounds(bundle={}){
  const start=finite(bundle?.replay?.startTime),end=finite(bundle?.replay?.endTime);
  if(start!=null&&end!=null&&end>=start)return{from:start,to:end};
  const times=(bundle.replayEvents||[]).map(event=>finite(event?.timestamp)).filter(value=>value!=null).sort((a,b)=>a-b);
  if(times.length)return{from:times[0],to:times.at(-1)};
  return{from:null,to:null};
}
function beatByScene(bundle={},scene={}){const id=String(scene.id||'').replace(/^sequence-/,'');return(bundle?.marketReplay?.reconstruction?.beats||[]).find(beat=>String(beat.id)===id)||null;}
function idsFromBeat(beat){return Object.freeze([...(beat?.evidenceIds||[])].map(String).filter(Boolean));}

export function buildTokenSequenceSceneRuntime(bundle={},manifest={}){
  if(manifest?.storyType!=='token-sequence')return Object.freeze([]);
  const bounds=replayBounds(bundle),allEventIds=Object.freeze((bundle.replayEvents||[]).map(event=>text(event?.id||event?.signature)).filter(Boolean));
  const quoteMint=bundle?.priceSelection?.mode==='indexed-quote-pair'?text(bundle.priceSelection.quoteMint):null;
  const bucketSeconds=quoteMint?finite(bundle.priceSelection?.bucketSeconds):null;
  return Object.freeze((manifest.scenes||[]).map(scene=>{
    const type=text(scene.type),beat=beatByScene(bundle,scene),base={sceneId:text(scene.id),type,evidenceCount:(manifest.evidence||[]).length,quoteMint:quoteMint||null,bucketSeconds};
    if(type==='market-hook'||type==='market-sequence')return Object.freeze({...base,mode:'market-window',from:bounds.from,to:bounds.to,eventIds:type==='market-hook'?Object.freeze(allEventIds.slice(0,Math.min(40,allEventIds.length))):allEventIds,candleCount:(bundle.candles||[]).length});
    if(type==='sequence-opening'){const eventIds=idsFromBeat(beat);return Object.freeze({...base,mode:'focus-event',from:bounds.from,to:bounds.to,focusId:eventIds[0]||null,eventIds,candleCount:0});}
    if(type==='selected-price-movement')return Object.freeze({...base,mode:quoteMint?'price-aftermath':'evidence-close',from:bounds.from,to:bounds.to,eventIds:Object.freeze([]),candleCount:quoteMint?(bundle.candles||[]).length:0});
    if(['participation-expansion','largest-observed-trade','program-context-change','direction-mix'].includes(type)){const eventIds=idsFromBeat(beat);return Object.freeze({...base,mode:'market-window',from:bounds.from,to:beat?.timestamp??bounds.to,eventIds:eventIds.length?eventIds:allEventIds,candleCount:quoteMint?(bundle.candles||[]).length:0});}
    return Object.freeze({...base,mode:'evidence-close',from:null,to:null,eventIds:Object.freeze([]),candleCount:0});
  }));
}

export const TokenSequenceRuntimeDisclosure='Token-sequence scenes visualize only indexed events in the bounded replay window. Price motion is present only when an explicit quote market was selected.';
