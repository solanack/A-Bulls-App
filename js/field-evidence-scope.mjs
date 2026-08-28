const text=value=>String(value==null?'':value).trim();
const unique=value=>Object.freeze([...new Set((Array.isArray(value)?value:[]).map(text).filter(Boolean))]);

export function fieldEvidenceScope(request={}){
  const evidenceIds=unique(request.evidenceIds);
  return Object.freeze({
    destination:text(request.destination||'intelligence'),
    entityId:text(request.entityId||request.query),
    entityKind:text(request.entityKind||'entity'),
    verificationState:text(request.verificationState||'unknown'),
    simulation:request.simulation===true,
    evidenceIds,
    active:evidenceIds.length>0
  });
}

function receiptsForEvent(event={}){
  return unique([event.id,event.signature,event.evidenceId,event.transactionId,event.receiptId]);
}

export function matchFieldEvidenceScope(events=[],scope={}){
  const requested=unique(scope.evidenceIds),wanted=new Set(requested),matchedIds=new Set(),matchedEvents=[];
  for(const event of (Array.isArray(events)?events:[])){
    const receipts=receiptsForEvent(event),matches=receipts.filter(id=>wanted.has(id));
    if(!matches.length)continue;
    matchedEvents.push(event);for(const id of matches)matchedIds.add(id);
  }
  const matched=Object.freeze([...matchedIds]),missing=Object.freeze(requested.filter(id=>!matchedIds.has(id)));
  const state=!requested.length?'unscoped':!matched.length?'not-in-bundle':missing.length?'partial':'matched';
  return Object.freeze({
    state,requested,matched,missing,matchedEvents:Object.freeze(matchedEvents),
    disclosure:state==='unscoped'
      ?'No field evidence receipts were requested.'
      :state==='matched'
        ?'Every requested field receipt is present in this loaded replay bundle.'
        :'One or more requested field receipts are not present in this loaded replay bundle. This describes bounded index coverage only and does not mean no activity exists.'
  });
}
