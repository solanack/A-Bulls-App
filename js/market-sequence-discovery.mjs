const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function median(values=[]){const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!sorted.length)return 0;const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;}
function percentile(values=[],p=.9){const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!sorted.length)return null;const index=Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1));return sorted[index];}
function eventId(event={}){return event&&typeof event==='object'?(text(event.signature||event.id)||null):null;}
function windowBucketSeconds(windowSeconds){if(windowSeconds<=3600)return 300;if(windowSeconds<=21600)return 900;if(windowSeconds<=86400)return 3600;return 21600;}
function pctChange(a,b){const from=finite(a),to=finite(b);return from!=null&&to!=null&&from!==0?((to-from)/Math.abs(from))*100:null;}

function bucketEvents(events=[],fromMs,toMs,bucketMs){const buckets=[];for(let start=fromMs;start<toMs;start+=bucketMs)buckets.push({from:start,to:Math.min(toMs,start+bucketMs),events:[]});for(const event of events){const t=finite(event.timestamp);if(t==null||t<fromMs||t>toMs)continue;const index=Math.min(buckets.length-1,Math.max(0,Math.floor((t-fromMs)/bucketMs)));if(buckets[index])buckets[index].events.push(event);}return buckets;}
function summarizeBucket(bucket){const wallets=new Set(),numericDeltas=[];let buys=0,sells=0;for(const event of bucket.events){if(event.wallet)wallets.add(String(event.wallet));if(event.side==='buy')buys+=1;else if(event.side==='sell')sells+=1;const delta=finite(event.tokenDelta);if(delta!=null)numericDeltas.push(Math.abs(delta));}const largest=numericDeltas.length?Math.max(...numericDeltas):null;const focus=bucket.events.slice().sort((a,b)=>(Math.abs(finite(b.tokenDelta)||0)-Math.abs(finite(a.tokenDelta)||0))||((finite(a.timestamp)||0)-(finite(b.timestamp)||0)))[0]||null;return{...bucket,eventCount:bucket.events.length,walletCount:wallets.size,buyCount:buys,sellCount:sells,largestAbsTokenDelta:largest,focusEventId:eventId(focus),evidenceIds:bucket.events.map(eventId).filter(Boolean)};}
function priceMovement(candles=[],from,to){const rows=candles.filter(item=>{const t=finite(item.timestamp),close=finite(item.close);return t!=null&&close!=null&&t>=from&&t<=to;}).sort((a,b)=>a.timestamp-b.timestamp);if(rows.length<2)return null;const changePercent=pctChange(rows[0].close,rows.at(-1).close);if(changePercent==null)return null;return{changePercent,firstClose:rows[0].close,lastClose:rows.at(-1).close,candleCount:rows.length};}

