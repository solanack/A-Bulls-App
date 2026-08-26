const s=value=>String(value==null?'':value).trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function categoryFor(event={}){
  const kind=s(event.eventClass||event.event_class).toLowerCase();
  if(kind==='swap-like')return'swap';
  if(kind.includes('nft'))return'nft';
  if(kind.includes('staking'))return'staking';
  if(kind==='transfer'||kind==='mint'||kind==='burn'||kind==='fee')return'transfer';
  return'program';
}
function magnitudeFor(event={}){
  const token=Math.abs(n(event.tokenDelta||event.token_delta)),sol=Math.abs(n(event.solDelta||event.sol_delta));
  const raw=Math.max(token,sol);if(raw<=0)return.12;return Math.max(.12,Math.min(1,Math.log10(raw+1)/6));
}
function relation(sourceId,targetId,evidenceId,kind,observedAt,verificationState){return Object.freeze({sourceId,targetId,evidenceId,kind,observedAt,verificationState});}

export function projectIndexedEventToUniverse(event={}, {verified=false,sourceKind=''}={}){
  const signature=s(event.signature),wallet=s(event.wallet),mint=s(event.mint),programId=s(event.programId||event.program_id),source=s(event.source||sourceKind),observedAt=Math.max(0,Math.trunc(n(event.blockTime||event.block_time))),verificationState=verified?'verified':'confirmed';
  if(!signature||!source||!observedAt)return Object.freeze([]);
  const category=categoryFor(event),magnitudeBand=magnitudeFor(event),entities=[{kind:'transaction',id:signature}];
  if(BASE58_RE.test(wallet))entities.push({kind:'wallet',id:wallet});
  if(BASE58_RE.test(mint))entities.push({kind:'token',id:mint});
  if(BASE58_RE.test(programId))entities.push({kind:'program',id:programId});
  const edges=entities.slice(1).map(entity=>relation(signature,entity.id,signature,entity.kind,observedAt,verificationState));
  return Object.freeze(entities.map(entity=>Object.freeze({
    eventId:`live:${signature}:${entity.kind}:${entity.id}`,
    entityKind:entity.kind,
    entityId:entity.id,
    category,
    observedAt,
    slot:Math.max(0,Math.trunc(n(event.slot))),
    commitment:verificationState,
    magnitudeBand,
    source,
    evidence:Object.freeze({signature,relations:Object.freeze(edges)})
  })));
}

export function projectIndexedEventsToUniverse(events=[],options={}){
  const output=[];for(const event of (Array.isArray(events)?events:[]).slice(0,500))output.push(...projectIndexedEventToUniverse(event,options));return Object.freeze(output.slice(0,1000));
}
