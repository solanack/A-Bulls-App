import { intelligenceDb } from './intelligence-indexer.mjs';
import { positionForEntity, sampleUniverseObservations } from './intelligence-universe-runtime.mjs';
import { universeMembers } from './intelligence-ecosystem-universes.mjs';

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=v=>Math.max(0,Math.min(1,n(v)));
const COMMITMENTS=new Set(['observed','confirmed','finalized','verified']);
const parse=v=>{try{return typeof v==='object'&&v?v:JSON.parse(String(v||'{}'));}catch{return{};}};

function relationsFor(rows=[]){
  const ids=new Set(rows.map(row=>s(row.entity_id)).filter(Boolean)),seen=new Set(),relations=[];
  for(const row of rows){const evidence=parse(row.evidence_json);for(const rel of(Array.isArray(evidence.relations)?evidence.relations:[])){const sourceId=s(rel?.sourceId||rel?.fromId),targetId=s(rel?.targetId||rel?.toId);if(!sourceId||!targetId||sourceId===targetId||!ids.has(sourceId)||!ids.has(targetId))continue;const evidenceId=s(rel?.evidenceId||rel?.eventId||rel?.signature||row.event_id);if(!evidenceId)continue;const key=[sourceId,targetId,evidenceId].sort().join('|');if(seen.has(key))continue;seen.add(key);relations.push({id:s(rel?.id)||`relation:${evidenceId}:${relations.length}`,sourceId,targetId,evidenceId,relationKind:s(rel?.relationKind||rel?.kind||rel?.type)||'observed',observedAt:n(rel?.observedAt||row.observed_at),verificationState:COMMITMENTS.has(s(rel?.verificationState))?s(rel.verificationState):COMMITMENTS.has(s(row.commitment))?s(row.commitment):'observed'});}}
  return relations;
}

export async function ecosystemUniverseSnapshot(env={},universeId='solana',{windowSeconds=60,limit=2500,now=Math.floor(Date.now()/1000)}={}){
  const db=intelligenceDb(env),id=s(universeId)||'solana',window=Math.max(10,Math.min(86400,Math.trunc(n(windowSeconds)||60))),cap=Math.max(1,Math.min(5000,Math.trunc(n(limit)||2500))),from=now-window;
  if(!db)return{schemaVersion:2,universeId:id,windowStart:from,windowEnd:now,observedEventCount:0,renderedParticleCount:0,particles:[],relations:[],members:[],sources:[],coverageStatement:'No live observations available.'};
  const result=id==='solana'
    ? await db.prepare(`SELECT event_id,entity_kind,entity_id,category,observed_at,slot,commitment,magnitude_band,source,evidence_json FROM intelligence_live_observations WHERE observed_at BETWEEN ? AND ? ORDER BY observed_at DESC LIMIT 20000`).bind(from,now).all()
    : await db.prepare(`SELECT o.event_id,o.entity_kind,o.entity_id,o.category,o.observed_at,o.slot,o.commitment,o.magnitude_band,o.source,o.evidence_json FROM intelligence_live_observations o JOIN intelligence_universe_observation_links l ON l.event_id=o.event_id AND l.universe_id=? WHERE o.observed_at BETWEEN ? AND ? ORDER BY o.observed_at DESC LIMIT 20000`).bind(id,from,now).all();
  const rows=result?.results||[],sampled=sampleUniverseObservations(rows,cap),members=id==='solana'?[]:await universeMembers(env,id,{activeOnly:true,limit:1000}),sources=[...new Set(rows.map(row=>s(row.source)).filter(Boolean))];
  return{schemaVersion:2,universeId:id,windowStart:from,windowEnd:now,observedEventCount:rows.length,renderedParticleCount:sampled.length,activeMemberCount:members.length,members,samplingPolicy:rows.length>cap?'35% magnitude-priority plus category-balanced sample':'all bounded universe observations',coverageStatement:`${sampled.length.toLocaleString()} of ${rows.length.toLocaleString()} observations shown from ${id} over the last ${window} seconds`,sources,particles:sampled.map(row=>({id:s(row.entity_id),observationId:s(row.event_id),kind:s(row.entity_kind),category:s(row.category)||'unknown',verificationState:COMMITMENTS.has(s(row.commitment))?s(row.commitment):'observed',observedAt:n(row.observed_at),magnitudeBand:clamp(row.magnitude_band),position:positionForEntity(`${id}:${s(row.entity_id)}`)})),relations:relationsFor(sampled)};
}
