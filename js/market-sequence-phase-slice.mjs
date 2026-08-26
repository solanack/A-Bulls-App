const finite=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const freezeList=list=>Object.freeze((list||[]).slice());

export function sliceMarketReplayToPhase(bundle={},phase={}){
  const from=finite(phase?.from),to=finite(phase?.to);
  if(from==null||to==null||to<from)throw new TypeError('valid phase window is required');
  const ids=new Set((phase.evidenceIds||[]).map(String).filter(Boolean));
  const events=(bundle.events||[]).filter(event=>{
    const timestamp=finite(event?.timestamp),id=String(event?.signature||event?.id||'');
    return timestamp!=null&&timestamp>=from&&timestamp<=to&&(!ids.size||ids.has(id));
  });
  const candles=(bundle.candles||[]).filter(item=>{const timestamp=finite(item?.timestamp);return timestamp!=null&&timestamp>=from&&timestamp<=to;});
  const wallets=new Set(events.map(event=>String(event?.wallet||'')).filter(Boolean));
  const buyCount=events.filter(event=>event.side==='buy').length,sellCount=events.filter(event=>event.side==='sell').length;
  return Object.freeze({
    ...bundle,
    window:Object.freeze({...bundle.window,from:Math.trunc(from/1000),to:Math.trunc(to/1000),startTime:from,endTime:to}),
    events:freezeList(events),
    candles:freezeList(candles),
    activity:Object.freeze({...bundle.activity,totalEvents:events.length,returnedEvents:events.length,walletCount:wallets.size,buyCount,sellCount,truncated:false}),
    selectedPhase:Object.freeze({id:String(phase.id||''),label:String(phase.label||''),from,to,eventCount:events.length,walletCount:wallets.size,buyCount,sellCount,evidenceIds:freezeList([...ids])})
  });
}

export const MarketPhaseSliceDisclosure='Phase slices use the exact deterministic phase boundary and supporting event IDs from the parent reconstructed sequence. They do not infer market regime, strategy, causation, or intent.';
