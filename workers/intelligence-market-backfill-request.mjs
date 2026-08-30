import { buildMarketBackfillPlanFromStore } from './intelligence-market-backfill-router.mjs';
import { marketBackfillQueueEnabled, queueMarketBackfillCandidates } from './intelligence-mesh-scheduler.mjs';

const text=value=>String(value==null?'':value).trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const playable=env=>text(env?.PLAYABLE_DATA_ENABLED).toLowerCase()==='true';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

export async function requestMarketBackfill(env={},input={}){
  const planResult=await buildMarketBackfillPlanFromStore(env,input);
  if(!marketBackfillQueueEnabled(env))return Object.freeze({ok:false,enabled:false,error:'backfill_queue_disabled',planResult,queue:null});
  const limit=Math.max(1,Math.min(3,Math.trunc(number(input.limit)||2)));
  const queue=await queueMarketBackfillCandidates(env,planResult.plan,{limit,pageSize:25});
  return Object.freeze({ok:true,enabled:true,planResult,queue,disclosure:'This request queues bounded read-only public-wallet history jobs only for candidates recomputed by the server from the Intelligence Store. The browser cannot submit arbitrary wallet candidates, no transaction is signed or sent, and queued work does not prove that missing intervals contain transactions.'});
}

export async function handleMarketBackfillRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/market-backfill-request')return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!playable(env))return json({ok:false,error:'feature_disabled'},404);
  let input;try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  try{
    const result=await requestMarketBackfill(env,input||{});
    return result.enabled?json(result):json(result,409);
  }catch(error){
    const code=text(error?.message||error),status=code==='intelligence_db_unavailable'?503:400;
    return json({ok:false,error:code},status);
  }
}

