const finite=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();
const eventId=event=>text(event?.signature||event?.id)||null;

export function analyzeSequenceParticipants(bundle={}, {limit=12}={}){
  const events=(Array.isArray(bundle.events)?bundle.events:[]).filter(event=>finite(event?.timestamp)!=null&&text(event?.wallet)).slice().sort((a,b)=>finite(a.timestamp)-finite(b.timestamp)||String(eventId(a)||'').localeCompare(String(eventId(b)||'')));
  const map=new Map();
  for(const event of events){
    const wallet=text(event.wallet),timestamp=finite(event.timestamp),delta=finite(event.tokenDelta);
    let row=map.get(wallet);if(!row){row={wallet,firstSeen:timestamp,lastSeen:timestamp,eventCount:0,buyCount:0,sellCount:0,largestAbsTokenDelta:null,evidenceIds:[]};map.set(wallet,row);}
    row.lastSeen=timestamp;row.eventCount+=1;if(event.side==='buy')row.buyCount+=1;else if(event.side==='sell')row.sellCount+=1;if(delta!=null){const abs=Math.abs(delta);row.largestAbsTokenDelta=row.largestAbsTokenDelta==null?abs:Math.max(row.largestAbsTokenDelta,abs);}const id=eventId(event);if(id&&!row.evidenceIds.includes(id))row.evidenceIds.push(id);
  }
  const rows=[...map.values()].map(row=>Object.freeze({...row,activeSpanMs:Math.max(0,row.lastSeen-row.firstSeen),evidenceIds:Object.freeze(row.evidenceIds.slice())}));
  rows.sort((a,b)=>a.firstSeen-b.firstSeen||b.eventCount-a.eventCount||a.wallet.localeCompare(b.wallet));
  const max=Math.max(1,Math.min(50,Math.trunc(limit)||12));
  const firstObserved=Object.freeze(rows.slice(0,max));
  const mostActive=Object.freeze(rows.slice().sort((a,b)=>b.eventCount-a.eventCount||a.firstSeen-b.firstSeen).slice(0,max));
  const largestObserved=Object.freeze(rows.filter(row=>row.largestAbsTokenDelta!=null).sort((a,b)=>b.largestAbsTokenDelta-a.largestAbsTokenDelta||a.firstSeen-b.firstSeen).slice(0,max));
  return Object.freeze({walletCount:rows.length,firstObserved,mostActive,largestObserved,disclosure:'Participant chronology describes public wallet addresses observed in this bounded indexed window only. It does not establish identity, common ownership, coordination, skill, intent, strategy, or causation.'});
}
