const finite=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();
const eventId=event=>text(event?.signature||event?.id)||null;

function summarize(events=[],index=0){const wallets=new Set(),evidenceIds=[];let buys=0,sells=0,largestAbsTokenDelta=null;for(const event of events){if(text(event.wallet))wallets.add(text(event.wallet));if(event.side==='buy')buys+=1;else if(event.side==='sell')sells+=1;const delta=finite(event.tokenDelta);if(delta!=null){const abs=Math.abs(delta);largestAbsTokenDelta=largestAbsTokenDelta==null?abs:Math.max(largestAbsTokenDelta,abs);}const id=eventId(event);if(id&&!evidenceIds.includes(id))evidenceIds.push(id);}return Object.freeze({id:`phase-${index+1}`,label:`PHASE ${index+1}`,from:finite(events[0]?.timestamp),to:finite(events.at(-1)?.timestamp),eventCount:events.length,walletCount:wallets.size,buyCount:buys,sellCount:sells,largestAbsTokenDelta,evidenceIds:Object.freeze(evidenceIds)});}

export function segmentMarketSequence(bundle={}, {maxPhases=3}={}){
  const events=(Array.isArray(bundle.events)?bundle.events:[]).filter(event=>finite(event?.timestamp)!=null).slice().sort((a,b)=>finite(a.timestamp)-finite(b.timestamp)||String(eventId(a)||'').localeCompare(String(eventId(b)||'')));
  if(!events.length)return Object.freeze({phases:Object.freeze([]),method:'no-events',disclosure:'No indexed events are available for phase segmentation.'});
  const desired=Math.max(1,Math.min(3,Math.trunc(maxPhases)||3,events.length));if(desired===1)return Object.freeze({phases:Object.freeze([summarize(events,0)]),method:'single-phase',disclosure:'Phase boundaries are descriptive time partitions of this bounded indexed sequence only.'});
  const gaps=[];for(let i=1;i<events.length;i++)gaps.push({index:i,gapMs:finite(events[i].timestamp)-finite(events[i-1].timestamp)});
  const boundaryCount=desired-1;let boundaries=[];
  if(events.length>=desired*2){boundaries=gaps.slice().sort((a,b)=>b.gapMs-a.gapMs||a.index-b.index).slice(0,boundaryCount).map(item=>item.index).sort((a,b)=>a-b);}
  if(boundaries.length<boundaryCount){boundaries=[];for(let part=1;part<desired;part++)boundaries.push(Math.max(1,Math.min(events.length-1,Math.round((events.length*part)/desired))));boundaries=[...new Set(boundaries)].sort((a,b)=>a-b);}
  const chunks=[],cuts=[0,...boundaries,events.length];for(let i=0;i<cuts.length-1;i++){const chunk=events.slice(cuts[i],cuts[i+1]);if(chunk.length)chunks.push(chunk);}
  return Object.freeze({phases:Object.freeze(chunks.map((chunk,index)=>summarize(chunk,index))),method:events.length>=desired*2?'largest-observed-time-gaps':'event-count-partition',disclosure:'Phase boundaries are calculated from timing inside this bounded indexed window. They do not label market regime, trader intent, strategy, causation, or future behavior.'});
}
