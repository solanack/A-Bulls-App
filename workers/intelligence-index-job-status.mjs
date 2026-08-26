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

export function summarizeIndexJobs(jobs=[],nowSeconds=Math.floor(Date.now()/1000)){
  const complete=jobs.filter(job=>job.state==='complete').length;
  const running=jobs.filter(job=>job.state==='running').length;
  const queued=jobs.filter(job=>job.state==='queued').length;
  const retrying=jobs.filter(job=>job.state==='queued'&&job.lastError&&Number(job.nextAttemptAt)>Number(nowSeconds)).length;
  const nextRetryAt=jobs.reduce((earliest,job)=>job.state==='queued'&&job.lastError&&Number(job.nextAttemptAt)>Number(nowSeconds)?Math.min(earliest||Infinity,Number(job.nextAttemptAt)):earliest,0)||null;
  return Object.freeze({complete,running,queued,retrying,nextRetryAt});
}

export async function readIndexJobStatus(env={},input={}){
  const ids=normalizeIndexJobIds(input.jobIds||input.ids||[]);
  if(!ids.length)throw new Error('job_ids_required');
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const jobs=[];
  for(const id of ids){
    const row=await db.prepare(`SELECT id,state,pages_completed,signatures_seen,transactions_ingested,last_error,next_attempt_at,updated_at FROM intelligence_index_jobs WHERE id=? LIMIT 1`).bind(id).first();
    if(!row)continue;
    jobs.push(Object.freeze({jobId:Number(row.id),state:text(row.state)||'unknown',pagesCompleted:Number(row.pages_completed)||0,signaturesSeen:Number(row.signatures_seen)||0,transactionsIngested:Number(row.transactions_ingested)||0,lastError:text(row.last_error)||null,nextAttemptAt:Number(row.next_attempt_at)||null,updatedAt:Number(row.updated_at)||null}));
  }
  const summary=summarizeIndexJobs(jobs);
  return Object.freeze({ok:true,schedulerEnabled:schedulerEnabled(env),requested:ids.length,found:jobs.length,...summary,jobs:Object.freeze(jobs),disclosure:'Job status reports bounded read-only index progress only. A retry means a bounded history pass failed and was scheduled to try again; it does not imply missing market activity. A complete job means that queued wallet-history work finished, not that token-market coverage is complete.'});
}

export async function handleIndexJobStatusRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/index-job-status')return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!playable(env))return json({ok:false,error:'feature_disabled'},404);
  let input;try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  try{return json(await readIndexJobStatus(env,input||{}));}
  catch(error){const code=text(error?.message||error),status=code==='intelligence_db_unavailable'?503:400;return json({ok:false,error:code},status);}
}
