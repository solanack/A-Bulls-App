import { intelligenceDb } from './intelligence-indexer.mjs';
import { positionForEntity, sampleUniverseObservations } from './intelligence-universe-runtime.mjs';
import { universeMembers } from './intelligence-ecosystem-universes.mjs';

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=v=>Math.max(0,Math.min(1,n(v)));
const COMMITMENTS=new Set(['observed','confirmed','finalized','verified']);
const parse=v=>{try{return typeof v==='object'&&v?v:JSON.parse(String(v||'{}'));}catch{return{};}};

function relationsFor(rows=[],extraIds=[]){
  const ids=new Set([...rows.map(row=>s(row.entity_id)),...extraIds.map(s)].filter(Boolean)),seen=new Set(),relations=[];
  for(const row of rows){const evidence=parse(row.evidence_json);for(const rel of(Array.isArray(evidence.relations)?evidence.relations:[])){const sourceId=s(rel?.sourceId||rel?.fromId),targetId=s(rel?.targetId||rel?.toId);if(!sourceId||!targetId||sourceId===targetId||!ids.has(sourceId)||!ids.has(targetId))continue;const evidenceId=s(rel?.evidenceId||rel?.eventId||rel?.signature||row.event_id);if(!evidenceId)continue;const key=[sourceId,targetId,evidenceId].sort().join('|');if(seen.has(key))continue;seen.add(key);relations.push({id:s(rel?.id)||`relation:${evidenceId}:${relations.length}`,sourceId,targetId,evidenceId,relationKind:s(rel?.relationKind||rel?.kind||rel?.type)||'observed',observedAt:n(rel?.observedAt||row.observed_at),verificationState:COMMITMENTS.has(s(rel?.verificationState))?s(rel.verificationState):COMMITMENTS.has(s(row.commitment))?s(row.commitment):'observed'});}}
  return relations;
}

function memberParticle(id,member,now){return{id:member.entityId,observationId:`membership:${id}:${member.entityId}`,kind:member.entityKind||'token',category:'member',verificationState:'verified',observedAt:member.lastSeenAt||now,magnitudeBand:clamp(1-((Math.max(1,n(member.rank)||1)-1)/Math.max(10,n(member.rank)||10))*.55),position:positionForEntity(`${id}:member:${member.entityId}`),metadata:{rank:member.rank,active:true,qualifyingCycles:member.qualifyingCycles,entryCount:member.entryCount,...(member.metadata||{})}};}
function observationParticle(id,row){return{id:s(row.entity_id),observationId:s(row.event_id),kind:s(row.entity_kind),category:s(row.category)||'unknown',verificationState:COMMITMENTS.has(s(row.commitment))?s(row.commitment):'observed',observedAt:n(row.observed_at),magnitudeBand:clamp(row.magnitude_band),position:positionForEntity(`${id}:${s(row.entity_kind)}:${s(row.entity_id)}`),metadata:{}};}

export async function ecosystemUniverseSnapshot(env={},universeId='solana',{windowSeconds=60,limit=2500,now=Math.floor(Date.now()/1000)}={}){
  const db=intelligenceDb(env),id=s(universeId)||'solana',window=Math.max(10,Math.min(86400,Math.trunc(n(windowSeconds)||60))),cap=Math.max(1,Math.min(5000,Math.trunc(n(limit)||2500))),from=now-window;
  if(!db)return{schemaVersion:2,universeId:id,windowStart:from,windowEnd:now,observedEventCount:0,renderedParticleCount:0,activeMemberCount:0,particles:[],relations:[],members:[],sources:[],samplingPolicy:'no database binding',coverageStatement:'No indexed observations are available.'};
  const result=id==='solana'
    ? await db.prepare('SELECT event_id,entity_kind,entity_id,category,observed_at,slot,commitment,magnitude_band,source,evidence_json FROM intelligence_live_observations WHERE observed_at BETWEEN ? AND ? ORDER BY observed_at DESC LIMIT 20000').bind(from,now).all()
    : await db.prepare('SELECT o.event_id,o.entity_kind,o.entity_id,o.category,o.observed_at,o.slot,o.commitment,o.magnitude_band,o.source,o.evidence_json FROM intelligence_live_observations o JOIN intelligence_universe_observation_links l ON l.event_id=o.event_id AND l.universe_id=? WHERE o.observed_at BETWEEN ? AND ? ORDER BY o.observed_at DESC LIMIT 20000').bind(id,from,now).all();
  const rows=result?.results||[],members=id==='solana'?[]:await universeMembers(env,id,{activeOnly:true,limit:1000}),anchorCap=Math.min(members.length,Math.max(0,cap)),anchors=members.slice(0,anchorCap).map(member=>memberParticle(id,member,now)),remaining=Math.max(0,cap-anchors.length),sampled=remaining?sampleUniverseObservations(rows,remaining):[],particles=[...anchors],keys=new Set(anchors.map(item=>`${item.kind}:${item.id}`));
  for(const row of sampled){const particle=observationParticle(id,row),key=`${particle.kind}:${particle.id}`;if(keys.has(key))continue;keys.add(key);particles.push(particle);if(particles.length>=cap)break;}
  const sources=[...new Set([...rows.map(row=>s(row.source)).filter(Boolean),...(members.length?['universe-membership']:[])])],shownObservations=Math.max(0,particles.length-anchors.length);
  return{schemaVersion:2,universeId:id,windowStart:from,windowEnd:now,observedEventCount:rows.length,renderedParticleCount:particles.length,activeMemberCount:members.length,members,samplingPolicy:rows.length>remaining?'active-member anchors plus magnitude/category-balanced observation sample':'active-member anchors plus all bounded universe observations',coverageStatement:`${anchors.length} active members anchored; ${shownObservations} of ${rows.length} indexed observations shown from ${id} over the last ${window} seconds`,sources,particles,relations:relationsFor(sampled,anchors.map(item=>item.id))};
}