export function discoverMarketSequences(bundle={}, {limit=6}={}){
  const events=Array.isArray(bundle.events)?bundle.events:[];
  const fromMs=finite(bundle?.window?.startTime)??(finite(bundle?.window?.from)!=null?Number(bundle.window.from)*1000:null);
  const toMs=finite(bundle?.window?.endTime)??(finite(bundle?.window?.to)!=null?Number(bundle.window.to)*1000:null);
  if(fromMs==null||toMs==null||toMs<=fromMs||!events.length)return Object.freeze([]);
  const bucketSeconds=windowBucketSeconds((toMs-fromMs)/1000),bucketMs=bucketSeconds*1000;
  const summaries=bucketEvents(events,fromMs,toMs,bucketMs).map(summarizeBucket);
  const nonEmpty=summaries.filter(item=>item.eventCount>0);if(!nonEmpty.length)return Object.freeze([]);
  const eventMedian=Math.max(1,median(nonEmpty.map(item=>item.eventCount))),walletMedian=Math.max(1,median(nonEmpty.map(item=>item.walletCount)));
  const numericDeltas=events.map(event=>finite(event.tokenDelta)).filter(value=>value!=null).map(Math.abs).filter(value=>value>0),largeThreshold=percentile(numericDeltas,.9);
  const explicitPrice=Boolean(bundle?.subject?.quoteMint)&&Array.isArray(bundle.candles)&&bundle.candles.length>1;
  const candidates=[];
  for(const item of nonEmpty){
    const peers=nonEmpty.filter(candidate=>candidate!==item),activityBaseline=peers.length?Math.max(1,median(peers.map(candidate=>candidate.eventCount))):eventMedian,walletBaseline=peers.length?Math.max(1,median(peers.map(candidate=>candidate.walletCount))):walletMedian;
    const activityRatio=item.eventCount/activityBaseline,walletRatio=item.walletCount/walletBaseline;
    if(item.eventCount>=3&&activityRatio>=2)candidates.push({kind:'activity-surge',label:'ACTIVITY SURGE',score:activityRatio,statement:`${item.eventCount} indexed events occurred in this ${Math.round(bucketSeconds/60)} minute segment, ${activityRatio.toFixed(1)}× the median non-empty segment in this loaded window.`,...item});
    if(item.walletCount>=3&&walletRatio>=1.5)candidates.push({kind:'wallet-concentration',label:'WALLET CONCENTRATION',score:walletRatio,statement:`${item.walletCount} observed wallets appear in this ${Math.round(bucketSeconds/60)} minute segment, ${walletRatio.toFixed(1)}× the median non-empty segment in this loaded window.`,...item});
    if(largeThreshold!=null&&item.largestAbsTokenDelta!=null&&item.largestAbsTokenDelta>=largeThreshold)candidates.push({kind:'large-observed-trade',label:'LARGE OBSERVED TOKEN DELTA',score:item.largestAbsTokenDelta/Math.max(largeThreshold,Number.EPSILON),statement:`This segment contains an observed absolute token delta at or above the 90th percentile of numeric token deltas in this loaded window.`,...item});
    if(explicitPrice){const movement=priceMovement(bundle.candles,item.from,item.to);if(movement&&Math.abs(movement.changePercent)>=1)candidates.push({kind:'indexed-price-move',label:'INDEXED PRICE MOVE',score:Math.abs(movement.changePercent),statement:`The explicitly selected quote-market candles changed ${movement.changePercent>=0?'+':''}${movement.changePercent.toFixed(2)}% across this segment (${movement.candleCount} indexed candles).`,price:movement,...item});}
  }
  const priority={'activity-surge':4,'wallet-concentration':3,'large-observed-trade':2,'indexed-price-move':1};
  candidates.sort((a,b)=>b.score-a.score||(priority[b.kind]||0)-(priority[a.kind]||0)||a.from-b.from);
  const used=new Set(),selected=[];for(const candidate of candidates){const key=`${candidate.kind}:${candidate.from}`;if(used.has(key))continue;used.add(key);selected.push(Object.freeze({id:`sequence-${candidate.kind}-${Math.trunc(candidate.from)}`,kind:candidate.kind,label:candidate.label,from:candidate.from,to:candidate.to,bucketSeconds,eventCount:candidate.eventCount,walletCount:candidate.walletCount,buyCount:candidate.buyCount,sellCount:candidate.sellCount,largestAbsTokenDelta:candidate.largestAbsTokenDelta,focusEventId:candidate.focusEventId,evidenceIds:Object.freeze(candidate.evidenceIds.slice()),score:clamp(candidate.score,0,1e9),statement:candidate.statement,price:candidate.price?Object.freeze(candidate.price):null,disclosure:'Calculated only from the currently loaded bounded token-market evidence. This does not establish coordination, ownership, strategy, intent, causation, or future behavior.'}));if(selected.length>=Math.max(1,Math.min(12,Math.trunc(limit)||6)))break;}
  return Object.freeze(selected);
}

export function sliceMarketReplayToSequence(bundle={},sequence={}){const from=finite(sequence.from),to=finite(sequence.to);if(from==null||to==null||to<from)throw new TypeError('valid sequence window is required');const events=(bundle.events||[]).filter(event=>{const t=finite(event.timestamp);return t!=null&&t>=from&&t<=to;});const candles=(bundle.candles||[]).filter(item=>{const t=finite(item.timestamp);return t!=null&&t>=from&&t<=to;});return Object.freeze({...bundle,window:Object.freeze({...bundle.window,from:Math.trunc(from/1000),to:Math.trunc(to/1000),startTime:from,endTime:to}),events:Object.freeze(events),candles:Object.freeze(candles),activity:Object.freeze({...bundle.activity,totalEvents:events.length,returnedEvents:events.length,walletCount:new Set(events.map(event=>event.wallet).filter(Boolean)).size,buyCount:events.filter(event=>event.side==='buy').length,sellCount:events.filter(event=>event.side==='sell').length,truncated:false}),selectedSequence:Object.freeze({...sequence})});}
