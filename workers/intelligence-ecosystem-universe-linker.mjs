import { intelligenceDb } from './intelligence-indexer.mjs';

const s=v=>String(v??'').trim();
const parse=v=>{try{return typeof v==='object'&&v?v:JSON.parse(String(v||'{}'));}catch{return{};}};
const uniq=values=>[...new Set(values.filter(Boolean))];

export async function linkObservationToUniverses(env={},observation={}){
  const db=intelligenceDb(env);if(!db)return 0;
  const eventId=s(observation.eventId||observation.event_id),entityKind=s(observation.entityKind||observation.entity_kind)||'transaction',entityId=s(observation.entityId||observation.entity_id),observedAt=Math.max(0,Math.trunc(Number(observation.observedAt||observation.observed_at)||0));
  if(!eventId||!entityId)return 0;
  const evidence=parse(observation.evidence||observation.evidence_json),ids=uniq([entityId,...(Array.isArray(evidence.tokens)?evidence.tokens:[]).map(item=>s(item?.mint||item?.id||item)),...(Array.isArray(evidence.relations)?evidence.relations:[]).flatMap(rel=>[s(rel?.sourceId),s(rel?.targetId)])]);
  let universes=[];
  if(ids.length){const marks=ids.map(()=>'?').join(',');const result=await db.prepare(`SELECT DISTINCT universe_id FROM intelligence_universe_membership WHERE active=1 AND entity_id IN (${marks})`).bind(...ids).all();universes=(result?.results||[]).map(row=>s(row.universe_id)).filter(Boolean);}
  if(!universes.includes('solana'))universes.push('solana');universes=uniq(universes);
  for(const universeId of universes)await db.prepare(`INSERT OR IGNORE INTO intelligence_universe_observation_links(universe_id,event_id,entity_kind,entity_id,observed_at) VALUES(?,?,?,?,?)`).bind(universeId,eventId,entityKind,entityId,observedAt).run();
  return universes.length;
}

export async function linkObservationBatchToUniverses(env={},observations=[]){let links=0;for(const observation of observations.slice(0,1000))links+=await linkObservationToUniverses(env,observation);return links;}

// Called immediately after bull_wallet_events are persisted. It freezes the ecosystem
// membership that was true at ingest time, so a later Top-10 rotation never erases the
// historical research context of an already observed event.
export async function linkIndexedEventsDurably(env={},events=[]){
  const db=intelligenceDb(env);if(!db)return 0;let written=0;
  for(const event of events.slice(0,500)){
    const signature=s(event.signature),wallet=s(event.wallet),mint=s(event.mint);const blockTime=Math.max(0,Math.trunc(Number(event.blockTime||event.block_time)||0));
    if(!signature||!wallet||!blockTime)continue;
    const row=await db.prepare(`SELECT id,signature,wallet,mint,block_time FROM bull_wallet_events WHERE signature=? AND wallet=? AND mint=? ORDER BY id DESC LIMIT 1`).bind(signature,wallet,mint).first();
    if(!row?.id)continue;
    const memberships=mint?(await db.prepare(`SELECT universe_id,source_snapshot_id FROM intelligence_universe_membership WHERE active=1 AND entity_kind='token' AND entity_id=?`).bind(mint).all())?.results||[]:[];
    const targets=[{universe_id:'solana',source_snapshot_id:null},...memberships.filter(item=>s(item.universe_id)!=='solana')];
    for(const target of targets){const result=await db.prepare(`INSERT OR IGNORE INTO intelligence_universe_event_links(universe_id,event_row_id,signature,wallet,mint,block_time,membership_snapshot_id) VALUES(?,?,?,?,?,?,?)`).bind(s(target.universe_id),row.id,signature,wallet,mint,blockTime,s(target.source_snapshot_id)||null).run();written+=Number(result?.meta?.changes||0);}
  }
  return written;
}


