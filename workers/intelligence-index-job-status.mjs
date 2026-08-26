import { intelligenceDb } from './intelligence-indexer.mjs';
import { schedulerEnabled } from './intelligence-mesh-scheduler.mjs';

const text=value=>String(value==null?'':value).trim();
const playable=env=>text(env?.PLAYABLE_DATA_ENABLED).toLowerCase()==='true';
const number=value=>Number.isFinite(Number(value))?Number(value):null;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

export function normalizeIndexJobIds(values=[]){
  const source=Array.isArray(values)?values:[];
  const ids=[];
  for(const value of source){const id=number(value);if(id==null||id<1||!Number.isInteger(id)||ids.includes(id))continue;ids.push(id);if(ids.length>=10)break;}
  return Object.freeze(ids);
}

export async function readIndexJobStatus(env={},input={}){
  const ids=normalizeIndexJobIds(input.jobIds||input.ids||[]);
  if(!ids.length)throw new Error('job_ids_required');
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const jobs=[];
  for(const id of ids){
    const row=await db.prepare(`SELECT id,state,pages_completed,signatures_seen,transactions_ingested,last_error,updated_at FROM intelligence_index_jobs WHERE id=? LIMIT 1`).bind(id).first();
    if(!row)continue;
    jobs.push(Object.freeze({jobId:Number(row.id),state:text(row.state)||'unknown',pagesCompleted:Number(row.pages_completed)||0,signaturesSeen:Number(row.signatures_seen)||0,transactionsIngested:Number(row.transactions_ingested)||0,lastError:text(row.last_error)||null,updatedAt:Number(row.updated_at)||null}));
  }
  const complete=jobs.filter(job=>job.state==='complete').length,running=jobs.filter(job=>job.state==='running').length,queued=jobs.filter(job=>job.state==='queued').length;
  return Object.freeze({ok:true,schedulerEnabled:schedulerEnabled(env),requested:ids.length,found:jobs.length,complete,running,queued,jobs:Object.freeze(jobs),disclosure:'Job status reports bounded read-only index progress only. A complete job means that queued wallet-history work finished; it does not establish complete token-market coverage.'});
}

export async function handleIndexJobStatusRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/index-job-status')return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!playable(env))return json({ok:false,error:'feature_disabled'},404);
  let input;try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  try{return json(await readIndexJobStatus(env,input||{}));}
  catch(error){const code=text(error?.message||error),status=code==='intelligence_db_unavailable'?503:400;return json({ok:false,error:code},status);}
}
