/* A Bulls App — normalized full-chain stream intake.
 * Internal-only bridge for approved Solana upstreams such as Yellowstone/Richat
 * and Carbon. The bridge does not fetch providers itself and never performs a
 * transaction. It only accepts authenticated public-chain observations.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { ingestIntelligenceBatch } from './intelligence-mesh-ingest.mjs';

const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOURCE_KINDS=new Set(['yellowstone','richat','carbon']);
const MAX_EVENTS=500,MAX_WALLETS=100;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const bool=value=>String(value??'').trim().toLowerCase()==='true';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
function bearer(request){const header=s(request.headers.get('authorization'));return header.toLowerCase().startsWith('bearer ')?header.slice(7).trim():'';}
function authorized(request,env={}){const expected=s(env.INTELLIGENCE_MESH_INGEST_TOKEN),supplied=bearer(request);return Boolean(expected)&&supplied.length===expected.length&&supplied===expected;}
function enabled(env={}){return bool(env.FULL_CHAIN_STREAM_ENABLED);}

export function streamCoveragePlan(previous={},rows=[],verified=false){
  const slots=rows.map(row=>Math.trunc(n(row.slot))).filter(slot=>slot>0).sort((a,b)=>a-b),minSlot=slots[0]??null,maxSlot=slots.at(-1)??null,previousObserved=Math.trunc(n(previous.last_observed_slot))||null,previousVerified=Math.trunc(n(previous.last_verified_slot))||null;
  const gap=previousObserved!=null&&minSlot!=null&&minSlot>previousObserved+1?Object.freeze({from:previousObserved+1,to:minSlot-1}):null;
  return Object.freeze({minSlot,maxSlot,gap,lastObservedSlot:maxSlot==null?previousObserved:Math.max(previousObserved??0,maxSlot),lastVerifiedSlot:verified&&maxSlot!=null?Math.max(previousVerified??0,maxSlot):previousVerified});
}

async function persistCoverage(db,source,sourceKind,rows,verified){
  const key=`full-chain:${sourceKind}`,previous=await db.prepare('SELECT last_observed_slot,last_verified_slot FROM index_coverage_checkpoints WHERE source=? LIMIT 1').bind(key).first().catch(()=>null),plan=streamCoveragePlan(previous||{},rows,verified),now=Date.now();
  if(plan.gap){await db.prepare(`INSERT INTO intelligence_slot_gaps(source,start_slot,end_slot,state,detected_at) SELECT ?,?,?,'open',unixepoch() WHERE NOT EXISTS (SELECT 1 FROM intelligence_slot_gaps WHERE source=? AND state='open' AND start_slot=? AND end_slot=?)`).bind(source,plan.gap.from,plan.gap.to,source,plan.gap.from,plan.gap.to).run().catch(()=>null);}
  if(plan.minSlot!=null&&plan.maxSlot!=null){await db.prepare(`UPDATE intelligence_slot_gaps SET state='repaired',repaired_at=unixepoch(),verification_json=? WHERE source=? AND state='open' AND start_slot>=? AND end_slot<=?`).bind(JSON.stringify({sourceKind,verified,coveredFrom:plan.minSlot,coveredTo:plan.maxSlot}),source,plan.minSlot,plan.maxSlot).run().catch(()=>null);}
  const open=await db.prepare(`SELECT COUNT(*) count,MIN(start_slot) gap_from,MAX(end_slot) gap_to FROM intelligence_slot_gaps WHERE source=? AND state='open'`).bind(source).first().catch(()=>null),gapCount=Math.max(0,Math.trunc(n(open?.count))),status=gapCount?'gap-detected':verified?'verified-stream':'observed-stream';
  await db.prepare(`INSERT INTO index_coverage_checkpoints(source,last_observed_slot,last_verified_slot,gap_from_slot,gap_to_slot,status,detail,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(source) DO UPDATE SET last_observed_slot=COALESCE(excluded.last_observed_slot,index_coverage_checkpoints.last_observed_slot),last_verified_slot=CASE WHEN excluded.last_verified_slot IS NULL THEN index_coverage_checkpoints.last_verified_slot ELSE MAX(COALESCE(index_coverage_checkpoints.last_verified_slot,0),excluded.last_verified_slot) END,gap_from_slot=excluded.gap_from_slot,gap_to_slot=excluded.gap_to_slot,status=excluded.status,detail=excluded.detail,updated_at=excluded.updated_at`).bind(key,plan.lastObservedSlot,plan.lastVerifiedSlot,gapCount?n(open?.gap_from):null,gapCount?n(open?.gap_to):null,status,`${sourceKind} stream accepted authenticated normalized observations from ${source}. ${verified?'This batch was explicitly marked verified/finalized by the internal bridge.':'This batch was observed only and did not advance verified-through coverage.'}${gapCount?` ${gapCount} open slot gap(s) remain queued for repair.`:''}`,now).run();
  await db.prepare(`UPDATE intelligence_source_health SET gap_count=?,details_json=?,updated_at=unixepoch() WHERE source=?`).bind(gapCount,JSON.stringify({stream:true,sourceKind,lastObservedSlot:plan.lastObservedSlot,lastVerifiedSlot:plan.lastVerifiedSlot,gapCount}),source).run().catch(()=>null);
  return Object.freeze({...plan,gapCount,status});
}

export async function ingestFullChainStream(env={},payload={}){
  if(!enabled(env))throw new Error('feature_disabled');const db=intelligenceDb(env);if(!db)throw new Error('database_unavailable');
  const source=s(payload.source),sourceKind=s(payload.sourceKind||payload.source_kind).toLowerCase(),events=Array.isArray(payload.events)?payload.events:[],verified=Boolean(payload.verified),archiveRef=s(payload.archiveRef||payload.archive_ref);
  if(!source||source.length>120)throw new Error('source_required');if(!SOURCE_KINDS.has(sourceKind))throw new Error('unsupported_source_kind');if(events.length<1)throw new Error('events_required');if(events.length>MAX_EVENTS)throw new Error('batch_too_large');
  const groups=new Map();for(const event of events){const wallet=s(event?.wallet||event?.address);if(!BASE58_RE.test(wallet))continue;if(!groups.has(wallet))groups.set(wallet,[]);groups.get(wallet).push(event);}if(!groups.size)throw new Error('no_valid_wallet_events');if(groups.size>MAX_WALLETS)throw new Error('too_many_wallets');
  let accepted=0,universeWritten=0;for(const[wallet,rows]of groups){const result=await ingestIntelligenceBatch(env,{wallet,source,sourceKind,events:rows,verified,archiveRef,windowKey:`full-chain:${sourceKind}`,bucketSeconds:300});accepted+=Math.max(0,n(result.accepted));universeWritten+=Math.max(0,n(result.universeWritten));}
  const coverage=await persistCoverage(db,source,sourceKind,events,verified);
  return Object.freeze({ok:true,source,sourceKind,received:events.length,wallets:groups.size,accepted,universeWritten,verified,coverage});
}

export async function handleFullChainStreamRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/internal/intelligence/full-chain-stream')return null;if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}try{return json(await ingestFullChainStream(env,body),202);}catch(error){const code=s(error?.message||error);return json({ok:false,error:code},code==='database_unavailable'?503:400);}}

export const __fullChainStreamContract=Object.freeze({maxEvents:MAX_EVENTS,maxWallets:MAX_WALLETS,sourceKinds:Object.freeze([...SOURCE_KINDS]),readOnly:true,providerFetches:false,requiresInternalBearer:true});
