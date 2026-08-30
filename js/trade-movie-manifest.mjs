const s=v=>String(v??'').trim();
const n=(v,name)=>{const x=Number(v);if(!Number.isFinite(x))throw new TypeError(`${name} must be finite`);return x;};
const STORY_TYPES=new Set(['massive-win','painful-loss','token-discovery','wallet-origin','nft-journey','investigation','market-event','custom']);
const SEGMENT_TYPES=new Set(['flight','replay','chart','inspect','trickster-video','caption','simulation']);

export function validateTradeMovieManifest(input={}){
  const id=s(input.id);if(!id)throw new TypeError('id is required');
  const storyType=s(input.storyType);if(!STORY_TYPES.has(storyType))throw new RangeError('unsupported story type');
  const subject={kind:s(input.subject?.kind),id:s(input.subject?.id)};if(!subject.kind||!subject.id)throw new TypeError('subject is required');
  const evidence=(input.evidence||[]).map((e,i)=>{const eid=s(e?.id);if(!eid)throw new TypeError(`evidence ${i} id required`);if(!e.signature&&!e.sourceReference&&!e.archiveReference)throw new TypeError(`evidence ${eid} source required`);return Object.freeze({id:eid,signature:e.signature?String(e.signature):null,source:s(e.source)||'unknown',sourceReference:e.sourceReference?String(e.sourceReference):null,archiveReference:e.archiveReference?String(e.archiveReference):null,blockTime:e.blockTime==null?null:n(e.blockTime,`evidence ${eid} blockTime`)});});
  const evidenceIds=new Set(evidence.map(e=>e.id));if(evidenceIds.size!==evidence.length)throw new RangeError('evidence ids must be unique');
  const segments=(input.segments||[]).map((seg,i)=>{const type=s(seg?.type);if(!SEGMENT_TYPES.has(type))throw new RangeError(`unsupported segment type ${type}`);const observed=seg.observed!==false;const refs=[...new Set(seg.evidenceIds||[])].map(String);if(observed&&type!=='caption'&&!refs.length)throw new TypeError(`segment ${i} requires evidence`);for(const ref of refs)if(!evidenceIds.has(ref))throw new RangeError(`segment ${i} missing evidence ${ref}`);if(type==='simulation'&&observed)throw new TypeError('simulation segment cannot be observed');return Object.freeze({id:s(seg.id)||`segment-${i+1}`,type,startMs:Math.max(0,n(seg.startMs??0,'startMs')),durationMs:Math.max(1,n(seg.durationMs??1,'durationMs')),observed,evidenceIds:Object.freeze(refs),camera:seg.camera||null,trickster:seg.trickster||null,mediaReference:seg.mediaReference?String(seg.mediaReference):null,caption:seg.caption?String(seg.caption):null,disclosure:seg.disclosure?String(seg.disclosure):null});});
  if(!segments.length)throw new TypeError('at least one segment required');
  for(const seg of segments)if(!seg.observed&&!seg.disclosure)throw new TypeError(`non-observed segment ${seg.id} requires disclosure`);
  const coverage={from:n(input.coverage?.from,'coverage.from'),to:n(input.coverage?.to,'coverage.to'),verifiedPercent:Math.max(0,Math.min(100,n(input.coverage?.verifiedPercent,'coverage.verifiedPercent'))),statement:s(input.coverage?.statement)};if(coverage.to<coverage.from)throw new RangeError('coverage.to precedes from');if(!coverage.statement)throw new TypeError('coverage.statement required');
  return Object.freeze({schemaVersion:'trade-movie-v1',id,storyType,subject:Object.freeze(subject),coverage:Object.freeze(coverage),evidence:Object.freeze(evidence),segments:Object.freeze(segments),output:Object.freeze({aspectRatio:s(input.output?.aspectRatio)||'9:16',theme:s(input.output?.theme)||'universe-flight',rendererVersion:s(input.output?.rendererVersion)||'universe-flight-v1'}),createdAt:n(input.createdAt??Date.now(),'createdAt')});
}

export function tradeMovieDisclosures(manifest){const out=new Set();if(manifest.coverage.verifiedPercent<100)out.add(manifest.coverage.statement);for(const seg of manifest.segments)if(seg.disclosure)out.add(seg.disclosure);return Object.freeze([...out]);}

export function buildTradeMovieDraft({id,storyType='custom',subject,evidence=[],flightPath=[],replayEvents=[],coverage}={}){
  const segments=[];let cursor=0;
  if(flightPath.length){segments.push({id:'flight-1',type:'flight',startMs:cursor,durationMs:Math.max(1000,flightPath.length*80),observed:true,evidenceIds:evidence.map(e=>e.id),camera:{keyframes:flightPath.slice(0,2000)}});cursor+=segments.at(-1).durationMs;}
  if(replayEvents.length){const refs=[...new Set(replayEvents.map(e=>e.evidenceId).filter(Boolean))];segments.push({id:'replay-1',type:'replay',startMs:cursor,durationMs:Math.max(1000,replayEvents.length*120),observed:true,evidenceIds:refs});cursor+=segments.at(-1).durationMs;}
  if(!segments.length)segments.push({id:'inspect-1',type:'inspect',startMs:0,durationMs:1500,observed:true,evidenceIds:evidence.slice(0,1).map(e=>e.id)});
  return validateTradeMovieManifest({id,storyType,subject,evidence,segments,coverage,createdAt:Date.now(),output:{aspectRatio:'9:16',theme:'universe-flight',rendererVersion:'universe-flight-v1'}});
}

export const __tradeMovieContract=Object.freeze({evidenceRequiredForObservedSegments:true,simulationMustBeDisclosed:true,lightweightManifest:true,noBlockchainDataDuplication:true});

