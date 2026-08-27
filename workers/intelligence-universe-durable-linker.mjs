import { intelligenceDb } from './intelligence-indexer.mjs';

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const uniq=v=>[...new Set(v.filter(Boolean))];

async function membershipsForMint(db,mint){
  if(!mint)return[];
  const result=await db.prepare('SELECT universe_id,source_snapshot_id FROM intelligence_universe_membership WHERE entity_kind=\'token\' AND entity_id=? AND active=1').bind(mint).all();
  return result?.results||[];
}

export async function linkIndexedEventsToUniverses(env={},rows=[]){
  const db=intelligenceDb(env);if(!db)return{linked:0,events:0};
  let linked=0,events=0;
  for(const row of(Array.isArray(rows)?rows:[]).slice(0,1000)){
    const signature=s(row.signature),wallet=s(row.wallet),mint=s(row.mint),blockTime=Math.max(0,Math.trunc(n(row.blockTime||row.block_time)));
    if(!signature)continue;
    const stored=await db.prepare('SELECT id,signature,wallet,mint,block_time FROM bull_wallet_events WHERE signature=? AND wallet=? AND mint=? ORDER BY id DESC LIMIT 1').bind(signature,wallet,mint).first();
    if(!stored?.id)continue;events+=1;
    const memberships=await membershipsForMint(db,mint),universeRows=[{universe_id:'solana',source_snapshot_id:null},...memberships];
    const seen=new Set();
    for(const membership of universeRows){const universeId=s(membership.universe_id);if(!universeId||seen.has(universeId))continue;seen.add(universeId);await db.prepare('INSERT OR IGNORE INTO intelligence_universe_event_links(universe_id,event_row_id,signature,wallet,mint,block_time,membership_snapshot_id,linked_at) VALUES(?,?,?,?,?,?,?,unixepoch())').bind(universeId,n(stored.id),s(stored.signature),s(stored.wallet),s(stored.mint),n(stored.block_time)||blockTime,s(membership.source_snapshot_id)||null).run();linked+=1;}
  }
  return{linked,events};
}

export async function universeMembershipTimeline(env={},universeId='',{limit=250}={}){const db=intelligenceDb(env);if(!db)return[];const cap=Math.max(1,Math.min(2000,Math.trunc(n(limit)||250)));const result=await db.prepare('SELECT universe_id,entity_kind,entity_id,event_kind,rank,observed_at,source_snapshot_id,reason,metadata_json FROM intelligence_universe_membership_events WHERE universe_id=? ORDER BY observed_at DESC,id DESC LIMIT ?').bind(s(universeId),cap).all();return result?.results||[];}

export async function durableUniverseEvidence(env={},universeId='',{from=0,to=Math.floor(Date.now()/1000),limit=1000,wallet='',mint=''}={}){const db=intelligenceDb(env);if(!db)return[];const cap=Math.max(1,Math.min(5000,Math.trunc(n(limit)||1000))),conditions=['l.universe_id=?','e.block_time BETWEEN ? AND ?'],values=[s(universeId)||'solana',Math.max(0,Math.trunc(n(from))),Math.max(0,Math.trunc(n(to)))];if(s(wallet)){conditions.push('e.wallet=?');values.push(s(wallet));}if(s(mint)){conditions.push('e.mint=?');values.push(s(mint));}values.push(cap);const result=await db.prepare(`SELECT e.id,e.signature,e.slot,e.block_time,e.wallet,e.counterparty,e.program_id,e.mint,e.collection,e.event_class,e.sol_delta,e.token_delta,e.fee_lamports,e.source,e.confidence,l.membership_snapshot_id FROM bull_wallet_events e JOIN intelligence_universe_event_links l ON l.event_row_id=e.id WHERE ${conditions.join(' AND ')} ORDER BY e.block_time DESC,e.id DESC LIMIT ?`).bind(...values).all();return result?.results||[];}

export const __durableUniverseLinkContract=Object.freeze({canonicalTable:'bull_wallet_events',membershipAtIngest:true,preservesExitedUniverseHistory:true});
