import { intelligenceDb } from './intelligence-indexer.mjs';

const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOURCE_KINDS=new Set(['yellowstone','richat','substreams','old-faithful']);
const s=v=>String(v==null?'':v).trim();
const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const now=()=>Math.floor(Date.now()/1000);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

function bearer(request){const header=s(request.headers.get('authorization'));return header.toLowerCase().startsWith('bearer ')?header.slice(7).trim():'';}
function authorized(request,env={}){const expected=s(env.INTELLIGENCE_MESH_INGEST_TOKEN),supplied=bearer(request);return Boolean(expected)&&expected.length===supplied.length&&expected===supplied;}
export function externalRetrievalEnabled(env={}){return s(env.INTELLIGENCE_MESH_ENABLED).toLowerCase()==='true'&&s(env.INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED).toLowerCase()==='true';}

export function normalizeRetrievalTaskInput(input={}){
  const wallet=s(input.wallet),source=s(input.source),sourceKind=s(input.sourceKind||input.source_kind).toLowerCase(),from=finite(input.requestedFrom??input.from),to=finite(input.requestedTo??input.to),indexJobId=finite(input.indexJobId??input.index_job_id);
  if(!WALLET_RE.test(wallet))throw new Error('invalid_public_wallet');
  if(!SOURCE_KINDS.has(sourceKind))throw new Error('unsupported_source_kind');
  if(from==null||to==null||to<from)throw new Error('valid_requested_window_required');
  return Object.freeze({wallet,source:source||sourceKind,sourceKind,requestedFrom:Math.trunc(from),requestedTo:Math.trunc(to),indexJobId:indexJobId==null?null:Math.trunc(indexJobId)});
}

export async function queueExternalRetrievalTask(env={},input={}){
  if(!externalRetrievalEnabled(env))return Object.freeze({ok:true,enabled:false,queued:false,task:null});
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const task=normalizeRetrievalTaskInput(input);
  const existing=await db.prepare(`SELECT id,state,lease_until,index_job_id FROM intelligence_retrieval_tasks WHERE wallet=? AND source_kind=? AND requested_from=? AND requested_to=? AND state IN ('queued','leased') ORDER BY updated_at DESC LIMIT 1`).bind(task.wallet,task.sourceKind,task.requestedFrom,task.requestedTo).first();
  if(existing?.id)return Object.freeze({ok:true,enabled:true,queued:false,reused:true,task:Object.freeze({taskId:Number(existing.id),state:s(existing.state),leaseUntil:finite(existing.lease_until),indexJobId:finite(existing.index_job_id)})});
  const result=await db.prepare(`INSERT INTO intelligence_retrieval_tasks(index_job_id,wallet,source,source_kind,requested_from,requested_to,state,next_attempt_at,created_at,updated_at) VALUES(?,?,?,?,?,?,'queued',unixepoch(),unixepoch(),unixepoch())`).bind(task.indexJobId,task.wallet,task.source,task.sourceKind,task.requestedFrom,task.requestedTo).run();
  return Object.freeze({ok:true,enabled:true,queued:true,reused:false,task:Object.freeze({taskId:Number(result?.meta?.last_row_id)||null,state:'queued',...task})});
}

export async function claimExternalRetrievalTasks(env={},input={}){
  if(!externalRetrievalEnabled(env))return Object.freeze({ok:true,enabled:false,tasks:Object.freeze([])});
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const allowedKinds=(Array.isArray(input.sourceKinds)?input.sourceKinds:[]).map(x=>s(x).toLowerCase()).filter(x=>SOURCE_KINDS.has(x));
  const limit=Math.max(1,Math.min(5,Math.trunc(Number(input.limit)||1))),leaseSeconds=Math.max(30,Math.min(300,Math.trunc(Number(input.leaseSeconds)||120))),ts=now();
  const rows=await db.prepare(`SELECT id,index_job_id,wallet,source,source_kind,requested_from,requested_to,state,lease_until,attempts FROM intelligence_retrieval_tasks WHERE ((state='queued' AND (next_attempt_at IS NULL OR next_attempt_at<=?)) OR (state='leased' AND lease_until IS NOT NULL AND lease_until<=?)) ORDER BY updated_at ASC LIMIT 25`).bind(ts,ts).all();
  const selected=(rows?.results||[]).filter(row=>!allowedKinds.length||allowedKinds.includes(s(row.source_kind).toLowerCase())).slice(0,limit),tasks=[];
  for(const row of selected){const leaseUntil=ts+leaseSeconds;await db.prepare(`UPDATE intelligence_retrieval_tasks SET state='leased',lease_until=?,attempts=attempts+1,updated_at=unixepoch() WHERE id=?`).bind(leaseUntil,row.id).run();tasks.push(Object.freeze({taskId:Number(row.id),indexJobId:finite(row.index_job_id),wallet:s(row.wallet),source:s(row.source),sourceKind:s(row.source_kind),requestedFrom:finite(row.requested_from),requestedTo:finite(row.requested_to),leaseUntil,attempt:Number(row.attempts||0)+1}));}
  return Object.freeze({ok:true,enabled:true,tasks:Object.freeze(tasks),disclosure:'Tasks contain only bounded public-wallet retrieval coordinates. Claiming a task does not assert that the requested interval contains transactions or that the selected source has complete coverage.'});
}

export async function finishExternalRetrievalTask(env={},input={}){
  if(!externalRetrievalEnabled(env))return Object.freeze({ok:true,enabled:false});
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const taskId=finite(input.taskId??input.id);if(taskId==null||taskId<1||!Number.isInteger(taskId))throw new Error('task_id_required');
  const state=s(input.state||'complete').toLowerCase(),error=s(input.error);
  if(state!=='complete'&&state!=='retry')throw new Error('invalid_task_state');
  const task=await db.prepare(`SELECT id,index_job_id,state FROM intelligence_retrieval_tasks WHERE id=? LIMIT 1`).bind(taskId).first();
  if(!task?.id)throw new Error('task_not_found');
  if(s(task.state)!=='leased')throw new Error('task_not_leased');
  if(state==='complete'){
    await db.prepare(`UPDATE intelligence_retrieval_tasks SET state='complete',lease_until=NULL,last_error=NULL,next_attempt_at=NULL,updated_at=unixepoch() WHERE id=?`).bind(taskId).run();
    if(task.index_job_id!=null)await db.prepare(`UPDATE intelligence_index_jobs SET state='queued',last_error=NULL,next_attempt_at=unixepoch(),updated_at=unixepoch() WHERE id=? AND state='waiting-external'`).bind(task.index_job_id).run();
  }else{
    await db.prepare(`UPDATE intelligence_retrieval_tasks SET state='queued',lease_until=NULL,last_error=?,next_attempt_at=?,updated_at=unixepoch() WHERE id=?`).bind(error||'external_retrieval_retry',now()+120,taskId).run();
  }
  return Object.freeze({ok:true,enabled:true,taskId,indexJobId:finite(task.index_job_id),state});
}

export async function handleExternalRetrievalTaskRequest(request,env={}){
  const url=new URL(request.url),claim='/api/internal/intelligence/retrieval-tasks/claim',finish='/api/internal/intelligence/retrieval-tasks/finish';
  if(url.pathname!==claim&&url.pathname!==finish)return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
  let input={};try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  try{return json(url.pathname===claim?await claimExternalRetrievalTasks(env,input):await finishExternalRetrievalTask(env,input));}
  catch(error){const code=s(error?.message||error),status=code==='intelligence_db_unavailable'?503:400;return json({ok:false,error:code},status);}
}
