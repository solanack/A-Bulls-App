const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();

function replayBounds(bundle={}){
  const start=finite(bundle?.replay?.startTime),end=finite(bundle?.replay?.endTime);
  if(start!=null&&end!=null&&end>=start)return{from:start,to:end};
  const times=(bundle.replayEvents||[]).map(event=>finite(event?.timestamp)).filter(value=>value!=null).sort((a,b)=>a-b);
  if(times.length)return{from:times[0],to:times.at(-1)};
  return{from:null,to:null};
}

export function buildTokenSequenceSceneRuntime(bundle={},manifest={}){
  if(manifest?.storyType!=='token-sequence')return Object.freeze([]);
  const bounds=replayBounds(bundle),eventIds=Object.freeze((bundle.replayEvents||[]).map(event=>text(event?.id||event?.signature)).filter(Boolean));
  const quoteMint=bundle?.priceSelection?.mode==='indexed-quote-pair'?text(bundle.priceSelection.quoteMint):null;
  const bucketSeconds=quoteMint?finite(bundle.priceSelection?.bucketSeconds):null;
  return Object.freeze((manifest.scenes||[]).map(scene=>{
    const type=text(scene.type),base={sceneId:text(scene.id),type,evidenceCount:(manifest.evidence||[]).length,quoteMint:quoteMint||null,bucketSeconds};
    if(type==='market-hook')return Object.freeze({...base,mode:'market-window',from:bounds.from,to:bounds.to,eventIds:Object.freeze(eventIds.slice(0,Math.min(40,eventIds.length))),candleCount:(bundle.candles||[]).length});
    if(type==='market-sequence')return Object.freeze({...base,mode:'market-window',from:bounds.from,to:bounds.to,eventIds,candleCount:(bundle.candles||[]).length});
    return Object.freeze({...base,mode:'evidence-close',from:null,to:null,eventIds:Object.freeze([]),candleCount:0});
  }));
}

export const TokenSequenceRuntimeDisclosure='Token-sequence scenes visualize only indexed events in the bounded replay window. Price motion is present only when an explicit quote market was selected.';
