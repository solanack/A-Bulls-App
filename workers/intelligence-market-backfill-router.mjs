import { intelligenceDb } from './intelligence-indexer.mjs';
import { buildMarketBackfillPlan } from './intelligence-market-backfill-plan.mjs';

const ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const text=value=>String(value==null?'':value).trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const enabled=env=>String(env?.PLAYABLE_DATA_ENABLED||'').toLowerCase()==='true';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

async function all(stmt){try{return(await stmt.all())?.results||[];}catch{return[];}}

export async function buildMarketBackfillPlanFromStore(env={},input={}){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const mint=text(input.mint||input.token);if(!ADDRESS_RE.test(mint))throw new TypeError('invalid_token_mint');
  const now=Math.floor(Date.now()/1000),requestTo=Math.max(0,Math.trunc(number(input.to||now))),requestFrom=Math.max(0,Math.trunc(number(input.from||(requestTo-86400))));
  if(requestTo<requestFrom)throw new RangeError('invalid_replay_window');
  if(requestTo-requestFrom>604800)throw new RangeError('market_replay_window_too_large');
  const rows=await all(db.prepare(`
    SELECT DISTINCT e.wallet,c.oldest_block_time,c.newest_block_time,c.complete_to_genesis,c.status
    FROM bull_wallet_events e
    LEFT JOIN intelligence_index_coverage c ON c.wallet=e.wallet
    WHERE e.mint=? AND e.block_time BETWEEN ? AND ? AND e.wallet IS NOT NULL AND e.wallet<>''
    ORDER BY e.wallet ASC LIMIT 500
  `).bind(mint,requestFrom,requestTo));
  const known=rows.filter(row=>row.oldest_block_time!==null&&row.oldest_block_time!==undefined);
  const unknownCoverageWallets=rows.length-known.length;
  const plan=buildMarketBackfillPlan(known,{requestFrom,requestTo,maxCandidates:100});
  return Object.freeze({schemaVersion:'market-backfill-plan-v1',generatedAt:Date.now(),subject:Object.freeze({kind:'token-market',mint}),window:Object.freeze({from:requestFrom,to:requestTo}),observedWalletRows:rows.length,unknownCoverageWallets,plan,disclosure:'This endpoint plans possible older-history backfill only. It does not fetch history, does not submit transactions, and does not treat inactivity as missing data.'});
}

export async function handleMarketBackfillPlanRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/intelligence/market-backfill-plan')return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);
  let input;try{input=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  try{return json({ok:true,result:await buildMarketBackfillPlanFromStore(env,input||{})});}
  catch(error){const code=String(error?.message||error),status=code==='intelligence_db_unavailable'?503:400;return json({ok:false,error:code},status);}
}


