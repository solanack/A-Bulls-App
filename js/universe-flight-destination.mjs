const s=v=>String(v??'').trim();
const BASE58=/^[1-9A-HJ-NP-Za-km-z]+$/;

export function classifyFlightDestination(value){
  const q=s(value);
  if(BASE58.test(q)&&q.length>=64&&q.length<=90)return Object.freeze({query:q,kind:'transaction-signature'});
  if(BASE58.test(q)&&q.length>=32&&q.length<=50)return Object.freeze({query:q,kind:'solana-address'});
  return Object.freeze({query:q,kind:q?'search-text':'empty'});
}

export function planFlightDestination(input={},context={}){
  const classified=classifyFlightDestination(input.query||input.value||input.id);
  if(classified.kind==='empty')return Object.freeze({ok:false,state:'invalid',error:'destination_required'});
  if(classified.kind==='search-text')return Object.freeze({ok:false,state:'unsupported',error:'exact_public_identifier_required',query:classified.query});
  const resolution=context.resolution||null,index=context.index||null;
  if(!resolution)return Object.freeze({ok:true,state:'needs-resolution',query:classified.query,kind:classified.kind,next:'resolve-public-chain-entity'});
  if(resolution.ok===false)return Object.freeze({ok:false,state:'resolution-failed',query:classified.query,error:s(resolution.error)||'resolution_failed'});
  if(resolution.state==='not-found')return Object.freeze({ok:false,state:'not-found',query:classified.query,kind:classified.kind,label:s(resolution.label)||null});
  const entityKind=resolution.kind==='transaction-signature'?'transaction':resolution.label==='token-mint'?'token':resolution.label==='program'?'program':resolution.label==='token-account'?'token-account':'address';
  if(!index)return Object.freeze({ok:true,state:'resolved-needs-index-check',query:classified.query,entityKind,resolution,next:'check-index-coverage'});
  const indexed=Boolean(index.indexed||index.eventCount>0||index.coverageState==='indexed'||index.coverageState==='complete');
  if(!indexed)return Object.freeze({ok:true,state:'resolved-not-indexed',query:classified.query,entityKind,resolution,index,next:'offer-bounded-index-job',destinationVisible:false,fog:true});
  return Object.freeze({ok:true,state:'ready',query:classified.query,entityKind,resolution,index,destinationVisible:true,fog:false,next:'build-flight-sector'});
}

export function destinationPrompt(plan={}){
  switch(plan.state){
    case 'needs-resolution': return 'LOCATING DESTINATION';
    case 'resolved-needs-index-check': return 'DESTINATION FOUND · CHECKING MAP';
    case 'resolved-not-indexed': return 'DESTINATION FOUND · UNMAPPED SPACE';
    case 'ready': return 'DESTINATION LOCKED';
    case 'not-found': return 'DESTINATION NOT FOUND';
    default:return 'DESTINATION?';
  }
}

export const __universeFlightDestinationContract=Object.freeze({publicIdentifiersOnly:true,noWalletConnect:true,noSigning:true,noNetworkCalls:true,unknownIndexUsesFog:true});
