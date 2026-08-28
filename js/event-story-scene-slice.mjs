const finite=value=>Number.isFinite(Number(value))?Number(value):null;

function inWindow(timestamp,from,to){const time=finite(timestamp);if(time==null)return false;return(from==null||time>=from)&&(to==null||time<=to);}

export function buildEventStorySceneSlice(bundle={},runtime={}){
  const allEvents=Array.isArray(bundle.replayEvents)?bundle.replayEvents:[];
  const allCandles=Array.isArray(bundle.candles)?bundle.candles:[];
  const ids=new Set((runtime.eventIds||[]).map(String));
  let events=[];
  if(ids.size)events=allEvents.filter(event=>ids.has(String(event?.id||event?.signature||'')));
  else if(runtime.mode==='market-window')events=allEvents.filter(event=>inWindow(event?.timestamp,runtime.from,runtime.to));
  else if(runtime.mode==='focus-event'&&runtime.focusId)events=allEvents.filter(event=>String(event?.id||event?.signature||'')===String(runtime.focusId));
  const candles=(runtime.mode==='market-window'||runtime.mode==='price-aftermath')?allCandles.filter(candle=>inWindow(candle?.timestamp,runtime.from,runtime.to)):[];
  return Object.freeze({
    mode:String(runtime.mode||'evidence-close'),
    startTime:finite(runtime.from),
    endTime:finite(runtime.to),
    focusId:runtime.focusId?String(runtime.focusId):null,
    events:Object.freeze(events.map(event=>Object.freeze({...event}))),
    candles:Object.freeze(candles.map(candle=>Object.freeze({...candle}))),
    routeRows:Math.max(0,Math.trunc(Number(runtime.routeRows)||0)),
    evidenceCount:Math.max(0,Math.trunc(Number(runtime.evidenceCount)||0)),
    quoteMint:runtime.quoteMint?String(runtime.quoteMint):null,
    bucketSeconds:finite(runtime.bucketSeconds)
  });
}
